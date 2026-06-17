// GET  /api/clientes/[id]/anotacoes — notes timeline + derived collection state.
// POST /api/clientes/[id]/anotacoes — append a free note (autor = session).
import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { anotarCliente, getCobrancaCliente } from "@/lib/clientes/cobranca"
import { anotacaoCreateSchema } from "@/lib/clientes/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  return NextResponse.json(await getCobrancaCliente(parseId(id)))
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const autor = (await sessionEmail()) ?? "sistema"
  return runMutation(() => anotarCliente(parseId(id), { ...parseBody(anotacaoCreateSchema, body), autor }), {
    action: "cliente.anotar",
    entity: "ClienteAnotacao",
    entityId: id,
    payload: body,
  })
}
