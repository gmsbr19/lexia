// POST /api/tarefas/[id]/checklist { texto } — adiciona um item ao checklist.
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { adicionarItem } from "@/lib/tarefas/mutations"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { checklistAddSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.checklist", entityId: id, payload: body }, (ator) =>
    adicionarItem(parseId(id), parseBody(checklistAddSchema, body).texto, ator),
  )
}
