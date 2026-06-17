import { deleteLancamento, editarLancamento } from "@/lib/finance/mutations"
import { novoLancamentoSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => editarLancamento(parseId(id), parseBody(novoLancamentoSchema, body)), {
    action: "lancamento.editar",
    entity: "Lancamento",
    entityId: id,
    payload: body,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteLancamento(parseId(id)), {
    action: "lancamento.excluir",
    entity: "Lancamento",
    entityId: id,
  })
}
