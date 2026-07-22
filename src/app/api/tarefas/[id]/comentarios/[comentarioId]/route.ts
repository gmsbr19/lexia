// PATCH  /api/tarefas/[id]/comentarios/[comentarioId] — edita (só o autor).
// DELETE /api/tarefas/[id]/comentarios/[comentarioId] — soft-delete (autor OU admin/sócio).
// Escopadas ao `id` da tarefa (anti-IDOR): o mutation resolve a linha com o
// tarefaId no WHERE, então um comentário de outra tarefa não é atingível aqui.
import { sessionEmail } from "@/lib/auth/session"
import { parseId, readJson, runMutation } from "@/lib/finance/api"
import { editarComentario, excluirComentario } from "@/lib/tarefas/comentarios"
import { comentarioEditSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; comentarioId: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const { id, comentarioId } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(
    () =>
      editarComentario(parseId(id), parseId(comentarioId), parseBody(comentarioEditSchema, body), actor),
    { action: "tarefa.comentario.editar", entity: "TarefaComentario", entityId: comentarioId, payload: body },
  )
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id, comentarioId } = await ctx.params
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => excluirComentario(parseId(id), parseId(comentarioId), actor), {
    action: "tarefa.comentario.excluir",
    entity: "TarefaComentario",
    entityId: comentarioId,
  })
}
