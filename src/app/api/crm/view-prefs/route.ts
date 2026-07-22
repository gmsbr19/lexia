// GET/PATCH /api/crm/view-prefs — views salvas do DataGrid (Oportunidades e
// Contatos), do próprio usuário. Mesmo padrão de /api/notificacoes/preferencias.
import { NextResponse } from "next/server"
import { guardRequest, requireUser, sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { getViewPrefs, setViewPrefs } from "@/lib/crm/view-prefs"
import { crmViewPrefsSchema } from "@/lib/crm/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  return NextResponse.json(await getViewPrefs(user.email))
}

export async function PATCH(req: Request) {
  const body = await readJson(req)
  const email = (await sessionEmail()) ?? ""
  return runMutation(() => setViewPrefs(email, parseBody(crmViewPrefsSchema, body)), {
    action: "crm.view-prefs",
    payload: body,
  })
}
