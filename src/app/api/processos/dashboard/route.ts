// GET /api/processos/dashboard — aggregation for the home screen: prazos by
// urgency, today's audiências, the user's pending tarefas, publicações awaiting
// triagem, and headline indicators. RBAC-scoped to the caller.
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { getDashboard } from "@/lib/processos/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  return NextResponse.json(await getDashboard(user))
}
