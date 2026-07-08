import { pagarLancamento } from "@/lib/finance/mutations"
import { pagarLancamentoSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { ROLES_FINANCEIRO } from "@/lib/users/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const p = parseBody(pagarLancamentoSchema, body)
  return runMutation(
    () => pagarLancamento(parseId(id), { dataPagamento: p.dataPagamento ?? null, contaId: p.contaId ?? null }),
    { action: "lancamento.pagar", entity: "Lancamento", entityId: id, payload: body, roles: ROLES_FINANCEIRO },
  )
}
