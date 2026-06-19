import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteTemplate, updateTemplate } from "@/lib/projetos/mutations"
import { templatePatchSchema } from "@/lib/projetos/schemas"
import { ROLES_TEMPLATE } from "@/lib/projetos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateTemplate(parseId(id), parseBody(templatePatchSchema, body)), {
    action: "projeto_template.editar",
    entity: "ProjetoTemplate",
    entityId: id,
    payload: body,
    roles: ROLES_TEMPLATE,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteTemplate(parseId(id)), {
    action: "projeto_template.excluir",
    entity: "ProjetoTemplate",
    entityId: id,
    roles: ROLES_TEMPLATE,
  })
}
