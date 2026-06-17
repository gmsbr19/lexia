// GET  /api/processos/feriados — configured holidays (estadual/forense/municipal)
// POST /api/processos/feriados — add a holiday (socio). National ones are in code.
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createFeriado } from "@/lib/processos/mutations"
import { listFeriados } from "@/lib/processos/queries"
import { feriadoCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await listFeriados())
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createFeriado(parseBody(feriadoCreateSchema, body)), {
    action: "feriado.criar",
    entity: "Feriado",
    payload: body,
    roles: ["socio"],
  })
}
