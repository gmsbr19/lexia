import { deleteCampanha, updateCampanha } from "@/lib/comercial/mutations"
import { campanhaPatchSchema } from "@/lib/comercial/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateCampanha(parseId(id), parseBody(campanhaPatchSchema, body)), {
    action: "campanha.editar",
    entity: "Campanha",
    entityId: id,
    payload: body,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteCampanha(parseId(id)), {
    action: "campanha.excluir",
    entity: "Campanha",
    entityId: id,
  })
}
