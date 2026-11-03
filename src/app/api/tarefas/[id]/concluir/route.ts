// POST /api/tarefas/[id]/concluir — conclui (transacional): libera as seguintes
// que só esperavam por ela, avisa "Sua vez" aos responsáveis e devolve
// { liberadas, semResponsavel } (a tela pergunta "Quem cuida do próximo passo?").
import { parseId, type RouteCtx } from "@/lib/finance/api"
import { concluirTarefa } from "@/lib/tarefas/mutations"
import { mutacaoTarefa } from "@/lib/tarefas/rota"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return mutacaoTarefa(req, { action: "tarefa.concluir", entityId: id }, (ator) => concluirTarefa(parseId(id), ator))
}
