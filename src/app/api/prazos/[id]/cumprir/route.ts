// POST /api/prazos/[id]/cumprir — mark a deadline fulfilled (optional `data`).
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { cumprirPrazo } from "@/lib/processos/mutations"
import { assertAcessoPrazo } from "@/lib/processos/rbac-assert"
import { cumprirPrazoSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const pid = parseId(id)
      const user = await requireUser()
      await assertAcessoPrazo(user, pid)
      return cumprirPrazo(pid, parseBody(cumprirPrazoSchema, body).data, user.email)
    },
    { action: "prazo.cumprir", entity: "Prazo", entityId: id, payload: body, roles: ["socio", "advogado"] },
  )
}
