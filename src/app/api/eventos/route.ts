import { sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createEvento } from "@/lib/agenda/mutations"
import { eventoCreateSchema } from "@/lib/agenda/schemas"
import { parseBody } from "@/lib/validation"
import { withRequestOrigin, resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(() => createEvento(parseBody(eventoCreateSchema, body), actor), {
      action: "evento.criar",
      entity: "Evento",
      payload: body,
    }),
  )
}
