import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getLeads } from "@/lib/comercial/queries"
import { createLead } from "@/lib/comercial/mutations"
import { leadCreateSchema } from "@/lib/comercial/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { currentMes, normalizePeriodo } from "@/lib/finance/periodo"
import type { LeadEtapa, LeadFilters, LeadOrigem } from "@/lib/comercial/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const url = new URL(req.url)
  const sp = url.searchParams
  const mes = sp.get("mes") ?? currentMes()
  const periodo = normalizePeriodo(sp.get("periodo") ?? undefined)
  const campanhaIdRaw = sp.get("campanhaId")
  const filters: LeadFilters = {
    origem: (sp.get("origem") as LeadOrigem) || null,
    etapa: (sp.get("etapa") as LeadEtapa) || null,
    campanhaId: campanhaIdRaw ? Number(campanhaIdRaw) || null : null,
    q: sp.get("q") || null,
  }
  return NextResponse.json(await getLeads(mes, periodo, filters))
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createLead(parseBody(leadCreateSchema, body)), {
    action: "lead.criar",
    entity: "Lead",
    payload: body,
  })
}
