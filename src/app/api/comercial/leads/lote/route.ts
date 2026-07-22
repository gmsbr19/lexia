import { sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { bulkUpdateLeads } from "@/lib/comercial/mutations"
import { leadsLoteSchema } from "@/lib/comercial/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Bulk edit of oportunidades (Fase 1 do CRM): apply one or more fields across
// many, or delete the selection. Same openness as the per-lead routes (no role
// gate). See bulkUpdateLeads for why ganho/perdido are rejected here.
export async function PATCH(req: Request) {
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => bulkUpdateLeads(parseBody(leadsLoteSchema, body), actor), {
    action: "lead.lote",
    entity: "Lead",
    payload: body,
  })
}
