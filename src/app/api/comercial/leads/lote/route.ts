import { sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { bulkUpdateLeads } from "@/lib/comercial/mutations"
import { leadsLoteSchema } from "@/lib/comercial/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Bulk edit of oportunidades (Fase 1 do CRM): apply one or more fields across
// many, or delete the selection. Same openness as the per-lead routes (no role
// gate) — EXCETO o ramo `excluir`, que é hard delete irreversível (cascateia
// eventos de conversão + atividades) e exige sócio, igual ao DELETE per-lead.
// See bulkUpdateLeads for why ganho/perdido are rejected here.
export async function PATCH(req: Request) {
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  // O gate lê a flag CRUA (o parse fica dentro do runMutation, que converte um
  // corpo inválido em 400 — fora dele viraria 500). Um `excluir` malformado não
  // burla nada: passa reto pelo gate mas o schema rejeita a requisição.
  const excluir = (body as { excluir?: unknown } | null)?.excluir === true
  return runMutation(() => bulkUpdateLeads(parseBody(leadsLoteSchema, body), actor), {
    action: excluir ? "lead.excluir-lote" : "lead.lote",
    entity: "Lead",
    payload: body,
    ...(excluir ? { roles: ["socio" as const] } : {}),
  })
}
