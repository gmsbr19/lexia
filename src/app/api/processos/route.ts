// GET  /api/processos        — paginated, filtered, RBAC-scoped processo list
// POST /api/processos        — create a processo (socio/advogado)
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { intParam, parseListQuery, strParam } from "@/lib/list"
import { createProcesso } from "@/lib/processos/mutations"
import { listProcessos, PROCESSO_SORTABLE } from "@/lib/processos/queries"
import { processoCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const sp = new URL(req.url).searchParams
  const q = parseListQuery(sp, { sortable: PROCESSO_SORTABLE, defaultSort: "createdAt" })
  const filtros = {
    casoId: intParam(sp.get("casoId")),
    status: strParam(sp.get("status")),
    responsavelUserId: intParam(sp.get("responsavelUserId")),
    tribunal: strParam(sp.get("tribunal")),
    uf: strParam(sp.get("uf")),
    q: strParam(sp.get("q")),
  }
  return NextResponse.json(await listProcessos(filtros, q, user))
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createProcesso(parseBody(processoCreateSchema, body)), {
    action: "processo.criar",
    entity: "Processo",
    payload: body,
    roles: ["socio", "advogado"],
  })
}
