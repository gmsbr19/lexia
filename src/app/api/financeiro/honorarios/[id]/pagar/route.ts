import { pagarHonorario } from "@/lib/finance/mutations"
import { honorarioPagarSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => pagarHonorario(parseId(id), parseBody(honorarioPagarSchema, body)), {
    action: "honorario.pagar",
    entity: "Honorario",
    entityId: id,
    payload: body,
  })
}
