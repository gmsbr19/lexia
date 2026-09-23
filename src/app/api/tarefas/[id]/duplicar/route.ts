// POST /api/tarefas/[id]/duplicar — "Duplicar": cria uma cópia da tarefa (mesmos
// dados, checklist desmarcado, mesmas "só começa depois de"; sem comentários,
// histórico nem anexos). Reversível pelo "Desfazer".
import { parseId, type RouteCtx } from "@/lib/finance/api"
import { duplicarTarefa } from "@/lib/tarefas/mutations"
import { mutacaoTarefa } from "@/lib/tarefas/rota"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return mutacaoTarefa(req, { action: "tarefa.duplicar", entityId: id }, (ator) => duplicarTarefa(parseId(id), ator))
}
