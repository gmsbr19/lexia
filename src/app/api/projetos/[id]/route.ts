// PATCH  /api/projetos/[id] — editar campos e/ou { arquivado: true|false }.
// DELETE /api/projetos/[id] — exclusão (soft): as tarefas ficam "Sem projeto".
// Sócio/advogado (admin passa). Ambos reversíveis pelo "Desfazer".
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { atualizarProjeto, excluirProjeto } from "@/lib/projetos/mutations"
import { projetoPatchSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
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
    (ator) => atualizarProjeto(parseId(id), parseBody(projetoPatchSchema, body), ator),
  )
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return mutacaoTarefa(
    req,
    { action: "projeto.excluir", entity: "Projeto", entityId: id, roles: ROLES_PROJETO_ESCRITA },
    (ator) => excluirProjeto(parseId(id), ator),
  )
}
