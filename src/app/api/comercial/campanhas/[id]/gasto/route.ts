import { registrarGasto } from "@/lib/comercial/mutations"
import { gastoSchema } from "@/lib/comercial/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Records ad spend for the campaign as a Financeiro saída (categoria Marketing).
export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    () => registrarGasto({ ...parseBody(gastoSchema, body), campanhaId: parseId(id) }),
    { action: "campanha.gasto", entity: "Lancamento", payload: body },
  )
}
