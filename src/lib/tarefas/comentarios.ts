// Comentários de tarefa — read + write layer. SERVER ONLY. Autor = usuário da
// sessão (User FK). Leitura/edição/exclusão são ESCOPADAS ao `tarefaId` (anti-IDOR:
// um id de comentário da tarefa A não é atingível pela URL da tarefa B). As
// mutações recebem `actorEmail` (da rota) e a criação dispara a notificação
// fire-and-forget (uma falha de notificação nunca quebra o comentário).
import { ForbiddenError } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { userIdPorEmail, usuarioPorEmail } from "@/lib/notificacoes/recipients"
import { notificarComentarioTarefa } from "@/lib/notificacoes/triggers"
import type { ComentarioRow } from "./comentario-core"

const SELECT = {
  id: true,
  autorId: true,
  conteudo: true,
  editadoEm: true,
  createdAt: true,
} as const

function toRow(r: {
  id: number
  autorId: number
  conteudo: string
  editadoEm: Date | null
  createdAt: Date
}): ComentarioRow {
  return {
    id: r.id,
    autorId: r.autorId,
    conteudo: r.conteudo,
    editado: r.editadoEm != null,
    createdAt: r.createdAt.toISOString(),
  }
}

/** Lista os comentários vivos (mais antigos primeiro = ordem de conversa). */
export async function listarComentarios(tarefaId: number): Promise<ComentarioRow[]> {
  const rows = await prisma.tarefaComentario.findMany({
    where: { tarefaId, excluidoEm: null },
    orderBy: { createdAt: "asc" },
    select: SELECT,
  })
  return rows.map(toRow)
}

export interface ComentarioInput {
  conteudo: string
}

export async function criarComentario(
  tarefaId: number,
  input: ComentarioInput,
  actorEmail?: string | null,
): Promise<ComentarioRow> {
  const conteudo = input.conteudo.trim()
  if (!conteudo) throw new UserError("O comentário não pode ficar vazio")
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: tarefaId },
    select: { id: true, titulo: true, responsavelId: true, criadoPorId: true },
  })
  if (!tarefa) throw new UserError("Tarefa não encontrada")
  const autorId = await userIdPorEmail(actorEmail)
  if (!autorId) throw new UserError("Usuário não encontrado")

  const criado = await prisma.tarefaComentario.create({
    data: { tarefaId, autorId, conteudo },
    select: SELECT,
  })

  // Envolvidos + mencionados são avisados (nunca o autor). Fire-and-forget.
  void notificarComentarioTarefa({
    tarefaId: tarefa.id,
    titulo: tarefa.titulo,
    conteudo,
    autorId,
    responsavelId: tarefa.responsavelId,
    criadoPorId: tarefa.criadoPorId,
    actorEmail,
  })
  return toRow(criado)
}

export async function editarComentario(
  tarefaId: number,
  comentarioId: number,
  input: ComentarioInput,
  actorEmail?: string | null,
): Promise<ComentarioRow> {
  const conteudo = input.conteudo.trim()
  if (!conteudo) throw new UserError("O comentário não pode ficar vazio")
  const atorId = await userIdPorEmail(actorEmail)
  const row = await prisma.tarefaComentario.findFirst({
    where: { id: comentarioId, tarefaId, excluidoEm: null },
    select: { id: true, autorId: true },
  })
  if (!row) throw new UserError("Comentário não encontrado")
  if (row.autorId !== atorId) throw new ForbiddenError() // só o autor edita
  const atualizado = await prisma.tarefaComentario.update({
    where: { id: row.id },
    data: { conteudo, editadoEm: new Date() },
    select: SELECT,
  })
  return toRow(atualizado)
}

export async function excluirComentario(
  tarefaId: number,
  comentarioId: number,
  actorEmail?: string | null,
): Promise<{ id: number }> {
  const ator = await usuarioPorEmail(actorEmail)
  const row = await prisma.tarefaComentario.findFirst({
    where: { id: comentarioId, tarefaId, excluidoEm: null },
    select: { id: true, autorId: true },
  })
  if (!row) throw new UserError("Comentário não encontrado")
  // Autor OU gestor (admin/sócio) — os demais não excluem.
  const podeGerir =
    !!ator && (row.autorId === ator.id || ator.role === "admin" || ator.role === "socio")
  if (!podeGerir) throw new ForbiddenError()
  await prisma.tarefaComentario.update({
    where: { id: row.id },
    data: { excluidoEm: new Date() },
  })
  return { id: row.id }
}
