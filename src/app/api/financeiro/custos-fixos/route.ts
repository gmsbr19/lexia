import { createCustoFixo } from "@/lib/finance/mutations"
import { custoFixoCreateSchema } from "@/lib/finance/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createCustoFixo(parseBody(custoFixoCreateSchema, body)), {
    action: "custofixo.criar",
    entity: "CustoFixo",
    payload: body,
    roles: ["socio"],
  })
}
