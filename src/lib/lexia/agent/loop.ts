// The manual streaming agent loop. Drives the Anthropic Messages API, streams
// text deltas, runs readonly/client tools inline, and pauses on the first
// mutation tool to ask the user to confirm. SERVER ONLY.
import type Anthropic from "@anthropic-ai/sdk"
import { assertRole, FORBIDDEN_MESSAGE } from "@/lib/auth/session"
import { registrarUso } from "@/lib/consumo/registrar"
import { UserError } from "@/lib/errors"
import { writeAudit } from "@/lib/finance/api"
import { log } from "@/lib/log"
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit"
import { deveAutoExecutar } from "./auto"
import { comCacheBreakpoints, compactarHistorico } from "./cache"
import { cardParaTool } from "./cards"
import { getAnthropic } from "./client"
import { dedupFontes, fontesParaTool } from "./fontes"
import { extrairFollowups, FollowupsFilter } from "./followups"
import { criarAcaoPendente } from "./pending"
import { systemPrompt } from "./prompt"
import { getTool, toApiTools } from "./registry"
import { rotuloTool } from "./rotulos"
import type { RouteDecision } from "./router"
import type { AgentCtx, Emit, UiBlock } from "./types"
import type { Fonte, MsgMeta, PensamentoMeta } from "../types"
import type { DocOp } from "@/lib/documents/model/ops"
import type { CampoDetectado } from "@/lib/documents/model/campos"

const MAX_ITER = 8
// Em modo automático (mutações executam inline, sem cartão) uma tarefa de CRUD em
// massa pode encadear várias criações num turno só — um orçamento maior evita o
// ping-pong de "Continue" (cada reinício re-disparava a verificação do estado).
// As tools de LOTE já reduzem drasticamente o nº de iterações necessárias.
const MAX_ITER_AUTO = 20
// Cap defensivo no texto do raciocínio persistido (ThoughtDisclosure) — evita
// um blob de meta gigante quando o "adaptive thinking" pensa bastante.
const PENSAMENTO_MAX = 4000

export interface TurnResult {
  blocks: UiBlock[]
  text: string
  usage: { input: number; output: number }
  /** Set when the turn ended by proposing an action awaiting confirmation. */
  pendente?: number
  /** Metadados extras do turno (Fase 6): raciocínio, fontes, follow-ups, +
   *  as flags de controle de geração da Fase 4 (interrompida/truncada). */
  meta?: MsgMeta
}

type ToolResult = Anthropic.ToolResultBlockParam

/**
 * Run one agent turn to completion (or to a confirmation pause). `messages` is
 * mutated as the loop appends assistant/tool turns; pass the full conversation
 * so far (history + the new user message, or a resumed snapshot).
 */
export async function runAgentTurn(
  ctx: AgentCtx,
  messages: Anthropic.MessageParam[],
  decision: RouteDecision,
  emit: Emit,
): Promise<TurnResult> {
  const anthropic = getAnthropic()
  // "pergunta" mode drops the mutation tools entirely (read-only assistant).
  // docMode (chat embutido no editor) foca o surface em leitura + edição de doc.
  const tools = decision.useTools ? toApiTools(ctx.user.role, ctx.mode, !!ctx.doc, ctx.processosHabilitado ?? true) : undefined
  const system = systemPrompt()

  const blocks: UiBlock[] = []
  let text = ""
  let usageIn = 0
  let usageOut = 0
  // Fase 6: proveniência acumulada no turno inteiro (várias iterações podem
  // chamar tools citáveis) + o sentinela de follow-ups (só a iteração final,
  // sem tool_use, pode carregá-lo — mas o filtro ao vivo roda em toda iteração).
  const followFilter = new FollowupsFilter()
  let fontes: Fonte[] = []
  let pensamentoTexto = ""
  let pensamentoInicio: number | null = null
  let pensamentoFim = 0
  let usouDocTool = false

  const maxIter = ctx.autoMode ? MAX_ITER_AUTO : MAX_ITER
  for (let iter = 0; iter < maxIter; iter++) {
    // Só o texto DESTA iteração (zerado a cada volta, JÁ filtrado do sentinela
    // de sugestões) — no aborto, vira o bloco de texto parcial; `text` (fora do
    // loop) segue acumulando o turno inteiro (bruto, p/ extrairFollowups no fim).
    let iterTextSafe = ""
    const stream = anthropic.messages.stream(
      {
        model: decision.model,
        max_tokens: decision.maxTokens,
        system,
        // Explicit cache breakpoints on the recent history (see comCacheBreakpoints)
        // so the growing conversation prefix is reused across loop iterations and
        // turns. The system block (1h TTL) already caches the big stable prefix.
        // Compacta os dumps de leitura antigos ANTES de marcar os breakpoints —
        // corta o reenvio O(n²) de estado (o maior dreno em CRUD em massa) sem
        // mutar o array real (o snapshot de pending fica fiel).
        messages: comCacheBreakpoints(compactarHistorico(messages)),
        ...(tools ? { tools } : {}),
        ...(decision.effort ? { output_config: { effort: decision.effort } } : {}),
        ...(decision.model === "claude-haiku-4-5" ? {} : { thinking: { type: "adaptive" as const } }),
      },
      { signal: ctx.signal },
    )

    stream.on("text", (delta) => {
      text += delta
      // Segura ao vivo qualquer fragmento que possa ser o início de "<sugestoes>"
      // (o modelo só a usa no fim de uma resposta útil — nunca deve piscar na tela).
      const safe = followFilter.feed(delta)
      iterTextSafe += safe
      if (safe) emit({ type: "text", delta: safe })
    })
    stream.on("thinking", (delta, snapshot) => {
      if (pensamentoInicio == null) pensamentoInicio = Date.now()
      pensamentoTexto = snapshot
      pensamentoFim = Date.now()
      emit({ type: "thinking", delta })
    })

    let msg: Anthropic.Message
    try {
      msg = await stream.finalMessage()
    } catch (e) {
      if (ctx.signal.aborted) {
        // Botão Parar ou desconexão do cliente — preserva o texto já escrito
        // NESTA iteração como um bloco de verdade (senão some ao recarregar);
        // sem "notice": o cliente mostra "Geração interrompida por você." a
        // partir de `interrompida`, não como um aviso de erro.
        if (iterTextSafe.trim()) blocks.push({ type: "text", text: iterTextSafe })
        return { blocks, text, usage: { input: usageIn, output: usageOut }, meta: { interrompida: true } }
      }
      throw e
    }
    usageIn +=
      msg.usage.input_tokens +
      (msg.usage.cache_read_input_tokens ?? 0) +
      (msg.usage.cache_creation_input_tokens ?? 0)
    usageOut += msg.usage.output_tokens
    // Ledger: record this call's raw token split (fire-and-forget, never throws).
    void registrarUso({ userEmail: ctx.user.email, recurso: "chat", modelo: decision.model, usage: msg.usage })

    const iterText = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")

    if (msg.stop_reason === "max_tokens") {
      // Cortada pelo limite de tamanho — o cliente oferece "Continuar" (Fase 4).
      // NÃO conta como tool_use: a mensagem do assistente ainda é anexada ao
      // histórico (é o que realmente foi dito) e o turno termina aqui.
      if (iterText.trim()) blocks.push({ type: "text", text: iterText })
      messages.push({ role: "assistant", content: msg.content })
      emit({ type: "cut" })
      return { blocks, text, usage: { input: usageIn, output: usageOut }, meta: { truncada: true } }
    }

    if (msg.stop_reason !== "tool_use") {
      // Resposta final (sem pausa, sem mais tools): separa o sentinela de
      // follow-ups do texto AUTORITATIVO (msg.content, não os deltas) antes de
      // persistir/mostrar — extrairFollowups é puro e nunca falha (regex simples).
      const { texto: iterTextLimpo, itens: followItens } = extrairFollowups(iterText)
      if (iterTextLimpo.trim()) blocks.push({ type: "text", text: iterTextLimpo })
      text = text.slice(0, text.length - iterText.length) + iterTextLimpo
      if (followItens.length) emit({ type: "followups", itens: followItens })
      messages.push({ role: "assistant", content: msg.content })
      // "Doc aberto" também é fonte (D9) quando o turno mexeu no documento do editor.
      if (usouDocTool && ctx.doc?.id != null) {
        fontes = fontes.concat([{ tipo: "documento", titulo: "Documento aberto", rota: `/documents/doc/${ctx.doc.id}` }])
      }
      const meta = montarMeta({ fontes, pensamentoTexto, pensamentoInicio, pensamentoFim, followItens })
      return { blocks, text, usage: { input: usageIn, output: usageOut }, meta }
    }

    // Texto ANTES de chamar a tool (ex.: "Deixa eu verificar…") — o sentinela de
    // sugestões nunca aparece aqui (só no fim de uma resposta que não chama mais
    // nada), então usa o texto autoritativo puro, sem extrairFollowups.
    if (iterText.trim()) blocks.push({ type: "text", text: iterText })

    // The assistant turn (with its tool_use blocks) must be appended verbatim.
    messages.push({ role: "assistant", content: msg.content })
    const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")

    const resolved: ToolResult[] = []
    let proposal:
      | { tu: Anthropic.ToolUseBlock; input: unknown; resumo: string; detalhes?: { label: string; valor: string }[] }
      | null = null
    // Pausa por pergunta (Fase 6, D3) — mesma exclusividade "uma coisa por vez"
    // que uma proposta de mutação; as duas competem pelo ÚNICO pause do turno.
    let pergunta: { tu: Anthropic.ToolUseBlock; input: { pergunta: string; opcoes: string[]; multipla?: boolean; permitirOutro?: boolean } } | null = null

    for (const tu of toolUses) {
      const tool = getTool(tu.name)
      const label = rotuloTool(tu.name)

      if (!tool) {
        resolved.push({ type: "tool_result", tool_use_id: tu.id, content: "Ferramenta desconhecida", is_error: true })
        continue
      }
      if ((proposal || pergunta) && (tool.kind === "mutation" || tool.kind === "pergunta")) {
        resolved.push({ type: "tool_result", tool_use_id: tu.id, content: "Proponha ou pergunte uma coisa por vez.", is_error: true })
        continue
      }

      const parsed = tool.schema.safeParse(tu.input)
      if (!parsed.success) {
        // Surface the specific validation issues so the model can self-correct
        // (e.g. ask the user for a missing prazo/responsável before retrying).
        const issues = parsed.error.issues.map((iss) => `${iss.path.join(".") || "campo"}: ${iss.message}`).join("; ")
        resolved.push({ type: "tool_result", tool_use_id: tu.id, content: `Dados inválidos — ${issues}`, is_error: true })
        emitTool(emit, blocks, tu.id, tu.name, label, "erro")
        continue
      }
      const input = parsed.data

      if (tool.roles) {
        try {
          assertRole(ctx.user, tool.roles)
        } catch {
          resolved.push({ type: "tool_result", tool_use_id: tu.id, content: FORBIDDEN_MESSAGE, is_error: true })
          emitTool(emit, blocks, tu.id, tu.name, label, "erro")
          continue
        }
      }

      if (tool.kind === "mutation") {
        // MODO AUTOMÁTICO: executa a mutação na hora, sem cartão de confirmação,
        // reusando as mesmas garantias do caminho confirmado (role já checado
        // acima; rate-limit + auditoria aqui). VÁRIAS mutações não-destrutivas na
        // MESMA mensagem executam em sequência — deixa a IA criar um projeto com
        // várias seções/tarefas de uma vez (o modelo já emite as chamadas em
        // paralelo depois que o container existe), sem gastar iterações à toa. As
        // EXCEÇÕES que SEMPRE pedem confirmação mesmo com auto ligado caem no
        // caminho de proposta abaixo: o modo "plano" (que prometeu aprovação) e as
        // ações DESTRUTIVAS/irreversíveis (excluir/anonimizar) — segurança humana
        // antes de um write sem volta (a proposta segue exclusiva, uma por turno).
        if (deveAutoExecutar(ctx.autoMode, ctx.mode, tu.name)) {
          emit({ type: "tool", id: tu.id, name: tu.name, label, status: "run" })
          try {
            assertRateLimit(ctx.user.email, `lexia.${tu.name}`)
            const out = await tool.run!(ctx, input)
            await writeAudit(ctx.user.email, { action: `lexia.${tu.name}`, entity: tool.name, payload: input }, out)
            resolved.push({ type: "tool_result", tool_use_id: tu.id, content: truncate(JSON.stringify(out ?? null)) })
            emitTool(emit, blocks, tu.id, tu.name, label, "ok")
          } catch (e) {
            const m = e instanceof UserError || e instanceof RateLimitError ? e.message : "Falha ao executar a ferramenta"
            if (!(e instanceof UserError) && !(e instanceof RateLimitError)) {
              log.error({ tool: tu.name, err: e instanceof Error ? e.message : String(e) }, "lexia auto-mutation failed")
            }
            resolved.push({ type: "tool_result", tool_use_id: tu.id, content: m, is_error: true })
            emitTool(emit, blocks, tu.id, tu.name, label, "erro")
          }
          continue
        }
        let resumo = tool.resumo ? tool.resumo(input) : `Confirmar: ${label}`
        let detalhes: { label: string; valor: string }[] | undefined
        if (tool.montarConfirmacao) {
          // Cartão legível (nomes resolvidos, datas/$ pt-BR). Falha aqui não
          // bloqueia a proposta — cai no resumo síncrono.
          try {
            const c = await tool.montarConfirmacao(ctx, input)
            resumo = c.resumo
            detalhes = c.detalhes
          } catch (e) {
            log.error({ tool: tu.name, err: e instanceof Error ? e.message : String(e) }, "montarConfirmacao falhou")
          }
        }
        proposal = { tu, input, resumo, detalhes }
        continue // result deferred to confirmation
      }

      if (tool.kind === "pergunta") {
        // Sem `run` — nada executa aqui; a resposta do usuário vira o tool_result
        // no resume (rota /api/lexia/acoes/[id], decisao:"responder").
        pergunta = { tu, input: input as { pergunta: string; opcoes: string[]; multipla?: boolean; permitirOutro?: boolean } }
        continue
      }

      // readonly | client — execute now
      emit({ type: "tool", id: tu.id, name: tu.name, label, status: "run" })
      try {
        const out = await tool.run!(ctx, input)
        if (tool.kind === "client" && tool.clientEvent === "doc-patch") {
          // Edições propostas ao documento aberto — aplicadas no editor VIVO pelo
          // cliente (reversível por desfazer); nunca tocam o banco.
          const payload = (out ?? {}) as { ops?: DocOp[]; campos?: CampoDetectado[] }
          const ops = payload.ops ?? []
          const campos = payload.campos
          const n = ops.length + (campos?.length ?? 0)
          emit({ type: "doc-patch", ops, campos })
          blocks.push({ type: "doc-patch", ops, campos })
          resolved.push({ type: "tool_result", tool_use_id: tu.id, content: `ok — propus ${n} alteração(ões) ao documento aberto` })
          emit({ type: "tool", id: tu.id, name: tu.name, label, status: "ok" })
          usouDocTool = true
        } else if (tool.kind === "client") {
          const rota = String(out)
          emit({ type: "navigate", rota })
          blocks.push({ type: "navigate", rota })
          resolved.push({ type: "tool_result", tool_use_id: tu.id, content: `ok — naveguei para ${rota}` })
          emit({ type: "tool", id: tu.id, name: tu.name, label, status: "ok" })
        } else {
          resolved.push({ type: "tool_result", tool_use_id: tu.id, content: truncate(JSON.stringify(out ?? null)) })
          emitTool(emit, blocks, tu.id, tu.name, label, "ok")
          // Card automático a partir do MESMO resultado que o modelo já viu —
          // 0 tokens extra. Uma falha aqui nunca derruba o turno (Fase 3, D1).
          try {
            const card = cardParaTool(tu.name, input, out)
            if (card) {
              emit({ type: "card", card })
              blocks.push({ type: "card", card })
            }
          } catch (e) {
            log.error({ tool: tu.name, err: e instanceof Error ? e.message : String(e) }, "cardParaTool falhou")
          }
          // Fontes citáveis (Fase 6, D9) — mesma garantia: uma falha aqui nunca
          // derruba o turno (acumuladas por rota; dedup no fim do turno).
          try {
            const novasFontes = fontesParaTool(tu.name, out)
            if (novasFontes.length) fontes = fontes.concat(novasFontes)
          } catch (e) {
            log.error({ tool: tu.name, err: e instanceof Error ? e.message : String(e) }, "fontesParaTool falhou")
          }
        }
      } catch (e) {
        const m = e instanceof UserError ? e.message : "Falha ao executar a ferramenta"
        if (!(e instanceof UserError)) {
          log.error({ tool: tu.name, err: e instanceof Error ? e.message : String(e) }, "lexia tool failed")
        }
        resolved.push({ type: "tool_result", tool_use_id: tu.id, content: m, is_error: true })
        emitTool(emit, blocks, tu.id, tu.name, label, "erro")
      }
    }

    if (pergunta) {
      // Mesmo mecanismo de pausa da proposta de mutação (snapshot dos messages +
      // resolved), mas kind="pergunta": o resume não executa nada — a resposta
      // do usuário vira o tool_result (rota /api/lexia/acoes/[id]).
      const contexto: Anthropic.MessageParam[] = [...messages, { role: "user", content: resolved }]
      const acaoId = await criarAcaoPendente({
        conversaId: ctx.conversaId,
        userEmail: ctx.user.email,
        toolName: pergunta.tu.name,
        toolUseId: pergunta.tu.id,
        payload: pergunta.input,
        resumo: pergunta.input.pergunta,
        contexto,
        kind: "pergunta",
      })
      emit({
        type: "choice",
        acaoId,
        pergunta: pergunta.input.pergunta,
        opcoes: pergunta.input.opcoes,
        multipla: pergunta.input.multipla,
        permitirOutro: pergunta.input.permitirOutro,
      })
      blocks.push({
        type: "choice",
        acaoId,
        pergunta: pergunta.input.pergunta,
        opcoes: pergunta.input.opcoes,
        multipla: pergunta.input.multipla,
        permitirOutro: pergunta.input.permitirOutro,
        status: "pendente",
      })
      return { blocks, text, usage: { input: usageIn, output: usageOut }, pendente: acaoId }
    }

    if (proposal) {
      // Snapshot includes the assistant turn and the resolved (non-mutation)
      // results; the confirm endpoint appends the mutation's result on resume.
      const contexto: Anthropic.MessageParam[] = [...messages, { role: "user", content: resolved }]
      const acaoId = await criarAcaoPendente({
        conversaId: ctx.conversaId,
        userEmail: ctx.user.email,
        toolName: proposal.tu.name,
        toolUseId: proposal.tu.id,
        payload: proposal.input,
        resumo: proposal.resumo,
        contexto,
      })
      emit({
        type: "confirm",
        acaoId,
        toolName: proposal.tu.name,
        resumo: proposal.resumo,
        payload: proposal.input,
        detalhes: proposal.detalhes,
      })
      blocks.push({
        type: "confirm",
        acaoId,
        toolName: proposal.tu.name,
        resumo: proposal.resumo,
        payload: proposal.input,
        detalhes: proposal.detalhes,
        status: "pendente",
      })
      return { blocks, text, usage: { input: usageIn, output: usageOut }, pendente: acaoId }
    }

    // No proposal: feed the tool results back and iterate.
    messages.push({ role: "user", content: resolved })
  }

  // Iteration budget exhausted.
  const aviso = "Não consegui concluir em tempo hábil — pode reformular ou dividir o pedido?"
  blocks.push({ type: "notice", text: aviso })
  emit({ type: "text", delta: "" })
  return { blocks, text, usage: { input: usageIn, output: usageOut } }
}

function emitTool(emit: Emit, blocks: UiBlock[], id: string, name: string, label: string, status: "ok" | "erro") {
  emit({ type: "tool", id, name, label, status })
  blocks.push({ type: "tool", name, label, status })
}

/** Monta o MsgMeta da resposta final de um turno (Fase 6) — fontes deduplicadas
 * por rota, raciocínio (cap defensivo) com duração wall-clock, follow-ups. Undefined
 * quando não há nada extra a persistir (evita meta:"{}" ruidoso em todo turno simples). */
function montarMeta(args: {
  fontes: Fonte[]
  pensamentoTexto: string
  pensamentoInicio: number | null
  pensamentoFim: number
  followItens: string[]
}): MsgMeta | undefined {
  const fontesDedup = dedupFontes(args.fontes)
  let thinking: PensamentoMeta | undefined
  if (args.pensamentoInicio != null && args.pensamentoTexto.trim()) {
    const resumo = args.pensamentoTexto.length > PENSAMENTO_MAX ? `${args.pensamentoTexto.slice(0, PENSAMENTO_MAX)}…` : args.pensamentoTexto
    thinking = { resumo, duracaoMs: Math.max(0, args.pensamentoFim - args.pensamentoInicio) }
  }
  const meta: MsgMeta = {
    ...(thinking ? { thinking } : {}),
    ...(fontesDedup.length ? { fontes: fontesDedup } : {}),
    ...(args.followItens.length ? { followups: args.followItens } : {}),
  }
  return Object.keys(meta).length ? meta : undefined
}

/** Keep tool results from flooding the context window. */
function truncate(s: string, max = 8000): string {
  return s.length > max ? `${s.slice(0, max)}…(resultado truncado)` : s
}

