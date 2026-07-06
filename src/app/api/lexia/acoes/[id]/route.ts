// POST /api/lexia/acoes/[id] — resolve a proposed action { decisao:
// 'confirmar'|'recusar' } and resume the agent turn (same SSE protocol as
// /chat). On confirm, the wrapped mutation runs (audited 'lexia.*') and its
// result is fed back so the model narrates the outcome. Own rate bucket (20/min).
import type Anthropic from "@anthropic-ai/sdk"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import { UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { acaoDecisaoSchema } from "@/lib/lexia/schemas"
import { marcarCartao, marcarEscolha, persistAssistantMsg, ultimoModelo } from "@/lib/lexia/mutations"
import { mensagemErro } from "@/lib/lexia/agent/client"
import { linkParaResultado, type ResultadoLink } from "@/lib/lexia/agent/links"
import { carregarAcao, executarAcao, reservarAcao } from "@/lib/lexia/agent/pending"
import { decidirModelo } from "@/lib/lexia/agent/router"
import { aplicarTeto, MODO_ECONOMICO_AVISO } from "@/lib/consumo/guard"
import { runAgentTurn } from "@/lib/lexia/agent/loop"
import { sseResponse } from "@/lib/lexia/agent/sse"
import type { AgentCtx } from "@/lib/lexia/agent/types"
import { getModulosConfig, processosHabilitado } from "@/lib/settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
  if (!rateLimit(`${user.email}:lexia-acoes`, 20, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  const { id } = await ctx.params
  let acaoId: number
  let decisao: "confirmar" | "recusar" | "responder"
  let resposta: { selecionadas: string[]; outro?: string } | undefined
  try {
    acaoId = parseId(id)
    const body = parseBody(acaoDecisaoSchema, await readJson(req))
    decisao = body.decisao
    resposta = body.resposta
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }

  const sessionUser = user
  return sseResponse(async (emit) => {
    try {
      const acao = await carregarAcao(acaoId, sessionUser.email)
      // "pergunta" (tool perguntar_usuario, Fase 6) só resolve com "responder";
      // uma proposta de mutação normal nunca aceita "responder".
      if (acao.kind === "pergunta" && decisao !== "responder") {
        throw new UserError("Esta ação espera uma resposta")
      }
      if (acao.kind !== "pergunta" && decisao === "responder") {
        throw new UserError("Ação inválida para esta proposta")
      }

      const won =
        decisao === "responder"
          ? await reservarAcao(acaoId, "respondida", JSON.stringify(resposta))
          : await reservarAcao(acaoId, decisao === "confirmar" ? "confirmada" : "recusada")
      if (!won) throw new UserError("Esta ação já foi resolvida")

      emit({ type: "start", conversaId: acao.conversaId })

      const messages: Anthropic.MessageParam[] = JSON.parse(acao.contexto)
      const lastTurn = messages[messages.length - 1]
      const content = lastTurn.content as Anthropic.ContentBlockParam[]

      let toolResult: Anthropic.ToolResultBlockParam
      let link: ResultadoLink | null = null
      if (decisao === "responder") {
        // Nada a executar — a resposta do usuário É o resultado (o modelo lê o
        // JSON e segue narrando/agindo a partir dela).
        toolResult = { type: "tool_result", tool_use_id: acao.toolUseId, content: JSON.stringify(resposta) }
        await marcarEscolha(acao.conversaId, acaoId, "respondida", resposta)
      } else if (decisao === "confirmar") {
        try {
          const result = await executarAcao(acao, sessionUser)
          toolResult = {
            type: "tool_result",
            tool_use_id: acao.toolUseId,
            content: truncate(JSON.stringify(result ?? "ok")),
          }
          try {
            link = linkParaResultado(acao.toolName, result, JSON.parse(acao.payload))
          } catch {
            link = null
          }
        } catch (e) {
          toolResult = {
            type: "tool_result",
            tool_use_id: acao.toolUseId,
            content: e instanceof UserError ? e.message : "Falha ao executar a ação",
            is_error: true,
          }
          if (!(e instanceof UserError)) {
            log.error({ acaoId, err: e instanceof Error ? e.message : String(e) }, "lexia action failed")
          }
        }
        await marcarCartao(acao.conversaId, acaoId, "confirmada")
      } else {
        toolResult = {
          type: "tool_result",
          tool_use_id: acao.toolUseId,
          content: "O usuário recusou esta ação.",
          is_error: true,
        }
        await marcarCartao(acao.conversaId, acaoId, "recusada")
      }
      content.push(toolResult)

      const teto = await aplicarTeto(decidirModelo("", await ultimoModelo(acao.conversaId)))
      const decision = teto.decision
      const agentCtx: AgentCtx = {
        user: sessionUser,
        conversaId: acao.conversaId,
        signal: req.signal,
        processosHabilitado: processosHabilitado(await getModulosConfig()),
      }
      const result = await runAgentTurn(agentCtx, messages, decision, emit)
      if (teto.rebaixado) result.blocks.unshift({ type: "notice", text: MODO_ECONOMICO_AVISO, codigo: "modo-economico" })
      // Surface a deep-link to whatever the agent just created/changed (unless
      // the turn already paused on a fresh confirmation card).
      if (link && result.pendente === undefined) {
        result.blocks.push({ type: "link", rota: link.rota, label: link.label })
        emit({ type: "link", rota: link.rota, label: link.label })
      }
      const saved = await persistAssistantMsg(acao.conversaId, {
        text: result.text,
        blocks: result.blocks,
        model: decision.model,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        meta: result.meta,
      })
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
        log.error({ acaoId, err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }, "lexia acao failed")
      }
      const { mensagem, codigo } = mensagemErro(e)
      emit({ type: "error", mensagem, codigo })
    }
  })
}

function truncate(s: string, max = 8000): string {
  return s.length > max ? `${s.slice(0, max)}…(resultado truncado)` : s
}
