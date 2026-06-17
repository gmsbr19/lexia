import { criarLancamentos } from "@/lib/finance/mutations"
import { novoLancamentoSchema } from "@/lib/finance/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => criarLancamentos(parseBody(novoLancamentoSchema, body)), {
    action: "lancamento.criar",
    entity: "Lancamento",
    payload: body,
  })
}
