// POST /api/jobs/captura-andamentos — consulta o DataJud para cada processo com CNJ
// e grava os movimentos novos como Andamento (metadados; NÃO conta prazo). Cron
// externo com header `X-Job-Token`. Query: ?dry=1 (não grava). Requer DATAJUD_API_KEY.
import { NextResponse } from "next/server"
import { guardJob } from "@/lib/jobs/guard"
import { log } from "@/lib/log"
import { capturarAndamentos } from "@/lib/processos/cnj/captura"
import { assertRateLimit, RATE_LIMIT_MESSAGE, RateLimitError } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const denied = guardJob(req)
  if (denied) return denied
  // throttle por ator fixo (bucket import 5/min) — limita mesmo se o token vazar.
  try {
    assertRateLimit("job:captura", "processo.captura.import")
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
    throw e
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1"
  try {
    const resumo = await capturarAndamentos({ dryRun: dry })
    log.info({ job: "captura-andamentos", criados: resumo.criados, falhas: resumo.falhas }, "job concluído")
    return NextResponse.json({ ok: true, ...resumo })
  } catch (e) {
    log.error({ job: "captura-andamentos", err: e instanceof Error ? e.message : String(e) }, "job falhou")
    return NextResponse.json({ error: "Erro na captura de andamentos" }, { status: 500 })
  }
}
