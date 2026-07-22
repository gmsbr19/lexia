import { readJson, runMutation } from "@/lib/finance/api"
import { bulkUpdateClientes } from "@/lib/clientes/mutations"
import { clientesLoteSchema } from "@/lib/clientes/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Bulk edit of Contatos (Fase 2 do CRM): tipo/classificacao/origem só — sem
// exclusão (Cliente não tem hard-delete nem no single-record). Mesma
// abertura das rotas por-cliente (sem role gate).
export async function PATCH(req: Request) {
  const body = await readJson(req)
  return runMutation(() => bulkUpdateClientes(parseBody(clientesLoteSchema, body)), {
    action: "cliente.lote",
    entity: "Cliente",
    payload: body,
  })
}
