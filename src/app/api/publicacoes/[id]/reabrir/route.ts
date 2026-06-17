// POST /api/publicacoes/[id]/reabrir — desfaz a triagem (volta para 'a triar').
// Usado para reverter um "cartorário"/triagem marcado por engano.
import { requireUser } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { reabrirTriagem } from "@/lib/processos/mutations"
import { assertAcessoPublicacao } from "@/lib/processos/rbac-assert"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const pubId = parseId(id)
      await assertAcessoPublicacao(await requireUser(), pubId)
      return reabrirTriagem(pubId)
    },
    { action: "publicacao.reabrir", entity: "Publicacao", entityId: id, roles: ["socio", "advogado"] },
  )
}
