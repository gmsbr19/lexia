// GET /api/captacao/feed-preview/conversions.csv — o MESMO conteúdo do feed
// público (GET /feeds/google-ads/conversions.csv), mas atrás de SESSÃO (não
// Basic Auth) — conveniência para o admin conferir o feed sem montar um
// curl com credencial. Nunca usado pelo Google.
import { guardRequest } from "@/lib/auth/session"
import { gerarConversionsCsv } from "@/lib/captacao/feed"
import { buscarLinhasConversao } from "@/lib/captacao/feed-queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin", "socio"])
  if (denied) return denied
  const agora = new Date()
  const csv = gerarConversionsCsv(await buscarLinhasConversao(agora), agora)
  return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8" } })
}
