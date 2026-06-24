import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteTimbrado, getTimbrado, updateTimbrado } from "@/lib/documentos/timbrados"
import { timbradoPatchSchema } from "@/lib/documentos/schemas"
import { ROLES_DOC_GESTAO } from "@/lib/documentos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/documentos/timbrados/:id — detail incl. the data-URL image. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  const t = await getTimbrado(parseId(id))
  if (!t) return NextResponse.json({ error: "Timbrado não encontrado" }, { status: 404 })
  return NextResponse.json(t)
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateTimbrado(parseId(id), parseBody(timbradoPatchSchema, body)), {
    action: "timbrado.editar",
    entity: "Timbrado",
    entityId: id,
    payload: { ...body, imagem: undefined },
    roles: ROLES_DOC_GESTAO,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteTimbrado(parseId(id)), {
    action: "timbrado.excluir",
    entity: "Timbrado",
    entityId: id,
    roles: ROLES_DOC_GESTAO,
  })
}
