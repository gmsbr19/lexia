// POST /api/projetos/de-modelo { modeloId, projeto, grupos[{nome,prazo}], responsaveis{papelId:userId} }
// Cria (transacional) o projeto + grupos × passos tarefas + as ligações do modelo.
// "Desfazer" apaga projeto, tarefas e ligações.
import { readJson } from "@/lib/finance/api"
import { criarProjetoDeModelo } from "@/lib/projetos/mutations"
import { deModeloSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "projeto.de-modelo", entity: "Projeto", payload: body, roles: ROLES_PROJETO_ESCRITA },
    (ator) => criarProjetoDeModelo(parseBody(deModeloSchema, body), ator),
  )
}
