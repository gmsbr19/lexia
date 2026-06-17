import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getCampanhas } from "@/lib/comercial/queries"
import { createCampanha } from "@/lib/comercial/mutations"
import { campanhaCreateSchema } from "@/lib/comercial/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { currentMes, normalizePeriodo } from "@/lib/finance/periodo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const url = new URL(req.url)
  const mes = url.searchParams.get("mes") ?? currentMes()
  const periodo = normalizePeriodo(url.searchParams.get("periodo") ?? undefined)
  return NextResponse.json(await getCampanhas(mes, periodo))
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createCampanha(parseBody(campanhaCreateSchema, body)), {
    action: "campanha.criar",
    entity: "Campanha",
    payload: body,
  })
}
