import { NextResponse } from "next/server"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { getConversa } from "@/lib/lexia/queries"
import { excluirConversa, fixarConversa, renomearConversa } from "@/lib/lexia/mutations"
import { conversaPatchSchema } from "@/lib/lexia/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/lexia/conversas/[id] — full thread (owner only). */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const conversa = await getConversa(Number(id), user.email)
    if (!conversa) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    return NextResponse.json(conversa)
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const user = await requireUser()
      const patch = parseBody(conversaPatchSchema, body)
      const acaoId = parseId(id)
      if (patch.fixada !== undefined) await fixarConversa(acaoId, user.email, patch.fixada)
      if (patch.titulo !== undefined) return renomearConversa(acaoId, user.email, patch.titulo)
      return { id: acaoId, fixada: patch.fixada }
    },
    { action: "lexia.conversa.editar", entity: "LexiaConversa", entityId: id },
  )
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const user = await requireUser()
      return excluirConversa(parseId(id), user.email)
    },
    { action: "lexia.conversa.excluir", entity: "LexiaConversa", entityId: id },
  )
}
