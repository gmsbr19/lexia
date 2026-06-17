// DELETE /api/processos/feriados/[id] — remove a configured holiday (socio).
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteFeriado } from "@/lib/processos/mutations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteFeriado(parseId(id)), {
    action: "feriado.excluir",
    entity: "Feriado",
    entityId: id,
    roles: ["socio"],
  })
}
