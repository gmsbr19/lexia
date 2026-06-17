// Leitura do histórico de notificações (página /notificacoes) + contadores e
// "marcar todas como lidas". SERVER ONLY. O sino usa o listNotificacoes (últimas
// 100) em src/lib/processos/queries.ts; aqui é a visão paginada/filtrável.
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { type ListQuery, paginated, type Paginated } from "@/lib/list"
import { emitNotificacao } from "./bus"
import { type NotificacaoDb, toRow } from "./map"
import type { Modulo, NotificacaoRow } from "./types"

const SELECT = {
  id: true,
  tipo: true,
  modulo: true,
  prioridade: true,
  refTipo: true,
  refId: true,
  mensagem: true,
  link: true,
  actorEmail: true,
  contador: true,
  lida: true,
  createdAt: true,
} satisfies Prisma.NotificacaoSelect

export interface HistoryFiltro {
  modulo?: Modulo
  lida?: boolean
  de?: string // "YYYY-MM-DD" (inclusive)
  ate?: string // "YYYY-MM-DD" (inclusive)
}

function inicioDoDia(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}
function fimDoDia(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

export async function listNotificacoesHistory(
  email: string,
  f: HistoryFiltro,
  q: ListQuery,
): Promise<Paginated<NotificacaoRow>> {
  const where: Prisma.NotificacaoWhereInput = { userEmail: email }
  if (f.modulo) where.modulo = f.modulo
  if (typeof f.lida === "boolean") where.lida = f.lida
  if (f.de || f.ate) {
    where.createdAt = {
      ...(f.de ? { gte: inicioDoDia(f.de) } : {}),
      ...(f.ate ? { lte: fimDoDia(f.ate) } : {}),
    }
  }
  const [rows, total] = await Promise.all([
    prisma.notificacao.findMany({ where, orderBy: { createdAt: q.order }, skip: q.skip, take: q.take, select: SELECT }),
    prisma.notificacao.count({ where }),
  ])
  return paginated(rows.map((r) => toRow(r as NotificacaoDb)), total, q)
}

export async function contarNaoLidas(email: string): Promise<number> {
  return prisma.notificacao.count({ where: { userEmail: email, lida: false } })
}

export async function marcarTodasLidas(email: string): Promise<{ count: number }> {
  const r = await prisma.notificacao.updateMany({
    where: { userEmail: email, lida: false },
    data: { lida: true },
  })
  emitNotificacao(email, { kind: "todasLidas" }) // sincroniza o badge nas outras abas
  return { count: r.count }
}
