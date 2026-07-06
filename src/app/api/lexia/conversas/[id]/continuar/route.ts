// POST /api/lexia/conversas/[id]/continuar — retoma um turno que parou sem
// terminar (Fase 4, D5): cortado por limite de tamanho ("Continuar"), parado
// pelo usuário ("Retomar") ou com o streaming perdido ("Reconectar"). Mesmo
// protocolo SSE de /chat; NÃO repete o texto já mostrado — o pedido de
// continuação é um nudge só-de-API (nunca persistido como mensagem do
// usuário) e a resposta vira uma NOVA linha (meta.continuacao) colada no
// cliente sob a anterior, sem Orb/gap.
import type Anthropic from "@anthropic-ai/sdk"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"
import { parseId, type RouteCtx } from "@/lib/finance/api"
import { carregarHistorico, ownConversa, persistAssistantMsg } from "@/lib/lexia/mutations"
import { mensagemErro } from "@/lib/lexia/agent/client"
import { decidirModelo } from "@/lib/lexia/agent/router"
import { aplicarTeto, MODO_ECONOMICO_AVISO } from "@/lib/consumo/guard"
import { runAgentTurn } from "@/lib/lexia/agent/loop"
import { sseResponse } from "@/lib/lexia/agent/sse"
import type { AgentCtx } from "@/lib/lexia/agent/types"
import type { MsgMeta } from "@/lib/lexia/types"
import { getModulosConfig, processosHabilitado } from "@/lib/settings"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NUDGE = "Continue exatamente de onde parou, sem repetir nada do que já foi dito."

export async function POST(req: Request, ctx: RouteCtx) {
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

  const { id } = await ctx.params
  let conversaId: number
  try {
    conversaId = parseId(id)
    await ownConversa(conversaId, user.email)
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }

  const sessionUser = user
  return sseResponse(async (emit) => {
    try {
      const { messages: prior, lastModel } = await carregarHistorico(conversaId)
      const messages: Anthropic.MessageParam[] = [...prior, { role: "user", content: NUDGE }]
      emit({ type: "start", conversaId })

      const teto = await aplicarTeto(decidirModelo("", lastModel))
      const decision = teto.decision
      const agentCtx: AgentCtx = {
        user: sessionUser,
        conversaId,
        signal: req.signal,
        processosHabilitado: processosHabilitado(await getModulosConfig()),
      }
      const result = await runAgentTurn(agentCtx, messages, decision, emit)
      if (teto.rebaixado) result.blocks.unshift({ type: "notice", text: MODO_ECONOMICO_AVISO, codigo: "modo-economico" })
      const meta: MsgMeta = { ...result.meta, continuacao: true }
      const saved = await persistAssistantMsg(conversaId, {
        text: result.text,
        blocks: result.blocks,
        model: decision.model,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        meta,
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
        log.error({ conversaId, err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }, "lexia continuar failed")
      }
      const { mensagem, codigo } = mensagemErro(e)
      emit({ type: "error", mensagem, codigo })
    }
  })
}
