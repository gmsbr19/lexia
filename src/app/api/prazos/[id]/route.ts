// PATCH  /api/prazos/[id]  — edit a deadline (recomputes fatal/internal if timing changed)
// DELETE /api/prazos/[id]  — soft-delete (excluidoEm)
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deletePrazo, updatePrazo } from "@/lib/processos/mutations"
import { assertAcessoPrazo } from "@/lib/processos/rbac-assert"
import { prazoPatchSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const pid = parseId(id)
      const user = await requireUser()
      await assertAcessoPrazo(user, pid)
      return updatePrazo(pid, parseBody(prazoPatchSchema, body), user.email)
    },
    { action: "prazo.editar", entity: "Prazo", entityId: id, payload: body, roles: ["socio", "advogado"] },
  )
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const pid = parseId(id)
      await assertAcessoPrazo(await requireUser(), pid)
      return deletePrazo(pid)
    },
    { action: "prazo.excluir", entity: "Prazo", entityId: id, roles: ["socio", "advogado"] },
  )
}
