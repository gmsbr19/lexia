// POST /api/tarefas/[id]/checklist/[item]/virar-tarefa — "Transformar em tarefa":
// cria uma tarefa com o texto do item (mesmo projeto/grupo/responsável, prazo
// padrão) e remove o item do checklist.
import { parseId } from "@/lib/finance/api"
import { itemParaTarefa } from "@/lib/tarefas/mutations"
import { mutacaoTarefa, type RotaItem } from "@/lib/tarefas/rota"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RotaItem) {
  const { id, item } = await ctx.params
  return mutacaoTarefa(req, { action: "tarefa.checklist-tarefa", entityId: id }, (ator) =>
    itemParaTarefa(parseId(id), item, ator),
  )
}
