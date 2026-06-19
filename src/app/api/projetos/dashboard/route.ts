import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getProdutividadeDashboard } from "@/lib/projetos/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getProdutividadeDashboard())
}
