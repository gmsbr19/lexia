import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getHonorarioDetail } from "@/lib/finance/queries"
import { type RouteCtx } from "@/lib/finance/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/financeiro/lancamentos/[id]/contrato — the "contrato" (honorário)
 * detail + série de parcelas for a fee-lançamento (subTipo='honorario'). Backs
 * the CrmHonorarioModal (a honorário is a fee-lançamento, not the Contrato entity).
 */
export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied

  const { id } = await ctx.params
  const detail = await getHonorarioDetail(Number(id))
  if (!detail) return NextResponse.json({ error: "Honorário não encontrado" }, { status: 404 })
  return NextResponse.json(detail)
}
