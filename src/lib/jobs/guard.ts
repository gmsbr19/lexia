// Shared guard for cron-triggered job endpoints. The app is request-driven (no
// worker); an external cron calls these with header `X-Job-Token: <JOBS_TOKEN>`.
// Returns a Response to short-circuit (404 if disabled, 401 if wrong token), or
// null when authorized. Constant-time compare (mirrors jobs/notificacoes). SERVER ONLY.
import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export function guardJob(req: Request): NextResponse | null {
  if (!env.JOBS_TOKEN) {
    return NextResponse.json({ error: "Job desabilitado (defina JOBS_TOKEN)" }, { status: 404 })
  }
  const provided = req.headers.get("x-job-token")
  const a = provided ? Buffer.from(provided) : null
  const b = Buffer.from(env.JOBS_TOKEN)
  const ok = !!a && a.length === b.length && timingSafeEqual(a, b)
  if (!ok) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  return null
}
