// PATCH  /api/tarefas/[id]/checklist/[item] { texto?, marcado? }
// DELETE /api/tarefas/[id]/checklist/[item]
import { parseId, readJson } from "@/lib/finance/api"
import { editarItem, removerItem } from "@/lib/tarefas/mutations"
import { mutacaoTarefa, type RotaItem } from "@/lib/tarefas/rota"
import { checklistPatchSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RotaItem) {
  const { id, item } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.checklist", entityId: id, payload: body }, (ator) =>
    editarItem(parseId(id), item, parseBody(checklistPatchSchema, body), ator),
  )
}

export async function DELETE(req: Request, ctx: RotaItem) {
  const { id, item } = await ctx.params
  return mutacaoTarefa(req, { action: "tarefa.checklist", entityId: id }, (ator) => removerItem(parseId(id), item, ator))
}
