// Casos — view-model shapes for the caso detail modal (processo + financeiro +
// rateio + vínculos). Reuses the finance/agenda row types.
import type { EventoRow } from "@/lib/agenda/types"
import type { CasoResponsavelInfo, CasoTipo, HonorarioRow, LancamentoRow } from "@/lib/finance/types"
import type { ProcessoMini } from "@/lib/processos/types"

export interface CasoDocumentoRow {
  id: number
  nome: string
  tipo: string | null
  status: string
  createdAt: string
}

/** Row in the paginated casos list (GET /api/casos). */
export interface CasoListRow {
  id: number
  titulo: string
  tipo: CasoTipo
  area: string | null
  status: string | null
  clienteId: number | null
  cliente: string | null
  responsavelUserId: number | null
  responsavel: string | null
  numProcessos: number
  dataCriacao: string | null
}

export interface CasoTarefaRow {
  id: number
  titulo: string
  status: string
  prio: number
  data: string | null // ISO date
  hora: string | null
  prazo: string | null // ISO date
  responsavelId: number | null
}

export interface CasoFinanceiro {
  recebidoCents: number // paid 'in' lançamentos of this caso
  abertoCents: number // open 'in' lançamentos
  honorarios: HonorarioRow[]
  lancamentos: LancamentoRow[]
}

/** Single server fetch powering the caso modal. */
export interface CasoDetail {
  id: number
  titulo: string
  tipo: CasoTipo
  area: string | null
  status: string | null
  responsavel: string | null // free-text operational responsável (from Astrea)
  responsavelUserId: number | null // structured lead lawyer (User)
  responsavelUser: string | null
  clienteId: number | null
  cliente: string | null
  // dados do processo (editable)
  numeroProcesso: string | null
  tribunal: string | null
  vara: string | null
  instancia: string | null
  tipoAcao: string | null
  valorCausaCents: number | null
  dataDistribuicao: string | null // ISO date
  dataCriacao: string | null // ISO date
  ultimaMovimentacao: string | null // ISO date
  // rateio entre sócios
  responsaveis: CasoResponsavelInfo[]
  financeiro: CasoFinanceiro
  tarefas: CasoTarefaRow[]
  eventos: EventoRow[]
  processos: ProcessoMini[]
  documentos: CasoDocumentoRow[]
}
