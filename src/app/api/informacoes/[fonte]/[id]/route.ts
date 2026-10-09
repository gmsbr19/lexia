// PATCH  /api/informacoes/[fonte]/[id] — editar o texto e/ou fixar/desafixar (qualquer pessoa).
// DELETE /api/informacoes/[fonte]/[id] — excluir (soft): só o autor ou admin/sócio.
// `fonte` = "cliente" (nota do cliente) | "anotacao" (nota do caso / projeto interno).
import { parseId, readJson } from "@/lib/finance/api"
import { editarInformacao, excluirInformacao } from "@/lib/informacoes/mutations"
import { fonteSchema, informacaoPatchSchema } from "@/lib/informacoes/schemas"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ fonte: string; id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const { fonte, id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "informacao.editar", entity: "Informacao", entityId: `${fonte}-${id}`, payload: body }, (ator) =>
    editarInformacao(parseBody(fonteSchema, fonte), parseId(id), parseBody(informacaoPatchSchema, body), ator),
  )
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { fonte, id } = await ctx.params
  return mutacaoTarefa(req, { action: "informacao.excluir", entity: "Informacao", entityId: `${fonte}-${id}` }, (ator) =>
    excluirInformacao(parseBody(fonteSchema, fonte), parseId(id), ator),
  )
}
