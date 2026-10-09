// POST /api/informacoes — nova informação de um cliente, caso ou projeto interno
// (padrão: fixada — aparece em todas as tarefas dele). Qualquer pessoa; nota de
// caso NÃO fixada exige acesso ao caso. Reversível pelo "Desfazer" do quadro.
import { readJson } from "@/lib/finance/api"
import { criarInformacao } from "@/lib/informacoes/mutations"
import { informacaoCreateSchema } from "@/lib/informacoes/schemas"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "informacao.criar", entity: "Informacao", payload: body }, (ator) =>
    criarInformacao(parseBody(informacaoCreateSchema, body), ator),
  )
}
