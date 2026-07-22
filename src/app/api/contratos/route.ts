// POST /api/contratos — cria um contrato (documento assinado), opcionalmente já
// vinculando casos existentes. A lista vem do dataset do CRM (getContratos), sem
// rota GET própria.
import { criarContrato } from "@/lib/finance/mutations"
import { contratoCreateSchema } from "@/lib/finance/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => criarContrato(parseBody(contratoCreateSchema, body)), {
    action: "contrato.criar",
    entity: "Contrato",
    payload: body,
    roles: ["socio", "financeiro"],
  })
}
