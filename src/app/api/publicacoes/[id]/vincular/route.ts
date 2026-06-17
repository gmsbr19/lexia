// POST /api/publicacoes/[id]/vincular — vincula a publicação a um Processo existente.
// Body: { processoId }. Escolha humana (a sugestão é só apoio à decisão).
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { vincularPublicacao } from "@/lib/processos/mutations"
import { assertAcessoProcesso, assertAcessoPublicacao } from "@/lib/processos/rbac-assert"
import { vincularPublicacaoSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const pubId = parseId(id)
      const { processoId } = parseBody(vincularPublicacaoSchema, body)
      const user = await requireUser()
      await assertAcessoPublicacao(user, pubId)
      await assertAcessoProcesso(user, processoId)
      return vincularPublicacao(pubId, processoId)
    },
    { action: "publicacao.vincular", entity: "Publicacao", entityId: id, payload: body, roles: ["socio", "advogado"] },
  )
}
