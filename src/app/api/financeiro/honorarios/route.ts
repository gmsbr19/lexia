import { createHonorario } from "@/lib/finance/mutations"
import { honorarioCreateSchema } from "@/lib/finance/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createHonorario(parseBody(honorarioCreateSchema, body)), {
    action: "honorario.criar",
    entity: "Honorario",
    payload: body,
  })
}
