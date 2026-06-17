// GET /api/prazos — paginated, RBAC-scoped deadlines across processos. Filters:
// processoId, status, responsavelUserId, vencidos=1, ate=YYYY-MM-DD. Each row
// carries the derived urgency (semáforo).
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { intParam, parseListQuery, strParam } from "@/lib/list"
import { listPrazos, PRAZO_SORTABLE } from "@/lib/processos/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const sp = new URL(req.url).searchParams
  const q = parseListQuery(sp, { sortable: PRAZO_SORTABLE, defaultSort: "dataFatal", defaultOrder: "asc" })
  const filtros = {
    processoId: intParam(sp.get("processoId")),
    status: strParam(sp.get("status")),
    responsavelUserId: intParam(sp.get("responsavelUserId")),
    vencidos: sp.get("vencidos") === "1" || sp.get("vencidos") === "true",
    ateISO: strParam(sp.get("ate")),
  }
  return NextResponse.json(await listPrazos(filtros, q, user))
}
