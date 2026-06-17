import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getImportacaoInfo } from "@/lib/settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/settings/importacao — DB counts + last Astrea/Genions import timestamps (admin). */
export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied

  return NextResponse.json(await getImportacaoInfo())
}
