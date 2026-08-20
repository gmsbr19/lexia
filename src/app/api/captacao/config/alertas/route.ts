import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { alertasConfigSchema, getAlertasConfig, setAlertasConfig } from "@/lib/captacao/config"
import { runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied
  return NextResponse.json(await getAlertasConfig())
}

export async function PUT(req: Request) {
  const body = await req.json()
  return runMutation(() => setAlertasConfig(parseBody(alertasConfigSchema, body)), {
    action: "settings.captacao.alertas",
    entity: "AppSetting",
    entityId: "captacao.alertas",
    payload: body,
    roles: ["admin"],
  })
}
