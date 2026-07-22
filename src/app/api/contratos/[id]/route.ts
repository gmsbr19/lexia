import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { atualizarContrato, excluirContrato } from "@/lib/finance/mutations"
import { getContratoDetail } from "@/lib/finance/queries"
import { contratoPatchSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/contratos/[id] — casos vinculados (com honorários) + documentos + totais. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied

  const { id } = await ctx.params
  const detail = await getContratoDetail(Number(id))
  if (!detail) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 })
  return NextResponse.json(detail)
}

/** PATCH /api/contratos/[id] — editar dados + vincular/desvincular casos. */
export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => atualizarContrato(parseId(id), parseBody(contratoPatchSchema, body)), {
    action: "contrato.editar",
    entity: "Contrato",
    entityId: id,
    payload: body,
    roles: ["socio", "financeiro"],
  })
}

/** DELETE /api/contratos/[id] — soft-delete; casos/documentos vinculados só desvinculam. */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => excluirContrato(parseId(id)), {
    action: "contrato.excluir",
    entity: "Contrato",
    entityId: id,
    roles: ["socio"],
  })
}
