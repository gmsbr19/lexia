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
import { contextoLinha } from "@/lib/lexia/agent/prompt"
import { documentoContextoLexia } from "@/lib/documents/ai-suggest"
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios"
import { decidirModelo } from "@/lib/lexia/agent/router"
import { aplicarTeto, MODO_ECONOMICO_AVISO } from "@/lib/consumo/guard"
import { runAgentTurn } from "@/lib/lexia/agent/loop"
import { sseResponse } from "@/lib/lexia/agent/sse"
import { validarAnexos } from "@/lib/lexia/anexos/validacao"
import type { AgentCtx } from "@/lib/lexia/agent/types"

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
  return sseResponse(async (emit) => {
    try {
      const conversaId = await ensureConversa(sessionUser.email, body.conversaId ?? null, tituloSeed)
      const { messages: prior, lastModel } = await carregarHistorico(conversaId)
      const userMsg = await persistUserMsg(conversaId, mensagemRaw, body.anexos)
      emit({ type: "start", conversaId, userMsgId: userMsg.id })

      // When the user is in the document editor, the open contract rides with the
      // turn so the agent can read it and propose edits (editar_documento_aberto).
      const docBlock =
        body.documento && body.documento.template.startsWith("contrato")
          ? `\n\n<documento_aberto>\n${documentoContextoLexia(body.documento.data as ContratoHonorariosData)}\n</documento_aberto>`
          : ""
      const texto = `${contextoLinha(sessionUser, body.pagina)}${docBlock}\n\n${instrucao}`
      const messages: Anthropic.MessageParam[] = [
        ...prior,
        { role: "user", content: construirConteudo(texto, body.anexos) },
      ]
      const teto = await aplicarTeto(decidirModelo(mensagemRaw, lastModel, { temAnexos }))
      const decision = teto.decision
      const ctx: AgentCtx = { user: sessionUser, conversaId, page: body.pagina, signal: req.signal }

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
  })
}
