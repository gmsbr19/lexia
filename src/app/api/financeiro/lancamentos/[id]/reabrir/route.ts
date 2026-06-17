import { reabrirLancamento } from "@/lib/finance/mutations"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => reabrirLancamento(parseId(id)), {
    action: "lancamento.reabrir",
    entity: "Lancamento",
    entityId: id,
  })
}
