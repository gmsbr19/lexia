import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getAreasComUso } from "@/lib/areas/queries"

export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied
  return NextResponse.json(await getAreasComUso())
}
