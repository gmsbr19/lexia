import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { marcarFeedback } from "@/lib/lexia/mutations"
import { mensagemPatchSchema } from "@/lib/lexia/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** PATCH /api/lexia/mensagens/[id] — 👍/👎 numa resposta da IA (AiActionsBar). */
export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const user = await requireUser()
      return marcarFeedback(parseId(id), user.email, parseBody(mensagemPatchSchema, body).feedback)
    },
    { action: "lexia.mensagem.feedback", entity: "LexiaMensagem", entityId: id },
  )
}
