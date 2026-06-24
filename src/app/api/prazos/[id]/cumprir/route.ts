import { requireUser, sessionEmail } from "@/lib/auth/session"
import { readJson, parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { cumprirPrazo } from "@/lib/processos/mutations"
import { cumprirPrazoSchema } from "@/lib/processos/schemas"
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
        const { data } = parseBody(cumprirPrazoSchema, body)
        return cumprirPrazo(pid, data, actor)
      },
      { action: "prazo.cumprir", entity: "Prazo", entityId: id, roles: ["socio", "advogado"] },
    ),
  )
}
