import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { escritorioSchema, getEscritorio, setEscritorio } from "@/lib/settings"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/settings/escritorio — office data used by generated documents (admin). */
export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied

  return NextResponse.json(await getEscritorio())
}

export async function PUT(req: Request) {
  const body = await readJson(req)
  return runMutation(() => setEscritorio(parseBody(escritorioSchema, body)), {
    action: "settings.escritorio",
    entity: "AppSetting",
    entityId: "escritorio",
    payload: body,
    roles: ["admin"],
  })
}
