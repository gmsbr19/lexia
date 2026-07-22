// Processos & Casos — canonical string-union "enums" + view-model shapes shared
// between the query layer (server) and the future UI (client). The DB columns are
// plain String; mutations clamp unknown values to a default (see mutations.ts).
import type { FaixaUrgencia, EstadoPrazo } from "./urgencia"

// ── unions ───────────────────────────────────────────────────────────────────
export const PROCESSO_STATUS = ["ativo", "suspenso", "arquivado", "baixado"] as const
export type ProcessoStatus = (typeof PROCESSO_STATUS)[number]

export const SISTEMAS = ["pje", "esaj", "projudi", "eproc", "outro"] as const
export type Sistema = (typeof SISTEMAS)[number]

export const PARTE_TIPOS = ["pf", "pj"] as const
export type ParteTipo = (typeof PARTE_TIPOS)[number]

export const PARTE_PAPEIS = ["autor", "reu", "terceiro", "assistente", "mp", "perito", "outro"] as const
export type PartePapel = (typeof PARTE_PAPEIS)[number]

export const POLOS = ["ativo", "passivo", "outro"] as const
export type Polo = (typeof POLOS)[number]

export const FONTES_ANDAMENTO = ["pje", "dje", "datajud", "esaj", "projudi", "manual"] as const
export type FonteAndamento = (typeof FONTES_ANDAMENTO)[number]

export const TRIAGEM_STATUS = ["pendente", "triada", "descartada"] as const
export type TriagemStatus = (typeof TRIAGEM_STATUS)[number]

// Fila de revisão de andamentos capturados (por processo): 'novo' = aguarda revisão.
export const REVISAO_STATUS = ["novo", "revisado"] as const
export type RevisaoStatus = (typeof REVISAO_STATUS)[number]

export const PRAZO_ORIGENS = ["intimacao", "andamento", "manual"] as const
export type PrazoOrigem = (typeof PRAZO_ORIGENS)[number]

// 'proposto' = rascunho gerado pela IA, aguardando confirmação humana. NÃO conta
// como prazo real (não notifica / não entra na agenda / não é "pendente") até confirmar.
export const PRAZO_STATUS = ["proposto", "pendente", "cumprido", "perdido", "cancelado"] as const
export type PrazoStatus = (typeof PRAZO_STATUS)[number]

export const TIPOS_CONTAGEM = ["uteis", "corridos"] as const
export type TipoContagem = (typeof TIPOS_CONTAGEM)[number]

export const NATUREZAS_LEGAIS = [
  "honorario_contratual",
  "honorario_exito",
  "sucumbencia",
  "custa",
  "despesa_reembolsavel",
] as const
export type NaturezaLegal = (typeof NATUREZAS_LEGAIS)[number]

export const DOC_TIPOS = ["peticao", "contrato", "procuracao", "prova", "outro"] as const
export type DocTipo = (typeof DOC_TIPOS)[number]

export const NOTIF_TIPOS = ["prazo", "compromisso", "publicacao", "tarefa"] as const
export type NotifTipo = (typeof NOTIF_TIPOS)[number]

export const FERIADO_ABRANGENCIAS = ["nacional", "estadual", "forense", "municipal"] as const
export type FeriadoAbrangencia = (typeof FERIADO_ABRANGENCIAS)[number]

// ── view-models ────────────────────────────────────────────────────────────────
export interface ProcessoRow {
  id: number
  casoId: number
  caso: string | null
  numeroCnj: string | null
  classe: string | null
  assunto: string | null
  status: ProcessoStatus
  faseAtual: string | null
  instancia: string | null
  vara: string | null
  comarca: string | null
  tribunal: string | null
  uf: string | null
  sistema: Sistema | null
  segredoJustica: boolean
  valorCausaCents: number
  dataDistribuicao: string | null // ISO date
  responsavelUserId: number | null
  responsavel: string | null
  prazosPendentes: number
  proximaDataFatal: string | null // ISO date
  createdAt: string
}

export interface ParteRow {
  id: number // ParteProcesso id
  parteId: number
  nome: string
  tipo: ParteTipo
  documento: string | null
  papel: PartePapel
  polo: Polo
  ehCliente: boolean
  clienteId: number | null
}

export interface AndamentoRow {
  id: number
  data: string // ISO date
  tipo: string | null
  descricao: string
  fonte: FonteAndamento
  relevante: boolean
  prazoId: number | null
}

export interface PublicacaoRow {
  id: number
  processoId: number | null
  processo: string | null
  numeroCnj: string | null
  dataDisponibilizacao: string | null // ISO date
  dataPublicacao: string | null // ISO date
  diario: string | null
  conteudo: string
  numeroProcessoBruto: string | null
  statusTriagem: TriagemStatus
  prazoId: number | null
  createdAt: string
}

export interface UrgenciaView {
  estado: EstadoPrazo
  faixa: FaixaUrgencia
  diasRestantes: number
}

export interface PrazoRow {
  id: number
  processoId: number
  numeroCnj: string | null
  caso: string | null
  descricao: string
  tipo: string | null
  origem: PrazoOrigem
  tipoContagem: TipoContagem
  quantidadeDias: number
  dataPublicacao: string | null // ISO date
  dataInicio: string // ISO date
  dataFatal: string // ISO date
  dataInterna: string | null // ISO date
  diasMargem: number
  status: PrazoStatus
  responsavelUserId: number | null
  responsavel: string | null
  cumpridoEm: string | null // ISO date
  urgencia: UrgenciaView | null // derived; null once cumprido/cancelado
}

export interface AnotacaoRow {
  id: number
  autor: string
  conteudo: string
  interno: boolean
  createdAt: string
}

export interface DocumentoVersaoRow {
  id: number
  versao: number
  nome: string | null
  formato: string | null
  tamanho: number | null
  mimeType: string | null
  criadoPor: string | null
  createdAt: string
}

/** Lean processo doc reference embedded in the caso detail. */
export interface ProcessoMini {
  id: number
  numeroCnj: string | null
  classe: string | null
  status: ProcessoStatus
  vara: string | null
  tribunal: string | null
  prazosPendentes: number
  proximaDataFatal: string | null
}

/** Single fetch powering the processo detail screen. */
export interface ProcessoDetail extends ProcessoRow {
  /** Cliente principal (via o caso) — exibido no cabeçalho da ficha. */
  clienteId: number | null
  cliente: { id: number; nome: string } | null
  partes: ParteRow[]
  andamentos: AndamentoRow[]
  prazos: PrazoRow[]
  publicacoes: PublicacaoRow[]
  anotacoes: AnotacaoRow[]
  documentos: DocumentoVersaoRefRow[]
  /** Omitted (null) for roles without finance access (estagiário). */
  financeiro: ProcessoFinanceiro | null
}

export interface ProcessoHonorarioRow {
  id: number
  descricao: string
  valorCents: number
  status: string | null
}

/** One card in the "Movimentos a revisar" inbox — a processo with new captured movements. */
export interface MovimentoInboxRow {
  processoId: number
  numeroCnj: string | null
  caso: string | null
  cliente: string | null
  totalNovos: number
  temRelevante: boolean
  ultimaData: string | null
  exemplos: string[]
}

export interface DocumentoVersaoRefRow {
  id: number
  nome: string
  tipo: string | null
  status: string
  formato: string | null
  versoes: number
  createdAt: string
}

export interface ProcessoFinanceiro {
  recebidoCents: number
  abertoCents: number
  lancamentos: ProcessoLancamentoRow[]
  /** Honorários (fee-lançamentos) conectados a este processo (via Lancamento.processoId). */
  honorarios: ProcessoHonorarioRow[]
}

export interface ProcessoLancamentoRow {
  id: number
  dir: "in" | "out"
  desc: string
  valorCents: number
  naturezaLegal: NaturezaLegal | null
  venc: string | null // ISO
  pago: boolean
}

// ── dashboard ──────────────────────────────────────────────────────────────────
export interface DashboardIndicadores {
  processosAtivos: number
  prazosSemana: number
  audienciasSemana: number
  publicacoesPendentes: number
  prazosVencidos: number
}

export interface DashboardCompromisso {
  id: number
  titulo: string
  tipo: string
  inicio: string // ISO datetime
  local: string | null
  caso: string | null
}

export interface DashboardTarefa {
  id: number
  titulo: string
  status: string
  prio: number
  prazo: string | null // ISO date
}

export interface DashboardData {
  hoje: string // ISO date (São Paulo)
  indicadores: DashboardIndicadores
  prazos: PrazoRow[] // upcoming/overdue, urgency-sorted
  audienciasHoje: DashboardCompromisso[]
  tarefasPendentes: DashboardTarefa[]
  publicacoesPendentes: PublicacaoRow[]
}

// ── ingestion port (DTOs) ──────────────────────────────────────────────────────
export interface AndamentoExterno {
  numeroCnj?: string | null
  oab?: string | null
  data: string // ISO
  tipo?: string | null
  descricao: string
  fonte?: string
  relevante?: boolean
  externalId?: string | null
}

export interface PublicacaoExterna {
  numeroCnj?: string | null
  oab?: string | null
  dataDisponibilizacao?: string | null
  dataPublicacao?: string | null
  diario?: string | null
  conteudo: string
  externalId?: string | null
}

export interface IngestaoResultado {
  andamentosCriados: number
  andamentosIgnorados: number // duplicates (by externalId)
  publicacoesCriadas: number
  publicacoesIgnoradas: number
  semVinculo: number // arrived without a matching processo
}
