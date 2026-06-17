// DELETE /api/anotacoes/[id] — soft-delete a note.
import { requireUser } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteAnotacao } from "@/lib/processos/mutations"
import { assertAcessoAnotacao } from "@/lib/processos/rbac-assert"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const aid = parseId(id)
      await assertAcessoAnotacao(await requireUser(), aid)
      return deleteAnotacao(aid)
    },
    { action: "anotacao.excluir", entity: "Anotacao", entityId: id, roles: ["socio", "advogado"] },
  )
}
