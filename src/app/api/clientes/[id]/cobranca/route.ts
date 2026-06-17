// POST /api/clientes/[id]/cobranca — set the collection directive for a cliente.
// Body { acao: 'pausar' | 'suspender' | 'retomar', ... }. Each directive is a
// dated note; the plano de ação derives the effective state. autor = session.
import { NextResponse } from "next/server"
import { sessionEmail } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { pausarCobranca, retomarCobranca, suspenderCobranca } from "@/lib/clientes/cobranca"
import { cobrancaPausarSchema, cobrancaRetomarSchema, cobrancaSuspenderSchema } from "@/lib/clientes/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const cid = parseId(id)
  const body = await readJson(req)
  const autor = (await sessionEmail()) ?? "sistema"

  if (body.acao === "pausar") {
    return runMutation(() => pausarCobranca(cid, { ...parseBody(cobrancaPausarSchema, body), autor }), {
      action: "cliente.cobranca.pausar",
      entity: "ClienteAnotacao",
      entityId: id,
      payload: body,
    })
  }
  if (body.acao === "suspender") {
    return runMutation(() => suspenderCobranca(cid, { ...parseBody(cobrancaSuspenderSchema, body), autor }), {
      action: "cliente.cobranca.suspender",
      entity: "ClienteAnotacao",
      entityId: id,
      payload: body,
    })
  }
  if (body.acao === "retomar") {
    return runMutation(() => retomarCobranca(cid, { ...parseBody(cobrancaRetomarSchema, body), autor }), {
      action: "cliente.cobranca.retomar",
      entity: "ClienteAnotacao",
      entityId: id,
      payload: body,
    })
  }
  return NextResponse.json({ error: "ação inválida (use pausar, suspender ou retomar)" }, { status: 400 })
}
