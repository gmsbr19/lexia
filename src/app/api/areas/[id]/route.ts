import { runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { deleteArea, updateArea } from "@/lib/areas/mutations"
import { areaPatchSchema } from "@/lib/areas/schemas"
import { ROLES_AREA } from "@/lib/areas/types"
import { UserError } from "@/lib/errors"

type RouteCtx = { params: Promise<{ id: string }> }

function parseId(s: string): number {
  const n = Number(s)
  if (!Number.isInteger(n) || n <= 0) throw new UserError("ID inválido")
  return n
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await req.json()
  return runMutation(() => updateArea(parseId(id), parseBody(areaPatchSchema, body)), {
    action: "area.editar",
    entity: "AreaDireito",
    entityId: id,
    payload: body,
    roles: ROLES_AREA,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteArea(parseId(id)), {
    action: "area.excluir",
    entity: "AreaDireito",
    entityId: id,
    roles: ROLES_AREA,
  })
}
