// GET /api/andamentos/[id]/sugestao-triagem — apoio à decisão (IA sob demanda):
// classifica relevância + motivo e sugere o prazo de um movimento. Cai na heurística
// sem ANTHROPIC_API_KEY. Escopo por processo.
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { parseId, type RouteCtx } from "@/lib/finance/api"
import { assertAcessoAndamento } from "@/lib/processos/rbac-assert"
import { sugerirTriagemAndamento } from "@/lib/processos/triagem-ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  const aid = parseId(id)
  await assertAcessoAndamento(await requireUser(), aid)
  return NextResponse.json(await sugerirTriagemAndamento(aid))
}
