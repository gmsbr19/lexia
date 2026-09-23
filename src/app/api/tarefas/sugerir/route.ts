// POST /api/tarefas/sugerir { titulo } → { disponivel, projetoId, responsavelId,
// prazoFatal, prazo }. Só leitura (nada é gravado). Sem modelo → disponivel:false.
import { NextResponse } from "next/server"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { UserError } from "@/lib/errors"
import { readJson } from "@/lib/finance/api"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"
import { sugerirCampos } from "@/lib/tarefas/sugerir-ai"
import { sugerirSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
  if (!rateLimit(`${user.email}:tarefa-sugerir`, 20, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }
  try {
    const { titulo } = parseBody(sugerirSchema, await readJson(req))
    return NextResponse.json(await sugerirCampos(titulo))
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}
