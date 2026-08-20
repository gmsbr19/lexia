// GET /feeds/google-ads/adjustments.csv — mesma proteção e mesma lógica do
// feed de conversões (ver conversions.csv/route.ts). RETRACT quando um lead
// volta de estágio no app; RESTATE quando o valor do contrato muda depois de
// enviado. Identifica a conversão original pela trinca gclid + nome da ação +
// horário original, sempre lida da fila — nunca recalculada.
import { guardFeedBasicAuth } from "@/lib/captacao/feed-auth"
import { gerarAdjustmentsCsv } from "@/lib/captacao/feed"
import { buscarLinhasAjuste } from "@/lib/captacao/feed-queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = guardFeedBasicAuth(req)
  if (denied) return denied
  const agora = new Date()
  const linhas = await buscarLinhasAjuste(agora)
  const csv = gerarAdjustmentsCsv(linhas, agora)
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
