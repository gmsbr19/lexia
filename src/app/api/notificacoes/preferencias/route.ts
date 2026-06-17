// GET/PATCH /api/notificacoes/preferencias — preferências de notificação do
// próprio usuário (canais app/e-mail por módulo, navegador, severidade mínima).
import { NextResponse } from "next/server"
import { guardRequest, requireUser, sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { getPrefs, setPrefs } from "@/lib/notificacoes/preferencias"
import { notifPrefsSchema } from "@/lib/notificacoes/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  return NextResponse.json(await getPrefs(user.email))
}

export async function PATCH(req: Request) {
  const body = await readJson(req)
  const email = (await sessionEmail()) ?? ""
  return runMutation(() => setPrefs(email, parseBody(notifPrefsSchema, body)), {
    action: "notificacao.preferencias",
    payload: body,
  })
}
