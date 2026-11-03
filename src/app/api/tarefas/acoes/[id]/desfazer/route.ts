// POST /api/tarefas/acoes/[id]/desfazer — reverte uma ação (e seus efeitos em
// cascata). Só quem fez, dentro da janela de alguns minutos, uma vez.
import { sessionEmail } from "@/lib/auth/session"
import { runMutation, type RouteCtx } from "@/lib/finance/api"
import { desfazerAcao, limparAcoesAntigas } from "@/lib/tarefas/acoes"
import { resolverAtor } from "@/lib/tarefas/mutations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const ator = await resolverAtor(await sessionEmail())
      const r = await desfazerAcao(id, ator.id)
      void limparAcoesAntigas()
      return r
    },
    { action: "tarefa.desfazer", entity: "TarefaAcao", entityId: id },
  )
}
