// POST /api/tarefas/projetos — "Novo projeto" pelo quadro (sócio/advogado; admin
// passa). COM cliente vira um caso do cliente (o cadastro completo fica em
// /casos); SEM cliente, um projeto interno do escritório. Reversível pelo
// "Desfazer" (exclusão soft; o caso é recusado se já estiver em uso).
import { readJson } from "@/lib/finance/api"
import { projetoNovoSchema } from "@/lib/modelos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/modelos/types"
import { criarProjeto } from "@/lib/tarefas/projetos"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "projeto.criar", entity: "Projeto", payload: body, roles: ROLES_PROJETO_ESCRITA },
    (ator) => criarProjeto(parseBody(projetoNovoSchema, body), ator),
  )
}
