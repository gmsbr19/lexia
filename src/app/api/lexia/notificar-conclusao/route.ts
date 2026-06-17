// POST /api/lexia/notificar-conclusao — o cliente chama isto quando um turno da
// LexIA termina COM A BARRA FECHADA (conclusão em segundo plano), para avisar o
// próprio usuário via sino/toast. Body { conversaId?, resumo? }. Caminho separado
// do /chat porque só o cliente sabe se o usuário estava ou não olhando o resultado.
import { z } from "zod"
import { NextResponse } from "next/server"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { UserError } from "@/lib/errors"
import { readJson } from "@/lib/finance/api"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"
import { notificarLexiaConcluiu } from "@/lib/notificacoes/triggers"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  conversaId: z.number().int().positive().nullable().optional(),
  resumo: z.string().max(200).optional(),
})

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
  // Mesma janela do chat (10/min): no máximo um aviso por turno.
  if (!rateLimit(`${user.email}:lexia-notif`, 10, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  let body
  try {
    body = parseBody(schema, await readJson(req))
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }

  await notificarLexiaConcluiu({
    userEmail: user.email,
    conversaId: body.conversaId ?? null,
    resumo: body.resumo ?? null,
  })
  return NextResponse.json({ ok: true })
}
