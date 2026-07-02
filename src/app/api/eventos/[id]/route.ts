import { sessionEmail } from "@/lib/auth/session"
import { readJson, parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { updateEvento, deleteEvento } from "@/lib/agenda/mutations"
import { eventoPatchSchema } from "@/lib/agenda/schemas"
import { parseBody } from "@/lib/validation"
import { withRequestOrigin, resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(() => updateEvento(parseId(id), parseBody(eventoPatchSchema, body), actor), {
      action: "evento.atualizar",
      entity: "Evento",
      entityId: id,
      payload: body,
    }),
  )
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteEvento(parseId(id)), {
    action: "evento.excluir",
    entity: "Evento",
    entityId: id,
  })
}
