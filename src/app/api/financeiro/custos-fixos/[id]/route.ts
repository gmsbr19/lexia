import { deleteCustoFixo, updateCustoFixo } from "@/lib/finance/mutations"
import { custoFixoPatchSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateCustoFixo(parseId(id), parseBody(custoFixoPatchSchema, body)), {
    action: "custofixo.editar",
    entity: "CustoFixo",
    entityId: id,
    payload: body,
    roles: ["socio"],
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteCustoFixo(parseId(id)), {
    action: "custofixo.excluir",
    entity: "CustoFixo",
    entityId: id,
    roles: ["socio"],
  })
}
