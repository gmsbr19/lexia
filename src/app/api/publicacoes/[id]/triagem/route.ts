// POST /api/publicacoes/[id]/triagem — mark relevante (→ generate a prazo) or
// descartar. Body: { acao: 'relevante'|'descartar', prazo?: {...}, criarEvento? }.
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { triarPublicacao } from "@/lib/processos/mutations"
import { assertAcessoPublicacao } from "@/lib/processos/rbac-assert"
import { triagemSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const pubId = parseId(id)
      await assertAcessoPublicacao(await requireUser(), pubId)
      return triarPublicacao(pubId, parseBody(triagemSchema, body))
    },
    { action: "publicacao.triar", entity: "Publicacao", entityId: id, payload: body, roles: ["socio", "advogado"] },
  )
}
