import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { getClienteDetail } from "@/lib/clientes/queries"
import { updateCliente } from "@/lib/clientes/mutations"
import { clientePatchSchema } from "@/lib/clientes/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/clientes/[id] — header + resumo + every tab of the cliente page. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied

  const { id } = await ctx.params
  const detail = await getClienteDetail(Number(id))
  if (!detail) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  return NextResponse.json(detail)
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateCliente(parseId(id), parseBody(clientePatchSchema, body)), {
    action: "cliente.editar",
    entity: "Cliente",
    entityId: id,
    payload: body,
  })
}
