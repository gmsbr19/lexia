import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteUser, updateUser } from "@/lib/users/mutations"
import { userPatchSchema } from "@/lib/users/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** PATCH /api/users/[id] — nome / role / ativo / reset senha (admin). */
export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateUser(parseId(id), parseBody(userPatchSchema, body)), {
    action: "user.editar",
    entity: "User",
    entityId: id,
    payload: { ...body, senha: undefined }, // never snapshot passwords into the audit trail
    roles: ["admin"],
  })
}

/** DELETE /api/users/[id] — remove a user account (admin; not self / last admin). */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const actor = await requireUser()
      return deleteUser(parseId(id), actor.email)
    },
    { action: "user.excluir", entity: "User", entityId: id, roles: ["admin"] },
  )
}
