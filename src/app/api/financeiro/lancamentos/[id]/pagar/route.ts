import { pagarLancamento } from "@/lib/finance/mutations"
import { pagarLancamentoSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    () => pagarLancamento(parseId(id), parseBody(pagarLancamentoSchema, body).dataPagamento ?? null),
    { action: "lancamento.pagar", entity: "Lancamento", entityId: id, payload: body },
  )
}
