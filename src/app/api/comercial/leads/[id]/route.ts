import { deleteLead, updateLead } from "@/lib/comercial/mutations"
import { leadPatchSchema } from "@/lib/comercial/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateLead(parseId(id), parseBody(leadPatchSchema, body)), {
    action: "lead.editar",
    entity: "Lead",
    entityId: id,
    payload: body,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteLead(parseId(id)), {
    action: "lead.excluir",
    entity: "Lead",
    entityId: id,
  })
}
