// POST /api/tarefas/projetos/[id]/converter { clienteId } — vincula um projeto
// INTERNO a um cliente: ele vira um caso do cliente e as tarefas vão junto.
// Sócio/advogado (admin passa). Não entra no "Desfazer" (o caso passa a existir
// em /casos — lá se ajusta ou exclui).
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { converterProjetoSchema } from "@/lib/modelos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/modelos/types"
import { converterEmCaso } from "@/lib/tarefas/projetos"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "projeto.converter-em-caso", entity: "Projeto", entityId: id, payload: body, roles: ROLES_PROJETO_ESCRITA },
    (ator) => converterEmCaso(parseId(id), parseBody(converterProjetoSchema, body).clienteId, ator),
  )
}
