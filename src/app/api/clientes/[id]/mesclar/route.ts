import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { mesclarClientes } from "@/lib/clientes/mutations"
import { mesclarClientesSchema } from "@/lib/clientes/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Merge a duplicate cliente into the one addressed by [id] (the survivor): all
// references are re-pointed and the duplicate is hard-deleted. Restricted to
// admin/socio (destructive, cross-entity). Audit action "cliente.mesclar".
export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => mesclarClientes(parseId(id), parseBody(mesclarClientesSchema, body).duplicadoId), {
    action: "cliente.mesclar",
    entity: "Cliente",
    entityId: id,
    payload: body,
    roles: ["admin", "socio"],
  })
}
