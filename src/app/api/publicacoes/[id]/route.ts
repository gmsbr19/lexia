// DELETE /api/publicacoes/[id] — remove (soft-delete) uma publicação da fila.
import { requireUser } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deletePublicacao } from "@/lib/processos/mutations"
import { assertAcessoPublicacao } from "@/lib/processos/rbac-assert"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const pubId = parseId(id)
      await assertAcessoPublicacao(await requireUser(), pubId)
      return deletePublicacao(pubId)
    },
    { action: "publicacao.excluir", entity: "Publicacao", entityId: id, roles: ["socio", "advogado"] },
  )
}
