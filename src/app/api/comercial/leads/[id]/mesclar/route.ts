import { sessionEmail } from "@/lib/auth/session"
import { readJson, parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { mesclarLeadComCliente } from "@/lib/comercial/mutations"
import { mesclarLeadSchema } from "@/lib/comercial/schemas"
import { parseBody } from "@/lib/validation"
import { withRequestOrigin, resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(() => mesclarLeadComCliente(parseId(id), parseBody(mesclarLeadSchema, body), actor), {
      action: "lead.mesclar",
      entity: "Lead",
      entityId: id,
      payload: body,
    }),
  )
}
