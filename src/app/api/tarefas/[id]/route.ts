import { sessionEmail } from "@/lib/auth/session"
import { readJson, parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { updateTarefa, deleteTarefa } from "@/lib/tarefas/mutations"
import { tarefaPatchSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"
import { withRequestOrigin, resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(() => updateTarefa(parseId(id), parseBody(tarefaPatchSchema, body), actor), {
      action: "tarefa.atualizar",
      entity: "Tarefa",
      entityId: id,
      payload: body,
    }),
  )
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteTarefa(parseId(id)), {
    action: "tarefa.excluir",
    entity: "Tarefa",
    entityId: id,
  })
}
