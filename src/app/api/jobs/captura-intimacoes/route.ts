// POST /api/jobs/captura-intimacoes — varre o Comunica/DJEN por OAB e grava as
// intimações novas como Publicacao pendente de triagem. Cron externo (cedo, dias
// úteis) com header `X-Job-Token`. Pula em fim de semana/feriado salvo ?force=1.
// Query: ?dry=1 (não grava), ?desde=YYYY-MM-DD (backfill), ?force=1.
import { NextResponse } from "next/server"
import { guardJob } from "@/lib/jobs/guard"
import { log } from "@/lib/log"
import { capturarIntimacoes, ehDiaUtilHoje } from "@/lib/processos/cnj/captura"
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
  const sp = new URL(req.url).searchParams
  const dry = sp.get("dry") === "1"
  const force = sp.get("force") === "1"
  const desde = sp.get("desde") ?? undefined
  try {
    if (!force && !(await ehDiaUtilHoje())) {
      log.info({ job: "captura-intimacoes" }, "pulado (não é dia útil)")
      return NextResponse.json({ ok: true, pulado: "nao-util" })
    }
    const resumo = await capturarIntimacoes({ dryRun: dry, desdeISO: desde })
    log.info({ job: "captura-intimacoes", criados: resumo.criados, falhas: resumo.falhas }, "job concluído")
    return NextResponse.json({ ok: true, ...resumo })
  } catch (e) {
    log.error({ job: "captura-intimacoes", err: e instanceof Error ? e.message : String(e) }, "job falhou")
    return NextResponse.json({ error: "Erro na captura de intimações" }, { status: 500 })
  }
}
