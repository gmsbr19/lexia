import { sessionEmail } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteEvento, updateEvento } from "@/lib/agenda/mutations"
import { eventoPatchSchema } from "@/lib/agenda/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => updateEvento(parseId(id), parseBody(eventoPatchSchema, body), actor), {
    action: "evento.editar",
    entity: "Evento",
    entityId: id,
    payload: body,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteEvento(parseId(id)), {
    action: "evento.excluir",
    entity: "Evento",
    entityId: id,
  })
}
