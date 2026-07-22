import { parseId, readJson, runMutation } from "@/lib/finance/api"
import { deleteSecao, updateSecao } from "@/lib/projetos/mutations"
import { secaoPatchSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; secaoId: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const { secaoId } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateSecao(parseId(secaoId), parseBody(secaoPatchSchema, body)), {
    action: "secao.editar",
    entity: "ProjetoSecao",
    entityId: secaoId,
    payload: body,
    roles: ROLES_PROJETO_ESCRITA,
  })
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { secaoId } = await ctx.params
  return runMutation(() => deleteSecao(parseId(secaoId)), {
    action: "secao.excluir",
    entity: "ProjetoSecao",
    entityId: secaoId,
    roles: ROLES_PROJETO_ESCRITA,
  })
}
