import { sessionEmail } from "@/lib/auth/session"
import { deleteLead, updateLead } from "@/lib/comercial/mutations"
import { leadPatchSchema } from "@/lib/comercial/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => updateLead(parseId(id), parseBody(leadPatchSchema, body), actor), {
    action: "lead.editar",
    entity: "Lead",
    entityId: id,
    payload: body,
  })
}

// Exclusão DEFINITIVA (hard delete — o Lead não tem soft-delete): apaga em
// cascata os eventos de conversão e a timeline de atividades da oportunidade.
// Diferente do resto do módulo (aberto de propósito), esta é destrutiva e
// irreversível — gated a sócio ('admin' passa implicitamente).
export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteLead(parseId(id)), {
    action: "lead.excluir",
    entity: "Lead",
    entityId: id,
    roles: ["socio"],
  })
}
