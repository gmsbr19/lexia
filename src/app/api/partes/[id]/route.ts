// PATCH  /api/partes/[id]  — edit a party link (papel/polo/identity)
// DELETE /api/partes/[id]  — unlink the party from the processo (Parte row kept)
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { removerParteDoProcesso, updateParteProcesso } from "@/lib/processos/mutations"
import { assertAcessoParteProcesso } from "@/lib/processos/rbac-assert"
import { partePatchSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const lid = parseId(id)
      await assertAcessoParteProcesso(await requireUser(), lid)
      return updateParteProcesso(lid, parseBody(partePatchSchema, body))
    },
    { action: "parte.editar", entity: "ParteProcesso", entityId: id, payload: body, roles: ["socio", "advogado"] },
  )
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const lid = parseId(id)
      await assertAcessoParteProcesso(await requireUser(), lid)
      return removerParteDoProcesso(lid)
    },
    { action: "parte.excluir", entity: "ParteProcesso", entityId: id, roles: ["socio", "advogado"] },
  )
}
