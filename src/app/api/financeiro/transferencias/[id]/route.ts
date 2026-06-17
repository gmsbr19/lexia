import { deleteTransferencia } from "@/lib/finance/mutations"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteTransferencia(parseId(id)), {
    action: "transferencia.excluir",
    entity: "Transferencia",
    entityId: id,
    roles: ["socio"],
  })
}
