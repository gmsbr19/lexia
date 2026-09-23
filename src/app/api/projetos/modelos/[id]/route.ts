// PATCH  /api/projetos/modelos/[id] — substitui nome/papéis/passos do modelo.
// DELETE /api/projetos/modelos/[id] — exclui (soft). Só sócio (admin passa).
// Ambos reversíveis pelo "Desfazer".
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { atualizarModelo, excluirModelo } from "@/lib/projetos/mutations"
import { modeloSchema } from "@/lib/projetos/schemas"
import { ROLES_MODELO } from "@/lib/projetos/types"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "modelo.atualizar", entity: "ProjetoModelo", entityId: id, payload: body, roles: ROLES_MODELO },
    (ator) => atualizarModelo(parseId(id), parseBody(modeloSchema, body), ator),
  )
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return mutacaoTarefa(
    req,
    { action: "modelo.excluir", entity: "ProjetoModelo", entityId: id, roles: ROLES_MODELO },
    (ator) => excluirModelo(parseId(id), ator),
  )
}
