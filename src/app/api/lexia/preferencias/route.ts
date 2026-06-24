// GET/PATCH /api/lexia/preferencias — preferências da LexIA do próprio usuário
// (persona, instruções, modo do agente, modelo, toggles). Mesmo padrão de
// /api/notificacoes/preferencias.
import { NextResponse } from "next/server"
import { guardRequest, requireUser, sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { getLexiaPrefs, setLexiaPrefs } from "@/lib/lexia/preferencias"
import { lexiaPrefsSchema } from "@/lib/lexia/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  return NextResponse.json(await getLexiaPrefs(user.email))
}

export async function PATCH(req: Request) {
  const body = await readJson(req)
  const email = (await sessionEmail()) ?? ""
  return runMutation(() => setLexiaPrefs(email, parseBody(lexiaPrefsSchema, body)), {
    action: "lexia.preferencias",
    payload: body,
  })
}
