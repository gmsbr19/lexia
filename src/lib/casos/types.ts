// Casos — view-model shapes for the casos list + caso page (identidade +
// financeiro + rateio + vínculos). Reuses the finance/agenda row types.
import type { EventoRow } from "@/lib/agenda/types"
import type { CasoResponsavelInfo, CasoTipo, HonorarioRow, LancamentoRow } from "@/lib/finance/types"
import type { ProcessoMini } from "@/lib/processos/types"
import type { LancOptions } from "@/components/financeiro/interativo/NovoLancamentoModal"
import type { InformacaoRow } from "@/lib/informacoes/core"

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
  prazoFatal: boolean
  prazo: string // ISO date (toda tarefa tem prazo)
  responsavelId: number | null
}

export interface CasoFinanceiro {
  recebidoCents: number // paid 'in' lançamentos of this caso
  abertoCents: number // open 'in' lançamentos
  honorarios: HonorarioRow[]
  lancamentos: LancamentoRow[]
}

/** Row da lista /casos (grade). Financeiro zerado para quem não vê finanças. */
export interface CasoPageRow {
  id: number
  titulo: string
  nomeCurto: string | null // etiqueta no quadro de Tarefas
  prazo: string | null // prazo final do trabalho (ISO date)
  tarefasTotal: number
  tarefasFeitas: number
  tarefasAbertas: number
  tarefasVencidas: number
  tipo: CasoTipo
  area: string | null
  status: string | null
  clienteId: number | null
  cliente: string | null
  responsavelUserId: number | null
  responsavel: string | null // User estruturado (nome) — senão o rótulo livre do Astrea
  contratoId: number | null
  contrato: string | null // título do contrato (ou "Contrato de dd/mm/aaaa")
  numProcessos: number
  honorariosCents: number // soma dos fee-lançamentos (entrada/honorário)
  recebidoCents: number
  abertoCents: number
  dataCriacao: string | null // ISO date
  ultimaMovimentacao: string | null // ISO date
}

export interface CasoContratoInfo {
  id: number
  titulo: string | null
  dataFechamento: string | null // ISO date
}

/** Single server fetch powering the caso page (/casos/[id]). */
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
  contrato: CasoContratoInfo | null
  dataCriacao: string | null // ISO date
  ultimaMovimentacao: string | null // ISO date
  // etiqueta no quadro de Tarefas (o caso é o "projeto" do quadro)
  nomeCurto: string | null
  cor: string | null
  prazo: string | null // ISO date
  descricao: string | null
  modeloOrigemId: number | null
  // rateio entre sócios
  responsaveis: CasoResponsavelInfo[]
  financeiro: CasoFinanceiro
  tarefas: CasoTarefaRow[]
  eventos: EventoRow[]
  processos: ProcessoMini[]
  documentos: CasoDocumentoRow[]
  /** Notas do caso (as fixadas aparecem nas tarefas do caso). */
  anotacoes: InformacaoRow[]
  /** Informações fixadas do cliente do caso (também aparecem nas tarefas). */
  fixadasCliente: InformacaoRow[]
  /** Opções do formulário de lançamento (só p/ quem vê o Financeiro; a rota preenche). */
  lancOptions?: LancOptions
}

