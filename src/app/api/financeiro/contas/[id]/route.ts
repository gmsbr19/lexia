import { updateConta } from "@/lib/finance/mutations"
import { contaPatchSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateConta(parseId(id), parseBody(contaPatchSchema, body)), {
    action: "conta.editar",
    entity: "Conta",
    entityId: id,
    payload: body,
    roles: ["socio"],
  })
}
