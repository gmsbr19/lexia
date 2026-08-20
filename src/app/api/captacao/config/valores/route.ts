import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getValoresConfig, setValoresConfig, valoresConfigSchema } from "@/lib/captacao/config"
import { runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied
  return NextResponse.json(await getValoresConfig())
}

export async function PUT(req: Request) {
  const body = await req.json()
  return runMutation(() => setValoresConfig(parseBody(valoresConfigSchema, body)), {
    action: "settings.captacao.valores",
    entity: "AppSetting",
    entityId: "captacao.valores",
    payload: body,
    roles: ["admin"],
  })
}
