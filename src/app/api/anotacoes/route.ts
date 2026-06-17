// POST /api/anotacoes — add a note to a caso or processo (autor = session).
import { sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createAnotacao } from "@/lib/processos/mutations"
import { anotacaoCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  const autor = (await sessionEmail()) ?? "sistema"
  return runMutation(() => createAnotacao({ ...parseBody(anotacaoCreateSchema, body), autor }), {
    action: "anotacao.criar",
    entity: "Anotacao",
    payload: body,
    roles: ["socio", "advogado", "estagiario"],
  })
}
