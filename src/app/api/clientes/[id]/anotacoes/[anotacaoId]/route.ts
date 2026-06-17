// DELETE /api/clientes/[id]/anotacoes/[anotacaoId] — soft-delete a note.
import { parseId, runMutation } from "@/lib/finance/api"
import { excluirAnotacao } from "@/lib/clientes/cobranca"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; anotacaoId: string }> }) {
  const { id, anotacaoId } = await ctx.params
  return runMutation(() => excluirAnotacao(parseId(id), parseId(anotacaoId)), {
    action: "cliente.anotacao.excluir",
    entity: "ClienteAnotacao",
    entityId: anotacaoId,
  })
}
