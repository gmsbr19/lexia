// The manual streaming agent loop. Drives the Anthropic Messages API, streams
// text deltas, runs readonly/client tools inline, and pauses on the first
// mutation tool to ask the user to confirm. SERVER ONLY.
import type Anthropic from "@anthropic-ai/sdk"
import { assertRole, FORBIDDEN_MESSAGE } from "@/lib/auth/session"
import { registrarUso } from "@/lib/consumo/registrar"
import { UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { comCacheBreakpoints } from "./cache"
import { getAnthropic } from "./client"
import { criarAcaoPendente } from "./pending"
import { systemPrompt } from "./prompt"
import { getTool, toApiTools } from "./registry"
import { rotuloTool } from "./rotulos"
import type { RouteDecision } from "./router"
import type { AgentCtx, Emit, UiBlock } from "./types"

const MAX_ITER = 8

export interface TurnResult {
  blocks: UiBlock[]
  text: string
  usage: { input: number; output: number }
  /** Set when the turn ended by proposing an action awaiting confirmation. */
  pendente?: number
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
  const tools = decision.useTools ? toApiTools(ctx.user.role) : undefined
  const system = systemPrompt()

  const blocks: UiBlock[] = []
  let text = ""
  let usageIn = 0
  let usageOut = 0

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const stream = anthropic.messages.stream(
      {
        model: decision.model,
        max_tokens: decision.maxTokens,
        system,
        // Explicit cache breakpoints on the recent history (see comCacheBreakpoints)
        // so the growing conversation prefix is reused across loop iterations and
        // turns. The system block (1h TTL) already caches the big stable prefix.
        messages: comCacheBreakpoints(messages),
        ...(tools ? { tools } : {}),
        ...(decision.effort ? { output_config: { effort: decision.effort } } : {}),
        ...(decision.model === "claude-haiku-4-5" ? {} : { thinking: { type: "adaptive" as const } }),
      },
      { signal: ctx.signal },
    )

    stream.on("text", (delta) => {
      text += delta
      emit({ type: "text", delta })
    })

    let msg: Anthropic.Message
    try {
      msg = await stream.finalMessage()
    } catch (e) {
      if (ctx.signal.aborted) {
        blocks.push({ type: "notice", text: "Resposta interrompida." })
        return { blocks, text, usage: { input: usageIn, output: usageOut } }
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
    if (iterText.trim()) blocks.push({ type: "text", text: iterText })

    if (msg.stop_reason !== "tool_use") {
      messages.push({ role: "assistant", content: msg.content })
      return { blocks, text, usage: { input: usageIn, output: usageOut } }
    }

    // The assistant turn (with its tool_use blocks) must be appended verbatim.
    messages.push({ role: "assistant", content: msg.content })
    const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")

    const resolved: ToolResult[] = []
    let proposal:
      | { tu: Anthropic.ToolUseBlock; input: unknown; resumo: string; detalhes?: { label: string; valor: string }[] }
      | null = null

    for (const tu of toolUses) {
      const tool = getTool(tu.name)
      const label = rotuloTool(tu.name)

      if (!tool) {
        resolved.push({ type: "tool_result", tool_use_id: tu.id, content: "Ferramenta desconhecida", is_error: true })
        continue
      }
      if (proposal && tool.kind === "mutation") {
        resolved.push({ type: "tool_result", tool_use_id: tu.id, content: "Proponha uma ação por vez.", is_error: true })
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

      // readonly | client — execute now
      emit({ type: "tool", id: tu.id, name: tu.name, label, status: "run" })
      try {
        const out = await tool.run!(ctx, input)
        if (tool.kind === "client" && tool.clientEvent === "doc-patch") {
          // Propose edits to the OPEN document: emit the suggestions so the editor
          // renders "Aceitar" cards over the live preview (no DB round-trip).
          const sugestoes = (out as { sugestoes?: { field: string; label: string; value: string }[] }).sugestoes ?? []
          emit({ type: "doc-patch", sugestoes })
          blocks.push({ type: "doc-patch", sugestoes })
          resolved.push({ type: "tool_result", tool_use_id: tu.id, content: `ok — propus ${sugestoes.length} alteração(ões) ao documento aberto` })
          emit({ type: "tool", id: tu.id, name: tu.name, label, status: "ok" })
        } else if (tool.kind === "client") {
          const rota = String(out)
          emit({ type: "navigate", rota })
          blocks.push({ type: "navigate", rota })
          resolved.push({ type: "tool_result", tool_use_id: tu.id, content: `ok — naveguei para ${rota}` })
          emit({ type: "tool", id: tu.id, name: tu.name, label, status: "ok" })
        } else {
          resolved.push({ type: "tool_result", tool_use_id: tu.id, content: truncate(JSON.stringify(out ?? null)) })
          emitTool(emit, blocks, tu.id, tu.name, label, "ok")
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

/** Keep tool results from flooding the context window. */
function truncate(s: string, max = 8000): string {
  return s.length > max ? `${s.slice(0, max)}…(resultado truncado)` : s
}
