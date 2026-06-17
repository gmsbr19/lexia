import { bulkLancamentos } from "@/lib/finance/mutations"
import { bulkLancamentosSchema } from "@/lib/finance/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(
    () => {
      const parsed = parseBody(bulkLancamentosSchema, body)
      return bulkLancamentos(parsed.ids, parsed.action)
    },
    { action: "lancamentos.bulk", entity: "Lancamento", payload: body },
  )
}
