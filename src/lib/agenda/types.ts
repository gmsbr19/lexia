// Agenda — canonical string-union "enums" + view-model shapes shared between
// the query layer (server) and the future calendar UI (client).
import type { IdNome, SocioConta } from "@/lib/finance/types"

export const EVENTO_TIPOS = ["audiencia", "prazo", "reuniao", "outro"] as const
export type EventoTipo = (typeof EVENTO_TIPOS)[number]

export const EVENTO_STATUS = ["confirmado", "cancelado"] as const
export type EventoStatus = (typeof EVENTO_STATUS)[number]

export interface EventoRow {
  id: number
  titulo: string
  tipo: EventoTipo
  inicio: string // ISO datetime
  fim: string | null // ISO datetime
  diaInteiro: boolean
  local: string | null // physical place OR video-call link
  descricao: string | null
  status: EventoStatus
  responsavelId: number | null // registered User
  responsavel: string | null
  clienteId: number | null
  cliente: string | null
  casoId: number | null
  caso: string | null
}

/** A Tarefa with a scheduled `data` — shown on the calendar as a secondary item. */
export interface AgendaTarefaRow {
  id: number
  titulo: string
  data: string // ISO date ("YYYY-MM-DD")
  hora: string | null // "HH:MM"
  prazo: string | null // ISO date
  status: string
  prio: number
  responsavelId: number | null
  casoId: number | null
  caso: string | null
  clienteId: number | null
  cliente: string | null
}

/** Single server fetch powering the Agenda page (eventos + scheduled tarefas + pickers). */
export interface AgendaDataset {
  eventos: EventoRow[]
  tarefas: AgendaTarefaRow[]
  socios: SocioConta[]
  clientes: IdNome[]
  casos: IdNome[]
}
