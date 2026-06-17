// Agenda — read layer. SERVER ONLY. The calendar aggregates two item kinds:
// Evento rows (audiência/prazo/reunião/outro) + Tarefa rows that carry `data`.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getCasoOptions, getClienteOptions } from "@/lib/finance/queries"
import { getUsuariosAtivos } from "@/lib/users/queries"
import type { AgendaDataset, AgendaTarefaRow, EventoRow, EventoStatus, EventoTipo } from "./types"

const isoDate = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null)

/** "YYYY-MM-DD" → local Date (start/end of day); null when absent/invalid. */
function rangeDate(input: string | undefined, endOfDay: boolean): Date | null {
  if (!input) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return d
}

export interface EventoFiltro {
  de?: string // "YYYY-MM-DD" inclusive
  ate?: string // "YYYY-MM-DD" inclusive
  clienteId?: number
  casoId?: number
}

const EVENTO_SELECT = {
  id: true,
  titulo: true,
  tipo: true,
  dataInicio: true,
  dataFim: true,
  diaInteiro: true,
  local: true,
  descricao: true,
  status: true,
  responsavelId: true,
  clienteId: true,
  casoId: true,
  responsavel: { select: { nome: true } },
  cliente: { select: { nome: true } },
  caso: { select: { titulo: true } },
} satisfies Prisma.EventoSelect

type EventoRecord = Prisma.EventoGetPayload<{ select: typeof EVENTO_SELECT }>

function toEventoRow(r: EventoRecord): EventoRow {
  return {
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo as EventoTipo,
    inicio: r.dataInicio.toISOString(),
    fim: r.dataFim ? r.dataFim.toISOString() : null,
    diaInteiro: r.diaInteiro,
    local: r.local,
    descricao: r.descricao,
    status: r.status as EventoStatus,
    responsavelId: r.responsavelId,
    responsavel: r.responsavel ? r.responsavel.nome : null,
    clienteId: r.clienteId,
    cliente: r.cliente?.nome ?? null,
    casoId: r.casoId,
    caso: r.caso?.titulo ?? null,
  }
}

export async function listEventos(filtro: EventoFiltro = {}): Promise<EventoRow[]> {
  const de = rangeDate(filtro.de, false)
  const ate = rangeDate(filtro.ate, true)
  const where: Prisma.EventoWhereInput = {}
  if (de || ate) where.dataInicio = { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) }
  if (filtro.clienteId) where.clienteId = filtro.clienteId
  if (filtro.casoId) where.casoId = filtro.casoId
  const rows = await prisma.evento.findMany({ where, select: EVENTO_SELECT, orderBy: { dataInicio: "asc" } })
  return rows.map(toEventoRow)
}

/** Tarefas with a scheduled `data` inside the range — the calendar's secondary items. */
export async function listTarefasAgendadas(de?: string, ate?: string): Promise<AgendaTarefaRow[]> {
  const deD = rangeDate(de, false)
  const ateD = rangeDate(ate, true)
  const rows = await prisma.tarefa.findMany({
    where: { data: { not: null, ...(deD ? { gte: deD } : {}), ...(ateD ? { lte: ateD } : {}) } },
    select: {
      id: true,
      titulo: true,
      data: true,
      hora: true,
      prazo: true,
      status: true,
      prio: true,
      responsavelId: true,
      casoId: true,
      clienteId: true,
      caso: { select: { titulo: true } },
      cliente: { select: { nome: true } },
    },
    orderBy: { data: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    data: isoDate(r.data) ?? "",
    hora: r.hora,
    prazo: isoDate(r.prazo),
    status: r.status,
    prio: r.prio,
    responsavelId: r.responsavelId,
    casoId: r.casoId,
    caso: r.caso?.titulo ?? null,
    clienteId: r.clienteId,
    cliente: r.cliente?.nome ?? null,
  }))
}

/** Single server fetch powering the Agenda page. */
export async function getAgendaDataset(de?: string, ate?: string): Promise<AgendaDataset> {
  const [eventos, tarefas, usuarios, clientes, casos] = await Promise.all([
    listEventos({ de, ate }),
    listTarefasAgendadas(de, ate),
    getUsuariosAtivos(),
    getClienteOptions(),
    getCasoOptions(),
  ])
  // The agenda "responsável" picker reuses the SocioConta shape, now fed by the
  // active registered users (ordem = list position).
  const socios = usuarios.map((u, i) => ({ id: u.id, nome: u.nome, ordem: i }))
  return { eventos, tarefas, socios, clientes, casos }
}
