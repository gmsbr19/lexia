// POST /api/lexia/chat — one agent turn, streamed as SSE. Body { conversaId?,
// mensagem, pagina? }. Drives the LexIA agent loop: text deltas, tool activity,
// navigation, and confirmation cards. Not audited (private content); confirmed
// mutations are audited downstream as 'lexia.*'. Own rate bucket (10/min).
import type Anthropic from "@anthropic-ai/sdk"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import { UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"
import { readJson } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { lexiaChatSchema } from "@/lib/lexia/schemas"
import { carregarHistorico, ensureConversa, persistAssistantMsg, persistUserMsg } from "@/lib/lexia/mutations"
import { mensagemErro } from "@/lib/lexia/agent/client"
import { construirConteudo } from "@/lib/lexia/agent/anexos"
import { contextoDocumento, contextoLinha } from "@/lib/lexia/agent/prompt"
import { getLexiaPrefsRaw } from "@/lib/lexia/preferencias"
import { getModulosConfig, processosHabilitado } from "@/lib/settings"
import { decidirModelo } from "@/lib/lexia/agent/router"
import { aplicarTeto, MODO_ECONOMICO_AVISO } from "@/lib/consumo/guard"
import { runAgentTurn } from "@/lib/lexia/agent/loop"
import { sseResponse } from "@/lib/lexia/agent/sse"
import { MIME_DOCX, validarAnexos } from "@/lib/lexia/anexos/validacao"
import { importarDocxComoDocumento } from "@/lib/documents/importar"
import type { AgentCtx, UiBlock } from "@/lib/lexia/agent/types"
import { withRequestOrigin, resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
  if (!rateLimit(`${user.email}:lexia-agent`, 10, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  let body
  try {
    body = parseBody(lexiaChatSchema, await readJson(req))
    if (body.anexos?.length) {
      const erro = validarAnexos(body.anexos)
      if (erro) throw new UserError(erro)
    }
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }

  const sessionUser = user
  const temAnexos = !!body.anexos?.length
  // Mensagem do usuário pode vir vazia quando há só anexo — texto efetivo para o
  // título/contexto e prompt; a mensagem persistida fica como o usuário enviou.
  const mensagemRaw = body.mensagem.trim()
  const tituloSeed = mensagemRaw || "Documento anexado"
  const instrucao = mensagemRaw || "Leia o(s) documento(s) anexado(s) e me ajude com base nele(s)."
  return withRequestOrigin(resolveRequestOrigin(req), () => sseResponse(async (emit) => {
    try {
      const conversaId = await ensureConversa(sessionUser.email, body.conversaId ?? null, tituloSeed)
      const { messages: prior, lastModel } = await carregarHistorico(conversaId)
      const userMsg = await persistUserMsg(conversaId, mensagemRaw, body.anexos)
      emit({ type: "start", conversaId, userMsgId: userMsg.id })

      // A .docx attachment is NOT readable by the model: intercept it, import it
      // server-side (mammoth → LexDoc → draft Documento) and open the editor
      // directly. No model call this turn (deterministic, zero tokens).
      const docx = body.anexos?.find((a) => a.mimeType === MIME_DOCX)
      // …mas DENTRO do editor (body.documento) NÃO importamos outro doc (criaria um
      // novo e navegaria para fora do que o usuário está editando): só avisamos.
      if (docx && body.documento) {
        const txt =
          "Você já está editando um documento aqui. Para importar outro arquivo Word (.docx), feche este editor e anexe-o pela LexIA principal."
        emit({ type: "text", delta: txt })
        const blocks: UiBlock[] = [{ type: "text", text: txt }]
        const saved = await persistAssistantMsg(conversaId, { text: txt, blocks, model: "guard", inputTokens: 0, outputTokens: 0 })
        emit({ type: "done", mensagemId: saved.id, model: "guard", inputTokens: 0, outputTokens: 0 })
        return
      }
      if (docx) {
        const nomeDoc = docx.nome.replace(/\.[^.]+$/, "") || "Documento importado"
        let novoId: number
        try {
          ;({ id: novoId } = await importarDocxComoDocumento(Buffer.from(docx.dataBase64, "base64"), nomeDoc, sessionUser.email))
        } catch {
          throw new UserError("Não consegui ler esse .docx — confira se é um arquivo Word válido e não está corrompido.")
        }
        const rota = `/documents/doc/${novoId}`
        const txt = `Importei **${nomeDoc}** e abri no editor. Por lá você pode detectar os campos, editar com a LexIA e exportar em PDF/DOCX.`
        emit({ type: "text", delta: txt })
        emit({ type: "navigate", rota })
        const blocks: UiBlock[] = [
          { type: "text", text: txt },
          { type: "navigate", rota },
        ]
        const saved = await persistAssistantMsg(conversaId, { text: txt, blocks, model: "import", inputTokens: 0, outputTokens: 0 })
        emit({ type: "done", mensagemId: saved.id, model: "import", inputTokens: 0, outputTokens: 0 })
        return
      }

      // Preferências do usuário (persona/instruções no banco) + as seleções vivas
      // do composer (modelo/modo/auto), que prevalecem para efeito imediato.
      const prefs = await getLexiaPrefsRaw(sessionUser.email)
      const agentMode = body.agentMode ?? prefs.agentMode ?? "agente"
      const autoMode = body.autoMode ?? prefs.autoMode ?? false
      const modelo = body.modelo ?? prefs.modelo
      const processosOk = processosHabilitado(await getModulosConfig())

      // Contexto do documento aberto (só no editor flexível) — bloco VOLÁTIL fora do
      // CORE cacheado; injeta texto/campos/seleção + as instruções de edição.
      const contextoDoc = body.documento ? contextoDocumento(body.documento) : ""
      const texto = `${contextoLinha(sessionUser, body.pagina, { ...prefs, agentMode }, processosOk)}${contextoDoc}\n\n${instrucao}`
      const messages: Anthropic.MessageParam[] = [
        ...prior,
        { role: "user", content: construirConteudo(texto, body.anexos) },
      ]
      const teto = await aplicarTeto(decidirModelo(mensagemRaw, lastModel, { temAnexos, forcarOpus: body.opus, modelo }))
      const decision = teto.decision
      const ctx: AgentCtx = {
        user: sessionUser,
        conversaId,
        page: body.pagina,
        signal: req.signal,
        mode: agentMode,
        autoMode,
        processosHabilitado: processosOk,
        doc: body.documento
          ? {
              id: body.documento.id ?? null,
              texto: body.documento.texto,
              campos: body.documento.campos,
              valores: body.documento.valores,
              selecao: body.documento.selecao,
            }
          : undefined,
      }

      const result = await runAgentTurn(ctx, messages, decision, emit)
      if (teto.rebaixado) result.blocks.unshift({ type: "notice", text: MODO_ECONOMICO_AVISO })
      const saved = await persistAssistantMsg(conversaId, {
        text: result.text,
        blocks: result.blocks,
        model: decision.model,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
      })
      log.info(
        { conversaId, model: decision.model, in: result.usage.input, out: result.usage.output },
        "lexia turn",
      )
      emit({
        type: "done",
        mensagemId: saved.id,
        model: decision.model,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        pendente: result.pendente,
      })
    } catch (e) {
      if (!(e instanceof UserError)) {
        log.error({ err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }, "lexia chat failed")
      }
      emit({ type: "error", mensagem: mensagemErro(e) })
    }
  }))
}
