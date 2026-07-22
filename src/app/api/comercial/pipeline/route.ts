import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { getPipelineConfig, pipelineSchema, setPipelineConfig } from "@/lib/settings"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/comercial/pipeline — etapas configuráveis do funil (qualquer
 *  usuário autenticado: lido pela tabela/funil/filtros). */
export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getPipelineConfig())
}

export async function PUT(req: Request) {
  const body = await req.json()
  return runMutation(() => setPipelineConfig(parseBody(pipelineSchema, body)), {
    action: "settings.comercial.pipeline",
    entity: "AppSetting",
    entityId: "comercial.pipeline",
    payload: body,
    roles: ["socio"],
  })
}
