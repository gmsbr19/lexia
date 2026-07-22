import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { followupSchema, getFollowupConfig, setFollowupConfig } from "@/lib/settings"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/comercial/followup — cadência/pesos/regras do painel de
 *  follow-up (qualquer usuário autenticado). */
export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getFollowupConfig())
}

export async function PUT(req: Request) {
  const body = await req.json()
  return runMutation(() => setFollowupConfig(parseBody(followupSchema, body)), {
    action: "settings.comercial.followup",
    entity: "AppSetting",
    entityId: "comercial.followup",
    payload: body,
    roles: ["socio"],
  })
}
