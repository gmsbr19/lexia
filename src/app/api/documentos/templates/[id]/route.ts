import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteTemplate, getTemplate, updateTemplate } from "@/lib/documentos/templates"
import { templatePatchSchema } from "@/lib/documentos/schemas"
import { ROLES_DOC_GESTAO } from "@/lib/documentos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/documentos/templates/:id — detail incl. the LexDoc conteudo. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  const t = await getTemplate(parseId(id))
  if (!t) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 })
  return NextResponse.json(t)
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => updateTemplate(parseId(id), parseBody(templatePatchSchema, body)), {
    action: "documento_template.editar",
    entity: "DocumentoTemplate",
    entityId: id,
    payload: { ...body, conteudo: undefined },
    roles: ROLES_DOC_GESTAO,
  })
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => deleteTemplate(parseId(id)), {
    action: "documento_template.excluir",
    entity: "DocumentoTemplate",
    entityId: id,
    roles: ROLES_DOC_GESTAO,
  })
}
