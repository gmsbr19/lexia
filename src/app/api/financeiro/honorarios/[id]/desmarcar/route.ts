import { desmarcarHonorario } from "@/lib/finance/mutations"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => desmarcarHonorario(parseId(id)), {
    action: "honorario.desmarcar",
    entity: "Honorario",
    entityId: id,
  })
}
