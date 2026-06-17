// Clientes — view-model shapes for the individual cliente page (header + tabs).
// Reuses the finance/agenda/documentos row types so the tabs match the
// module screens 1:1.
import type { DocumentoRow } from "@/lib/documentos/types"
import type { EventoRow } from "@/lib/agenda/types"
import type {
  CasoTipo,
  Classificacao,
  ClienteTipo,
  HonorarioRow,
  LancamentoRow,
} from "@/lib/finance/types"
import type { ProcessoMini } from "@/lib/processos/types"
import type { AnotacaoRow, EstadoCobranca } from "./cobranca-core"

export interface ClienteHeader {
  id: number
  nome: string
  apelido: string | null
  tipo: ClienteTipo
  classificacao: Classificacao
  cpfCnpj: string | null
  simplesNacional: boolean
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  emails: string[]
  telefones: string[]
}

export interface ClienteResumo {
  casosAtivos: number
  casosTotal: number
  recebidoCents: number // paid 'in' lançamentos of this cliente (all time)
  aReceberCents: number // open 'in' lançamentos
  vencidoCents: number // open 'in' lançamentos past due
}

export interface ClienteCasoRow {
  id: number
  titulo: string
  tipo: CasoTipo
  status: string | null
  responsavel: string | null
  honorariosCents: number
  honorariosCount: number
  processos: ProcessoMini[] // judicial processos hanging off this caso
}

export interface ClienteTarefaRow {
  id: number
  titulo: string
  status: string
  prio: number
  data: string | null // ISO date
  hora: string | null
  prazo: string | null // ISO date
  responsavelId: number | null
}

/** Single server fetch powering the cliente page (header + every tab). */
export interface ClienteDetail {
  header: ClienteHeader
  resumo: ClienteResumo
  lancamentos: LancamentoRow[]
  honorarios: HonorarioRow[]
  casos: ClienteCasoRow[]
  tarefas: ClienteTarefaRow[]
  eventos: EventoRow[]
  documentos: DocumentoRow[]
  /** Notes timeline (free context + collection directives) the AI/UI read. */
  anotacoes: AnotacaoRow[]
  /** Derived collection state (ativo / pausado até X / não cobrar). */
  cobranca: EstadoCobranca
}
