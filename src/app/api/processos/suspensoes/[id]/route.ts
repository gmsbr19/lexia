// DELETE /api/processos/suspensoes/[id] — remove a suspension period (socio).
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteSuspensao } from "@/lib/processos/mutations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteSuspensao(parseId(id)), {
    action: "suspensao.excluir",
    entity: "SuspensaoPrazo",
    entityId: id,
    roles: ["socio"],
  })
}
