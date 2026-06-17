// GET  /api/casos  — paginated, filtered, RBAC-scoped caso list
// POST /api/casos  — create a caso (socio/advogado)
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { createCaso } from "@/lib/casos/mutations"
import { CASO_SORTABLE, listCasos } from "@/lib/casos/queries"
import { casoCreateSchema } from "@/lib/casos/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { intParam, parseListQuery, strParam } from "@/lib/list"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const sp = new URL(req.url).searchParams
  const q = parseListQuery(sp, { sortable: CASO_SORTABLE, defaultSort: "dataCriacao" })
  const filtros = {
    tipo: strParam(sp.get("tipo")),
    status: strParam(sp.get("status")),
    area: strParam(sp.get("area")),
    clienteId: intParam(sp.get("clienteId")),
    responsavelUserId: intParam(sp.get("responsavelUserId")),
    q: strParam(sp.get("q")),
  }
  return NextResponse.json(await listCasos(filtros, q, user))
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createCaso(parseBody(casoCreateSchema, body)), {
    action: "caso.criar",
    entity: "Caso",
    payload: body,
    roles: ["socio", "advogado"],
  })
}
