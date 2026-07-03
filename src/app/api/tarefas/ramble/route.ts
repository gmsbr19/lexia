// POST /api/tarefas/ramble — interpret a dictation transcript into the updated
// structured task-draft list (voice capture). Body { transcricao, rascunho }.
// Returns { disponivel, encerrar, tarefas }. `disponivel:false` signals the
// client to fall back to the local parseQuickAdd heuristics (no API key /
// model failure). Read-only: nothing is persisted here — the client creates
// the tasks through POST /api/tarefas when the user confirms.
import { NextResponse } from "next/server"
import { z } from "zod"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { UserError } from "@/lib/errors"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"
import { readJson } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { interpretarRamble } from "@/lib/tarefas/ramble-ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const draftSchema = z.object({
  titulo: z.string().max(300),
  notes: z.string().max(2000).nullable(),
  data: z.string().max(10).nullable(),
  hora: z.string().max(5).nullable(),
  prazo: z.string().max(10).nullable(),
  prio: z.number().int().min(1).max(4),
  responsavelId: z.number().int().nullable(),
  projetoId: z.number().int().nullable(),
})
const schema = z.object({
  transcricao: z.string().min(1).max(8000),
  rascunho: z.array(draftSchema).max(30),
})

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
  if (!rateLimit(`${user.email}:tarefa-ramble`, 20, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  let body
  try {
    body = parseBody(schema, await readJson(req))
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }

  return NextResponse.json(await interpretarRamble(body))
}
