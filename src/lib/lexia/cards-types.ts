// LexIA chat — payload shapes for the automatic answer surfaces: entity cards,
// the search-results card, and the data-viz insight card (Fase 3 emits these
// from tool results; components/lexia/cards render them), plus the citable
// "fonte" and reasoning-summary shapes persisted on LexiaMensagem.meta (Fase 6).
// Pure module — safe on client and server. Field names mirror the existing
// SearchXxxHit shapes in src/lib/search.ts so Fase 3's tool→card mapping is a
// straight projection, not a re-derivation.

export type CardKind = "cliente" | "lead" | "lancamento" | "honorario" | "tarefa" | "processo" | "evento"

export interface CardClienteData {
  id: number
  nome: string
  tipo: string // "pf" | "pj"
  /** Estado de cobrança (src/lib/clientes/cobranca-core.ts CobrancaStatus). */
  status?: "ativo" | "pausado" | "suspenso"
  cidade?: string | null
  uf?: string | null
  numCasos?: number
  telefone?: string | null
  email?: string | null
}

export interface CardLeadData {
  id: number
  nome: string
  estagio: "novo" | "contato" | "qualificado" | "proposta" | "ganho" | "perdido"
  origem?: string | null
  valorCents?: number | null
}

export interface CardLancamentoData {
  id: number
  desc: string
  dir: "in" | "out"
  valorCents: number
  venc?: string | null // ISO
  pago: boolean
}

export interface CardHonorarioData {
  id: number
  descricao: string
  cliente?: string | null
  valorCents: number
  /** Presente habilita a barra CcPayProgress (total, pago). */
  valorPagoCents?: number
  status?: string | null
}

export interface CardTarefaData {
  id: number
  titulo: string
  status: string
  prio?: number
  prazo?: string | null // ISO
  responsavel?: string | null
}

export interface CardProcessoData {
  id: number
  /** Presente quando o card representa um CASO (matéria) em vez de um Processo CNJ. */
  titulo?: string | null
  numeroCnj?: string | null
  classe?: string | null
  caso?: string | null
  status: string
  /** Dias CORRIDOS até o prazo mais próximo (proximaDataFatal) — alimenta o
   * CcUrgencyBanner. Corridos, não úteis: o contexto CPC (feriados) não é
   * carregado aqui — nunca rotular como "dias úteis" (ver ccUrgency). */
  diasPrazo?: number | null
}

export interface CardEventoData {
  id: number
  titulo: string
  data: string // ISO
  local?: string | null
}

/** Mapa kind → shape do `data` (uso em tipos genéricos por kind). */
export interface CardDataByKind {
  cliente: CardClienteData
  lead: CardLeadData
  lancamento: CardLancamentoData
  honorario: CardHonorarioData
  tarefa: CardTarefaData
  processo: CardProcessoData
  evento: CardEventoData
}

/** União de todos os shapes de `data` — para componentes genéricos por kind. */
export type CardEntityData = CardDataByKind[CardKind]

export type CardVariant = "row" | "detail"

export interface EntityCardPayload<K extends CardKind = CardKind> {
  type: "entity"
  kind: K
  variant: CardVariant
  rota?: string
  data: CardDataByKind[K]
}

export interface EntityListCardPayload<K extends CardKind = CardKind> {
  type: "entity-list"
  kind: K
  /** Rota "ver todos" quando a lista foi truncada (cap ~6 linhas). */
  rota?: string
  itens: CardDataByKind[K][]
  truncado?: boolean
}

export interface SearchCardGroup {
  label: string
  kind: CardKind
  itens: CardDataByKind[CardKind][]
}

export interface SearchCardPayload {
  type: "search"
  query: string
  grupos: SearchCardGroup[]
}

export type InsightSeries =
  | { variant: "progress-compare"; a: number; b: number; aLabel: string; bLabel: string }
  | { variant: "sparkline"; pontos: number[]; labels?: string[] }
  | { variant: "funnel"; estagio: CardLeadData["estagio"] }

export interface InsightCardPayload {
  type: "insight"
  titulo: string
  icone?: string
  series: InsightSeries
}

export type CardPayload = EntityCardPayload | EntityListCardPayload | SearchCardPayload | InsightCardPayload

/** Uma fonte citável (publicação/andamento/contrato/lançamento/documento) — Fase 6. */
export interface Fonte {
  tipo: "publicacao" | "andamento" | "contrato" | "lancamento" | "documento"
  titulo: string
  rota: string
  detalhe?: string
}

/** Resumo do raciocínio (extended thinking) de um turno — Fase 6. */
export interface PensamentoMeta {
  resumo: string
  duracaoMs: number
}

/** Metadados extras de uma mensagem assistant, persistidos em LexiaMensagem.meta (JSON). */
export interface MsgMeta {
  thinking?: PensamentoMeta
  fontes?: Fonte[]
  /** Cortada por limite de tamanho (stop_reason max_tokens); oferece "Continuar". */
  truncada?: boolean
  /** Interrompida pelo usuário (botão Parar/aborto); oferece "Retomar". */
  interrompida?: boolean
  /** Chips de próxima ação sugeridos ao fim do turno. */
  followups?: string[]
  /** Esta linha é a continuação de uma resposta cortada — renderiza colada, sem Orb/gap. */
  continuacao?: boolean
}
