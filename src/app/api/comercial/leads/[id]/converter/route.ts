import { sessionEmail } from "@/lib/auth/session"
import { converterLead } from "@/lib/comercial/mutations"
import { converterLeadSchema } from "@/lib/comercial/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Mark a lead won and link the Cliente / Caso / Honorário it converted into.
export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => converterLead(parseId(id), parseBody(converterLeadSchema, body), actor), {
    action: "lead.converter",
    entity: "Lead",
    entityId: id,
    payload: body,
  })
}
