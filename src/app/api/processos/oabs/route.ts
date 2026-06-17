// GET  /api/processos/oabs  — OABs monitoradas (qualquer usuário logado)
// POST /api/processos/oabs  — cadastra uma OAB (socio)
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createOab } from "@/lib/processos/mutations"
import { listOabs } from "@/lib/processos/queries"
import { oabCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await listOabs())
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createOab(parseBody(oabCreateSchema, body)), {
    action: "processo.oab.criar",
    entity: "OabMonitorada",
    payload: body,
    roles: ["socio"],
  })
}
