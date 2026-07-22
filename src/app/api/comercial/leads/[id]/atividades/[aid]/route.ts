// DELETE /api/comercial/leads/[id]/atividades/[aid] — autor OU admin/sócio.
// Escopada ao `id` da oportunidade (anti-IDOR).
import { sessionEmail } from "@/lib/auth/session"
import { parseId, runMutation } from "@/lib/finance/api"
import { excluirAtividade } from "@/lib/comercial/atividades"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; aid: string }> }

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id, aid } = await ctx.params
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => excluirAtividade(parseId(id), parseId(aid), actor), {
    action: "lead.atividade.excluir",
    entity: "OportunidadeAtividade",
    entityId: aid,
  })
}
