// PATCH  /api/processos/oabs/[id]  — edita nome/ativo da OAB (socio)
// DELETE /api/processos/oabs/[id]  — remove a OAB (socio)
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteOab, updateOab } from "@/lib/processos/mutations"
import { oabPatchSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateOab(parseId(id), parseBody(oabPatchSchema, body)), {
    action: "processo.oab.editar",
    entity: "OabMonitorada",
    entityId: id,
    payload: body,
    roles: ["socio"],
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteOab(parseId(id)), {
    action: "processo.oab.excluir",
    entity: "OabMonitorada",
    entityId: id,
    roles: ["socio"],
  })
}
