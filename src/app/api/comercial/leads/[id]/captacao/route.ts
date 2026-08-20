// GET /api/comercial/leads/[id]/captacao — bloco read-only "Origem &
// atribuição" da ficha da oportunidade (§5.4 do plano). Lazy-loaded ao abrir
// o modal — nunca entra no CmDataset (payload pesado, poucos abrem por vez).
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getCaptacaoLeadDetail } from "@/lib/captacao/fila"
import { parseId, type RouteCtx } from "@/lib/finance/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  const detail = await getCaptacaoLeadDetail(parseId(id))
  if (!detail) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  return NextResponse.json(detail)
}
