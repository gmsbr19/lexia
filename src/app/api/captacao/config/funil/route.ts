import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { funilConfigSchema, getFunilConfig, setFunilConfig } from "@/lib/captacao/config"
import { runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied
  return NextResponse.json(await getFunilConfig())
}

export async function PUT(req: Request) {
  const body = await req.json()
  return runMutation(() => setFunilConfig(parseBody(funilConfigSchema, body)), {
    action: "settings.captacao.funil",
    entity: "AppSetting",
    entityId: "captacao.funil",
    payload: body,
    roles: ["admin"],
  })
}
