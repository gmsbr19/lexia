// POST /api/tarefas/criterios — AI-generate a task's DoR/DoD criteria from its
// context. Body { titulo, projeto?, notes?, prazo?, vinculo?, tipo? }. Returns
// { dor: string[]; dod: string[] }. Falls back to generic lists when the model
// is unavailable. Own rate bucket (20/min).
import { NextResponse } from "next/server"
import { z } from "zod"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { UserError } from "@/lib/errors"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"
import { readJson } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { gerarCriterios } from "@/lib/tarefas/criterios-ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  titulo: z.string().min(1).max(300),
  projeto: z.string().max(40).nullish(),
  notes: z.string().max(4000).nullish(),
  prazo: z.string().max(20).nullish(),
  vinculo: z.object({ tipo: z.enum(["caso", "cliente"]), nome: z.string().max(200) }).nullish(),
  tipo: z.enum(["dor", "dod", "both"]).optional(),
})

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
  if (!rateLimit(`${user.email}:tarefa-criterios`, 20, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  let body
  try {
    body = parseBody(schema, await readJson(req))
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }

  return NextResponse.json(await gerarCriterios(body))
}
