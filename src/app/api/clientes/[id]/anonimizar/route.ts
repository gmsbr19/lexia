import { anonimizarCliente } from "@/lib/finance/mutations"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// LGPD erasure: anonymize the cliente (and linked leads) in place — the audit
// entry written by runMutation is the deletion evidence.
export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => anonimizarCliente(parseId(id)), {
    action: "cliente.anonimizar",
    entity: "Cliente",
    entityId: id,
    roles: ["admin", "socio"],
  })
}
