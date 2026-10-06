// POST /api/tarefas/casos — "Novo caso…" pelo quadro (sócio/advogado; admin passa).
// Só a etiqueta do quadro (nome curto, título, cliente, área, responsável, prazo,
// cor, descrição); o cadastro completo fica em /casos. Reversível pelo "Desfazer"
// (exclusão soft, recusada se o caso já estiver em uso).
import { readJson } from "@/lib/finance/api"
import { casoQuadroSchema } from "@/lib/modelos/schemas"
import { ROLES_CASO_ESCRITA } from "@/lib/modelos/types"
import { criarCasoQuadro } from "@/lib/tarefas/casos"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "caso.criar-quadro", entity: "Caso", payload: body, roles: ROLES_CASO_ESCRITA },
    (ator) => criarCasoQuadro(parseBody(casoQuadroSchema, body), ator),
  )
}
