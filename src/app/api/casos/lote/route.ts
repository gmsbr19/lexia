import { requireUser } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { scopeCasoWhere } from "@/lib/processos/rbac"
import { bulkUpdateCasos } from "@/lib/casos/mutations"
import { casosLoteSchema } from "@/lib/casos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Edição em lote da lista de casos: tipo/área/status/responsável. Sem exclusão
// (excluir é caso a caso, na página do caso). Mesmas permissões de criar.
export async function PATCH(req: Request) {
  const body = await readJson(req)
  return runMutation(async () => bulkUpdateCasos(parseBody(casosLoteSchema, body), await scopeCasoWhere(await requireUser())), {
    action: "caso.lote",
    entity: "Caso",
    payload: body,
    roles: ["socio", "advogado"],
  })
}
