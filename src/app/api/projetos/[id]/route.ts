import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteProjeto, updateProjeto } from "@/lib/projetos/mutations"
import { projetoPatchSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateProjeto(parseId(id), parseBody(projetoPatchSchema, body)), {
    action: "projeto.editar",
    entity: "Projeto",
    entityId: id,
    payload: body,
    roles: ROLES_PROJETO_ESCRITA,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteProjeto(parseId(id)), {
    action: "projeto.excluir",
    entity: "Projeto",
    entityId: id,
    roles: ROLES_PROJETO_ESCRITA,
  })
}
