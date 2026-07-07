// POST /api/jobs/relatorio-diario — envia o relatório diário de tarefas por
// e-mail aos usuários cuja hora configurada casa com a hora atual (opt-in).
//
// Mesmo modelo de POST /api/jobs/notificacoes: o app é request-driven (sem
// worker); esta rota é chamada por um cron EXTERNO (DEPLOY.md §6) DE HORA EM
// HORA com o header `X-Job-Token: <JOBS_TOKEN>`. Sem sessão aqui — guardada
// pelo segredo compartilhado. Desabilitada (404) quando JOBS_TOKEN não está setado.
import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { enviarRelatoriosDiarios } from "@/lib/tarefas/relatorio"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
    const result = await enviarRelatoriosDiarios()
    log.info({ job: "relatorio-diario", ...result }, "daily report job ran")
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    log.error({ job: "relatorio-diario", err: e instanceof Error ? e.message : String(e) }, "daily report job failed")
    return NextResponse.json({ error: "Erro ao enviar relatório diário" }, { status: 500 })
  }
}
