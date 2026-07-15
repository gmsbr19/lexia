import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { notificacoesSchema, getNotificacoesConfig, setNotificacoesConfig } from "@/lib/settings"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/settings/notificacoes — regras do escritório (qualquer autenticado: a tela de preferências lê p/ decidir o que mostrar). */
export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied

  return NextResponse.json(await getNotificacoesConfig())
}

export async function PUT(req: Request) {
  const body = await readJson(req)
  return runMutation(() => setNotificacoesConfig(parseBody(notificacoesSchema, body)), {
    action: "settings.notificacoes",
    entity: "AppSetting",
    entityId: "notificacoes",
    payload: body,
    roles: ["admin"],
  })
}
