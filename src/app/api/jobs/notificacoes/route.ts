// POST /api/jobs/notificacoes — scan upcoming/overdue prazos, compromissos and
// tarefas and upsert per-user Notificacao rows (idempotent by dedupeKey).
//
// The app is request-driven (no worker); this is meant to be called by an
// EXTERNAL cron (DEPLOY.md §6) with header `X-Job-Token: <JOBS_TOKEN>`. There is
// no session here, so it is guarded by the shared secret instead. Disabled (404)
// when JOBS_TOKEN is unset, so it can never run unauthenticated.
import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { gerarNotificacoes } from "@/lib/processos/notificacoes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Constant-time compare (length-guarded) so the shared secret leaks no timing. */
function tokenOk(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  if (!env.JOBS_TOKEN) {
    return NextResponse.json({ error: "Job desabilitado (defina JOBS_TOKEN)" }, { status: 404 })
  }
  if (!tokenOk(req.headers.get("x-job-token"), env.JOBS_TOKEN)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  try {
    const result = await gerarNotificacoes()
    log.info({ job: "notificacoes", ...result }, "notifications job ran")
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    log.error({ job: "notificacoes", err: e instanceof Error ? e.message : String(e) }, "notifications job failed")
    return NextResponse.json({ error: "Erro ao gerar notificações" }, { status: 500 })
  }
}
