import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getReconciliacaoSemanal } from "@/lib/captacao/reconciliacao"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin", "socio"])
  if (denied) return denied
  return NextResponse.json(await getReconciliacaoSemanal())
}
