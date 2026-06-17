// POST /api/andamentos/[id]/revisar — marca o movimento como revisado (sem gerar
// prazo): tira da fila de Movimentos a revisar. Escopo por processo (anti-IDOR).
import { requireUser } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { revisarAndamento } from "@/lib/processos/mutations"
import { assertAcessoAndamento } from "@/lib/processos/rbac-assert"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const aid = parseId(id)
      await assertAcessoAndamento(await requireUser(), aid)
      return revisarAndamento(aid)
    },
    { action: "andamento.revisar", entity: "Andamento", entityId: id, roles: ["socio", "advogado"] },
  )
}
