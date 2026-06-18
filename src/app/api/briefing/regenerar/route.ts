// POST /api/briefing/regenerar — force a fresh AI daily briefing, overwriting
// today's cached entry. Returns the new briefing. Own rate bucket (6/min).
import { NextResponse } from "next/server"
import { AuthError, requireUser, unauthorized, type Role } from "@/lib/auth/session"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"
import { regenerarBriefingDiario } from "@/lib/finance/briefing-ai"
import { verFinanceiro } from "@/lib/users/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
  if (!rateLimit(`${user.email}:briefing`, 6, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }
  const briefing = await regenerarBriefingDiario(verFinanceiro(user.role as Role))
  return NextResponse.json({ briefing })
}
