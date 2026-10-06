// POST /api/tarefas/modelos/[id]/usar { caso | casoId, grupos[{nome,prazo}], responsaveis{papelId:userId} }
// Aplica o modelo: num caso NOVO (criado na hora) ou num caso EXISTENTE — grupos ×
// passos tarefas + as ligações do modelo, numa transação. "Desfazer" tira as
// tarefas (e exclui o caso, soft, se ele foi criado aqui).
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { usarModelo, type UsarModeloInput } from "@/lib/modelos/mutations"
import { usarModeloSchema } from "@/lib/modelos/schemas"
import { ROLES_CASO_ESCRITA } from "@/lib/modelos/types"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "modelo.usar", entity: "Caso", entityId: id, payload: body, roles: ROLES_CASO_ESCRITA },
    (ator) => usarModelo(parseId(id), parseBody(usarModeloSchema, body) as UsarModeloInput, ator),
  )
}
