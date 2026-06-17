import { createTransferencia } from "@/lib/finance/mutations"
import { transferenciaCreateSchema } from "@/lib/finance/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createTransferencia(parseBody(transferenciaCreateSchema, body)), {
    action: "transferencia.criar",
    entity: "Transferencia",
    payload: body,
    roles: ["socio"],
  })
}
