import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { getClientes, getClienteOptions } from "@/lib/finance/queries"
import { createCliente } from "@/lib/clientes/mutations"
import { clienteCreateSchema } from "@/lib/clientes/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  // `?options=1` — lightweight {id,nome}[] picker list (e.g. CmMergeModal's
  // lazy client search), vs. the full getClientes() row (cpfCnpj/_count/…).
  const { searchParams } = new URL(req.url)
  if (searchParams.get("options") === "1") return NextResponse.json(await getClienteOptions())

  return NextResponse.json(await getClientes())
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createCliente(parseBody(clienteCreateSchema, body)), {
    action: "cliente.criar",
    entity: "Cliente",
    payload: body,
  })
}
