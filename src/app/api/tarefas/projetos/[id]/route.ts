// PATCH  /api/tarefas/projetos/[id] — edita/arquiva um projeto INTERNO.
// DELETE /api/tarefas/projetos/[id] — exclui (soft) o projeto interno; as tarefas
// ficam "Sem projeto". Sócio/advogado (admin passa); ambos reversíveis pelo
// "Desfazer". O caso do cliente se edita em /casos.
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { projetoInternoPatchSchema } from "@/lib/modelos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/modelos/types"
import { editarProjetoInterno, excluirProjetoInterno } from "@/lib/tarefas/projetos"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "projeto.atualizar", entity: "Projeto", entityId: id, payload: body, roles: ROLES_PROJETO_ESCRITA },
    (ator) => editarProjetoInterno(parseId(id), parseBody(projetoInternoPatchSchema, body), ator),
  )
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return mutacaoTarefa(
    req,
    { action: "projeto.excluir", entity: "Projeto", entityId: id, roles: ROLES_PROJETO_ESCRITA },
    (ator) => excluirProjetoInterno(parseId(id), ator),
  )
}
