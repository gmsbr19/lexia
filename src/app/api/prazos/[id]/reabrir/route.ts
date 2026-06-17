// POST /api/prazos/[id]/reabrir — reopen a fulfilled/cancelled deadline.
import { requireUser } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { reabrirPrazo } from "@/lib/processos/mutations"
import { assertAcessoPrazo } from "@/lib/processos/rbac-assert"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const pid = parseId(id)
      await assertAcessoPrazo(await requireUser(), pid)
      return reabrirPrazo(pid)
    },
    { action: "prazo.reabrir", entity: "Prazo", entityId: id, roles: ["socio", "advogado"] },
  )
}
