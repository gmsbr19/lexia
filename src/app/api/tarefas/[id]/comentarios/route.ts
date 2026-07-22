// GET  /api/tarefas/[id]/comentarios — lista os comentários da tarefa.
// POST /api/tarefas/[id]/comentarios — adiciona um comentário (autor = sessão).
import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { criarComentario, listarComentarios } from "@/lib/tarefas/comentarios"
import { comentarioCreateSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"
import { resolveRequestOrigin, withRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  return NextResponse.json(await listarComentarios(parseId(id)))
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  // withRequestOrigin: o e-mail fire-and-forget do trigger precisa do origin no
  // async-context p/ montar a URL absoluta do botão "Abrir tarefa".
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(() => criarComentario(parseId(id), parseBody(comentarioCreateSchema, body), actor), {
      action: "tarefa.comentario.criar",
      entity: "TarefaComentario",
      entityId: id,
      payload: body,
    }),
  )
}
