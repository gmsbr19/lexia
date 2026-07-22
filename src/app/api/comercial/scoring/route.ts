import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { getScoringConfig, scoringSchema, setScoringConfig } from "@/lib/settings"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/comercial/scoring — critérios de Fit + sinais de Engajamento
 *  (qualquer usuário autenticado: lido pela grade/painel de follow-up). */
export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getScoringConfig())
}

export async function PUT(req: Request) {
  const body = await req.json()
  return runMutation(() => setScoringConfig(parseBody(scoringSchema, body)), {
    action: "settings.comercial.scoring",
    entity: "AppSetting",
    entityId: "comercial.scoring",
    payload: body,
    roles: ["socio"],
  })
}
