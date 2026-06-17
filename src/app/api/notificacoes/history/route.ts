// GET /api/notificacoes/history — histórico paginado/filtrável do usuário
// (página /notificacoes). Envelope {items,total,page,pageSize}.
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { parseListQuery, strParam } from "@/lib/list"
import { listNotificacoesHistory } from "@/lib/notificacoes/queries"
import { type Modulo, MODULOS } from "@/lib/notificacoes/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const sp = new URL(req.url).searchParams

  const q = parseListQuery(sp, {
    sortable: ["createdAt"],
    defaultSort: "createdAt",
    defaultOrder: "desc",
    defaultPageSize: 30,
    maxPageSize: 100,
  })

  const moduloRaw = strParam(sp.get("modulo"))
  const modulo = moduloRaw && (MODULOS as readonly string[]).includes(moduloRaw) ? (moduloRaw as Modulo) : undefined
  const lidaRaw = sp.get("lida")
  const lida = lidaRaw === "1" || lidaRaw === "true" ? true : lidaRaw === "0" || lidaRaw === "false" ? false : undefined

  return NextResponse.json(
    await listNotificacoesHistory(user.email, { modulo, lida, de: strParam(sp.get("de")), ate: strParam(sp.get("ate")) }, q),
  )
}
