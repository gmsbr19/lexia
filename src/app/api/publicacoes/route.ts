// GET  /api/publicacoes  — triagem queue (filters: status=pendente|triada|descartada, processoId)
// POST /api/publicacoes  — register a publication (may arrive unmatched to a processo)
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { intParam, parseListQuery, strParam } from "@/lib/list"
import { createPublicacao } from "@/lib/processos/mutations"
import { listPublicacoes, PUB_SORTABLE } from "@/lib/processos/queries"
import { publicacaoCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const sp = new URL(req.url).searchParams
  const q = parseListQuery(sp, { sortable: PUB_SORTABLE, defaultSort: "createdAt" })
  const filtros = { statusTriagem: strParam(sp.get("status")), processoId: intParam(sp.get("processoId")) }
  return NextResponse.json(await listPublicacoes(filtros, q, user))
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createPublicacao(parseBody(publicacaoCreateSchema, body)), {
    action: "publicacao.criar",
    entity: "Publicacao",
    payload: body,
    roles: ["socio", "advogado"],
  })
}
