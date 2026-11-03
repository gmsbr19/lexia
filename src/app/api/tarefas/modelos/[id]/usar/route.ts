// POST /api/tarefas/modelos/[id]/usar { novo | projeto, grupos[{nome,prazo}], responsaveis{papelId:userId} }
// Aplica o modelo: num projeto NOVO (com cliente = caso do cliente; sem = projeto
// interno) ou num projeto EXISTENTE — grupos × passos tarefas + as ligações do
// modelo, numa transação. "Desfazer" tira as tarefas (e exclui o projeto, soft,
// se ele foi criado aqui).
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { usarModelo, type UsarModeloInput } from "@/lib/modelos/mutations"
import { usarModeloSchema } from "@/lib/modelos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/modelos/types"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "modelo.usar", entity: "ProjetoModelo", entityId: id, payload: body, roles: ROLES_PROJETO_ESCRITA },
    (ator) => usarModelo(parseId(id), parseBody(usarModeloSchema, body) as UsarModeloInput, ator),
  )
}
