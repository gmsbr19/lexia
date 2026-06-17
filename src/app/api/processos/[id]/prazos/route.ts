// POST /api/processos/[id]/prazos — create a deadline (the engine computes the
// fatal/internal dates from the configured holidays/suspensions).
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { createPrazo } from "@/lib/processos/mutations"
import { assertAcessoProcesso } from "@/lib/processos/rbac-assert"
import { prazoCreateSchema } from "@/lib/processos/schemas"
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
      await assertAcessoProcesso(user, pid)
      return createPrazo(pid, parseBody(prazoCreateSchema, body), user.email)
    },
    { action: "prazo.criar", entity: "Prazo", payload: body, roles: ["socio", "advogado"] },
  )
}
