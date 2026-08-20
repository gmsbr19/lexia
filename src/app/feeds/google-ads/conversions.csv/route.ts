// GET /feeds/google-ads/conversions.csv — o Google Ads LÊ isto por HTTPS
// agendado, uma vez por dia (nunca API, nunca upload manual). Devolve
// text/csv direto, sem redirect, sem HTML, sem tela de login — protegido por
// HTTP Basic Auth (variável de ambiente). Regenera o arquivo inteiro a cada
// requisição a partir de ConversaoEvento; inclui TODAS as linhas da janela de
// 90 dias (não só as novas) — o Google deduplica por gclid+nome+horário, e
// reenviar é o que faz o feed se auto-corrigir se uma leitura falhar.
import { guardFeedBasicAuth } from "@/lib/captacao/feed-auth"
import { gerarConversionsCsv } from "@/lib/captacao/feed"
import { buscarLinhasConversao } from "@/lib/captacao/feed-queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = guardFeedBasicAuth(req)
  if (denied) return denied
  const agora = new Date()
  const linhas = await buscarLinhasConversao(agora)
  const csv = gerarConversionsCsv(linhas, agora)
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
