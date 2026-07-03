import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { modulosSchema, getModulosConfig, setModulosConfig } from "@/lib/settings"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/settings/modulos — module kill-switches (any authenticated user: read by sidebar/tabs). */
export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied

  return NextResponse.json(await getModulosConfig())
}

export async function PUT(req: Request) {
  const body = await readJson(req)
  return runMutation(() => setModulosConfig(parseBody(modulosSchema, body)), {
    action: "settings.modulos",
    entity: "AppSetting",
    entityId: "modulos",
    payload: body,
    roles: ["admin"],
  })
}
