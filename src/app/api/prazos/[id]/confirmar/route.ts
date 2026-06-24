import { requireUser, sessionEmail } from "@/lib/auth/session"
import { readJson, parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { confirmarPrazo } from "@/lib/processos/mutations"
import { prazoPatchSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"
import { assertAcessoPrazo } from "@/lib/processos/rbac-assert"
import { withRequestOrigin, resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(
      async () => {
        const pid = parseId(id)
        await assertAcessoPrazo(await requireUser(), pid)
        return confirmarPrazo(pid, parseBody(prazoPatchSchema, body), actor)
      },
      { action: "prazo.confirmar", entity: "Prazo", entityId: id, roles: ["socio", "advogado"] },
    ),
  )
}
