// POST /api/prazos/[id]/rejeitar — rejeita um prazo proposto pela IA (não procede)
// → 'cancelado'. Escopo por processo (anti-IDOR).
import { requireUser } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { rejeitarPrazo } from "@/lib/processos/mutations"
import { assertAcessoPrazo } from "@/lib/processos/rbac-assert"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const pid = parseId(id)
      await assertAcessoPrazo(await requireUser(), pid)
      return rejeitarPrazo(pid)
    },
    { action: "prazo.rejeitar", entity: "Prazo", entityId: id, roles: ["socio", "advogado"] },
  )
}
