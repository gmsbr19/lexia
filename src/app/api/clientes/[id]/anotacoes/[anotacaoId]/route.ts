// DELETE /api/clientes/[id]/anotacoes/[anotacaoId] — soft-delete a note (author or admin/sócio).
import { requireUser } from "@/lib/auth/session"
import { parseId, runMutation } from "@/lib/finance/api"
import { excluirAnotacao } from "@/lib/clientes/cobranca"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; anotacaoId: string }> }) {
  const { id, anotacaoId } = await ctx.params
  return runMutation(
    async () => {
      const u = await requireUser()
      return excluirAnotacao(parseId(id), parseId(anotacaoId), { email: u.email, role: u.role })
    },
    { action: "cliente.anotacao.excluir", entity: "ClienteAnotacao", entityId: anotacaoId },
  )
}
