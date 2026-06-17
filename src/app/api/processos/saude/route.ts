// GET /api/processos/saude — consistency/health report (RBAC-scoped): processos sem
// partes/cliente, prazos sem responsável, publicações a vincular, honorários soltos.
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { getSaudeProcessos } from "@/lib/processos/saude"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getSaudeProcessos(await requireUser()))
}
