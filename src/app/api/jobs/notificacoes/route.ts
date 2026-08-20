// POST /api/jobs/notificacoes — scan upcoming/overdue prazos, compromissos and
// tarefas and upsert per-user Notificacao rows (idempotent by dedupeKey).
//
// The app is request-driven (no worker); this is meant to be called by an
// EXTERNAL cron (DEPLOY.md §6) with header `X-Job-Token: <JOBS_TOKEN>`. There is
// no session here, so it is guarded by the shared secret instead (guardJob —
// disabled/404 when JOBS_TOKEN is unset, so it can never run unauthenticated).
import { NextResponse } from "next/server"
import { guardJob } from "@/lib/jobs/guard"
import { log } from "@/lib/log"
import { gerarNotificacoes } from "@/lib/processos/notificacoes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const denied = guardJob(req)
  if (denied) return denied
  try {
    const result = await gerarNotificacoes()
    log.info({ job: "notificacoes", ...result }, "notifications job ran")
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    log.error({ job: "notificacoes", err: e instanceof Error ? e.message : String(e) }, "notifications job failed")
    return NextResponse.json({ error: "Erro ao gerar notificações" }, { status: 500 })
  }
}
