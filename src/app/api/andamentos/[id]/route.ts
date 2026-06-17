// PATCH  /api/andamentos/[id]  — edit a movement entry
// DELETE /api/andamentos/[id]  — soft-delete (excluidoEm)
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteAndamento, updateAndamento } from "@/lib/processos/mutations"
import { assertAcessoAndamento } from "@/lib/processos/rbac-assert"
import { andamentoPatchSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const aid = parseId(id)
      await assertAcessoAndamento(await requireUser(), aid)
      return updateAndamento(aid, parseBody(andamentoPatchSchema, body))
    },
    { action: "andamento.editar", entity: "Andamento", entityId: id, payload: body, roles: ["socio", "advogado"] },
  )
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const aid = parseId(id)
      await assertAcessoAndamento(await requireUser(), aid)
      return deleteAndamento(aid)
    },
    { action: "andamento.excluir", entity: "Andamento", entityId: id, roles: ["socio", "advogado"] },
  )
}
