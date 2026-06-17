// GET /api/processos/movimentos — caixa de entrada de Movimentos a revisar,
// agrupada POR PROCESSO (RBAC-escopada via listMovimentosInbox).
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { listMovimentosInbox } from "@/lib/processos/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await listMovimentosInbox(await requireUser()))
}
