import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { getDocumento } from "@/lib/documentos/queries"
import { deleteDocumento, updateDocumento } from "@/lib/documentos/mutations"
import { documentoPatchSchema } from "@/lib/documentos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/documentos/[id] — detail incl. the editor payload. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied

  const { id } = await ctx.params
  const doc = await getDocumento(Number(id))
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateDocumento(parseId(id), parseBody(documentoPatchSchema, body)), {
    action: "documento.editar",
    entity: "Documento",
    entityId: id,
    payload: { ...body, payload: undefined },
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteDocumento(parseId(id)), {
    action: "documento.excluir",
    entity: "Documento",
    entityId: id,
  })
}
