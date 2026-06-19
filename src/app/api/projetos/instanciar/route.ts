import { sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { instanciarTemplateProjeto } from "@/lib/projetos/mutations"
import { instanciarSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => instanciarTemplateProjeto(parseBody(instanciarSchema, body), actor), {
    action: "projeto.instanciar",
    entity: "Projeto",
    payload: body,
    roles: ROLES_PROJETO_ESCRITA,
  })
}
