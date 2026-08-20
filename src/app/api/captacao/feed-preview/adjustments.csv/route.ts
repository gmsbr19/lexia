// GET /api/captacao/feed-preview/adjustments.csv — ver conversions.csv/route.ts.
import { guardRequest } from "@/lib/auth/session"
import { gerarAdjustmentsCsv } from "@/lib/captacao/feed"
import { buscarLinhasAjuste } from "@/lib/captacao/feed-queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin", "socio"])
  if (denied) return denied
  const agora = new Date()
  const csv = gerarAdjustmentsCsv(await buscarLinhasAjuste(agora), agora)
  return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8" } })
}
