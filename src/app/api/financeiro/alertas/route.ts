import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getVencidosResumo } from "@/lib/finance/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/financeiro/alertas — lightweight overdue snapshot for the proactive
 * LexIA-bar hint (gold pulsing dot). Gated to sócio+ like the rest of finance;
 * the bar fetches it best-effort and simply omits the dot on 401/403.
 */
export async function GET() {
  const denied = await guardRequest(["socio"])
  if (denied) return denied
  return NextResponse.json(await getVencidosResumo())
}
