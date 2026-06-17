import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { deleteHonorario, updateHonorario } from "@/lib/finance/mutations"
import { getHonorarioDetail } from "@/lib/finance/queries"
import { honorarioPatchSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/financeiro/honorarios/[id] — contrato detail + série de parcelas. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied

  const { id } = await ctx.params
  const detail = await getHonorarioDetail(Number(id))
  if (!detail) return NextResponse.json({ error: "Honorário não encontrado" }, { status: 404 })
  return NextResponse.json(detail)
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateHonorario(parseId(id), parseBody(honorarioPatchSchema, body)), {
    action: "honorario.editar",
    entity: "Honorario",
    entityId: id,
    payload: body,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteHonorario(parseId(id)), {
    action: "honorario.excluir",
    entity: "Honorario",
    entityId: id,
  })
}
