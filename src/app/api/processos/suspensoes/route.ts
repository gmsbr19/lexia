// GET  /api/processos/suspensoes — configured suspension periods (CPC art. 220 etc.)
// POST /api/processos/suspensoes — add a suspension period (socio)
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createSuspensao } from "@/lib/processos/mutations"
import { listSuspensoes } from "@/lib/processos/queries"
import { suspensaoCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await listSuspensoes())
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createSuspensao(parseBody(suspensaoCreateSchema, body)), {
    action: "suspensao.criar",
    entity: "SuspensaoPrazo",
    payload: body,
    roles: ["socio"],
  })
}
