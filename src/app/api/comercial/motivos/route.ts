import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { getMotivosPerdaConfig, motivosPerdaSchema, setMotivosPerdaConfig } from "@/lib/settings"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/comercial/motivos — taxonomia de motivos de perda (qualquer
 *  usuário autenticado: lido pelo modal "Marcar como perdido"). */
export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getMotivosPerdaConfig())
}

export async function PUT(req: Request) {
  const body = await req.json()
  return runMutation(() => setMotivosPerdaConfig(parseBody(motivosPerdaSchema, body)), {
    action: "settings.comercial.motivos",
    entity: "AppSetting",
    entityId: "comercial.motivosPerda",
    payload: body,
    roles: ["socio"],
  })
}
