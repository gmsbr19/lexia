// GET /api/processos/alertas — flat "needs attention" feed (RBAC-scoped):
// processos parados (60+ dias sem movimentação), prazos em risco (urgência
// vermelha) e inconsistências de dados. Bare JSON (AlertaProcesso[]).
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { getAlertasProcessos } from "@/lib/processos/saude"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getAlertasProcessos(await requireUser()))
}
