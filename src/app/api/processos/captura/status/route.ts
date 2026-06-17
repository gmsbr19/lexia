// GET /api/processos/captura/status — status das rodadas de captura por fonte +
// falhas recentes + OABs monitoradas. Alimenta a aba Captura e o banner de falha.
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getCapturaStatus, listOabs } from "@/lib/processos/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  const [status, oabs] = await Promise.all([getCapturaStatus(), listOabs()])
  return NextResponse.json({ ...status, oabs })
}
