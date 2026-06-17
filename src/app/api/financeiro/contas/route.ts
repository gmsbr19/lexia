import { createConta } from "@/lib/finance/mutations"
import { contaCreateSchema } from "@/lib/finance/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createConta(parseBody(contaCreateSchema, body)), {
    action: "conta.criar",
    entity: "Conta",
    payload: body,
    roles: ["socio"],
  })
}
