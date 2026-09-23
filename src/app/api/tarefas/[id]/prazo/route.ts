// PATCH /api/tarefas/[id]/prazo { prazo, ajustarSeguintes } — muda o prazo e, se
// pedido, desloca as seguintes (transitivas, abertas) pelo mesmo delta. Prazo
// fatal NUNCA é deslocado automaticamente.
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { definirPrazo } from "@/lib/tarefas/mutations"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { prazoSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.prazo", entityId: id, payload: body }, (ator) => {
    const b = parseBody(prazoSchema, body)
    return definirPrazo(parseId(id), b.prazo, !!b.ajustarSeguintes, ator)
  })
}
