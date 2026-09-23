// GET    /api/tarefas/[id] — a tarefa + histórico + anexos (abrir o detalhe).
// PATCH  /api/tarefas/[id] — título, descrição, projeto (remove ligações e zera o
//        grupo), grupo, responsável, cliente, prazo fatal, repetição.
// DELETE /api/tarefas/[id] — exclui (reversível pelo "Desfazer").
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { atualizarTarefa, excluirTarefa } from "@/lib/tarefas/mutations"
import { getTarefa, getTarefaDetalhe } from "@/lib/tarefas/queries"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { tarefaPatchSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const id = Number((await ctx.params).id)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "id inválido" }, { status: 400 })
  const tarefa = await getTarefa(id)
  if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
  return NextResponse.json({ tarefa, ...(await getTarefaDetalhe(id)) })
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.atualizar", entityId: id, payload: body }, (ator) =>
    atualizarTarefa(parseId(id), parseBody(tarefaPatchSchema, body), ator),
  )
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return mutacaoTarefa(req, { action: "tarefa.excluir", entityId: id }, (ator) => excluirTarefa(parseId(id), ator))
}
