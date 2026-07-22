// Canonical string-union "enums" (SQLite has no native enums) + the view-model
// shapes shared between the query layer (server) and the components (client).
// Everything money-related is integer centavos.

export type ClienteTipo = "pf" | "pj"
export type Classificacao = "cliente" | "lead"
export type CasoTipo = "consultivo" | "litigio"
export type LancamentoTipo = "entrada" | "saida"
export type LancamentoStatus = "feito" | "aberto"
export type LancamentoSubTipo = "honorario" | "avulsa" | "valor_inicial" | "transferencia"
export type HonorarioStatus = "lancado" | "recebido" // recebido == paid (backed by dataPagamento + contaId)
export type ComposicaoBucket = "recorrente" | "parcelado" | "exito" | "avista"
export type CustoCategoria = "pro_labore" | "operacional"
export type ContaOrigem = "astrea" | "manual"
export type ContaKind = "socio" | "banco" | "caixa"

// ── view models ──────────────────────────────────────────────────────────────

export interface Kpis {
  recebidoMesCents: number
  recebidoDeltaPct: number | null // month-over-month
  aReceberCents: number
  aReceberCount: number
  vencidoCents: number
  vencidoClientes: number
  saidasMesCents: number
  margemPct: number | null
  margemDeltaPP: number | null // percentage points vs previous month
}

export interface MonthlyRevenuePoint {
  month: string // "YYYY-MM"
  label: string // "jun/26"
  recebidoCents: number
  aReceberCents: number
  isFuture: boolean
}

export interface CompositionSlice {
  bucket: ComposicaoBucket
  label: string
  valorCents: number
  pct: number
  color: string
}

export interface AgingBucket {
  key: "a_vencer" | "d1_30" | "d31_60" | "d60_plus"
  label: string
  valorCents: number
  count: number
}

export interface ReceivableRow {
  id: number
  descricao: string
  cliente: string | null
  caso: string | null
  vencimento: string | null // ISO date
  valorCents: number
  diasAtraso: number // negative = ainda a vencer
  vencido: boolean
}

export interface DreRow {
  label: string
  valorCents: number
  kind: "receita" | "custo" | "subtotal" | "resultado"
}

export type ProximoPassoTipo = "parcela_vence" | "inadimplente" | "caso_sem_fee" | "prazo" | "briefing"
export type Urgencia = "alta" | "media" | "baixa"

export interface ProximoPassoItem {
  id: string
  tipo: ProximoPassoTipo
  titulo: string
  descricao: string
  valorCents?: number
  urgencia: Urgencia
  href?: string
  cta?: string
  ai?: boolean
  /** Stable key used to persist a dismissal/snooze (see lib/sugestoes/dispensa). */
  chave?: string
}

// ── Início briefing + plano de ação ──────────────────────────────────────────

export interface BriefingPrazo {
  prazoId: number
  processoId: number
  numeroCnj: string | null
  descricao: string
  dataFatal: string // "YYYY-MM-DD"
  responsavel: string | null
  vencido: boolean
}

export interface BriefingData {
  recebidoMesCents: number
  recebidoDeltaPct: number | null // month-over-month
  vencido60Cents: number // overdue > 60 days
  vencido60Clientes: number
  vencidoCents: number // all overdue
  casosSemFee: number
  potencialCents: number // casosSemFee × average honorário (estimate)
  // Litigation deadlines — surfaced with TOP priority in the daily briefing.
  prazosVencidos: number // pendentes com dataFatal < hoje
  prazosHoje: number // dataFatal == hoje
  prazos7Dias: number // dataFatal dentro dos próximos 7 dias (inclui hoje)
  prazosExemplos: BriefingPrazo[] // os mais urgentes (vencidos primeiro), até 6
}

// ── AI daily briefing (Início hero) ──
// A once-a-day Claude synthesis over the office's real operational context,
// cached in AppSetting. `area` maps each highlight to an in-app destination so
// the card can render deep-links; `tom` drives the accent color.
export type BriefingTom = "pos" | "neg" | "neutro" | "gold"
export type BriefingArea =
  | "prazos"
  | "inadimplencia"
  | "casos-sem-fee"
  | "agenda"
  | "tarefas"
  | "caixa"
  | "comercial"
  | "none"

export interface BriefingDestaque {
  texto: string
  tom: BriefingTom
  area: BriefingArea
}

export interface BriefingDiario {
  fonte: "ia" | "deterministico" // 'deterministico' = fallback (no API key / error)
  foco: string // 1–2 sentence headline (no markdown)
  destaques: BriefingDestaque[]
  geradoEm: string // ISO timestamp of generation
  data: string // "YYYY-MM-DD" (America/Sao_Paulo) — the cache day
  dados: BriefingData // the underlying deterministic numbers
}

export type PlanoTone = "vencido" | "gold" | "alerta" | "espera"
export type PlanoPrioridade = "Alta" | "Média" | "Baixa"
export type PlanoIcon =
  | "phone"
  | "mail"
  | "receipt"
  | "fileText"
  | "alertCircle"
  | "calendar"
  | "briefcase"
  | "alertTriangle"
  | "sliders"
  | "trendingDown"
  | "clock"

export interface PlanoStep {
  id: string
  icon: PlanoIcon
  title: string
  ctx: string
  valueCents: number
  valueKind: "recuperar" | "potencial" | null
  priority: PlanoPrioridade
  cta: string
  href: string
  ai: boolean
}

export interface PlanoGroup {
  id: string
  title: string
  desc: string
  icon: PlanoIcon
  tone: PlanoTone
  steps: PlanoStep[]
}

export interface PlanoReason {
  icon: PlanoIcon
  text: string
}

export interface PlanoAcaoData {
  groups: PlanoGroup[]
  reasoning: PlanoReason[]
  totalValueCents: number
  totalSteps: number
}

export interface CasoSemFeeRow {
  id: number
  titulo: string
  cliente: string | null
  clienteId: number | null
  tipo: CasoTipo
  responsavel: string | null
  ultimaMovimentacao: string | null // ISO
  valorCausaCents: number | null
}

export interface ClienteRow {
  id: number
  nome: string
  tipo: ClienteTipo
  classificacao: Classificacao
  cpfCnpj: string | null
  cidade: string | null
  uf: string | null
  numCasos: number
  origem: string | null
}

export interface HonorarioRow {
  id: number
  descricao: string
  cliente: string | null
  clienteId: number | null
  caso: string | null
  casoId: number | null
  vencimento: string | null // ISO
  valorCents: number
  status: HonorarioStatus | null
  tipo: ComposicaoBucket | null
  dataPagamento: string | null // ISO — when it was paid
  contaId: number | null
  conta: string | null // account name (denormalized for display)
  lancamentoId: number | null // settling cash-ledger row
}

/** Commercial lens over a Caso: one contract = one caso (a caso may bundle
 *  several honorários). Powers the /contratos list (área/origem/valor
 *  contratado/pagamento). Distinct from HonorarioRow (the fee ledger). */
export interface ContratoRow {
  id: number // caso id
  titulo: string
  cliente: string | null
  clienteId: number | null
  area: string | null // AreaDireito chave (resolved to label client-side)
  origem: string | null // lead origem key when the contract came from a won lead; null = direto
  tipo: string | null // 'consultivo' | 'litigio'
  statusCaso: string | null
  dataFechamento: string | null // ISO — Caso.dataCriacao (when the case/contract was opened)
  valorContratadoCents: number // Σ honorários vinculados ao caso
  recebidoCents: number // Σ honorários com status 'recebido'
  honorariosCount: number
  casosCount: number // nº de casos NÃO-excluídos sob o contrato
  unicoCasoId: number | null // caso id quando há exatamente 1 (navegação direta); senão null
}

/** Contrato modal: full honorário detail + its série de parcelas. */
export interface HonorarioDetail extends HonorarioRow {
  valorLiquidoCents: number
  responsavel: string | null
  pagamento: string | null
  processoTitulo: string | null
  /** Sibling parcelas of the same série (same cliente+caso+tipo+descrição-base),
   *  ordered by vencimento and INCLUDING this row. Empty for tipos à vista/êxito. */
  serie: HonorarioRow[]
  /** Payment schedule from the ledger: the linked lançamento's recorrência série
   *  (parent + filhos), ordered by vencimento. Empty when there is no série. */
  parcelas: LancamentoRow[]
}

// ── contas / balanço ─────────────────────────────────────────────────────────
export interface ContaBalanceRow {
  id: number
  nome: string
  titular: string | null
  kind: ContaKind
  saldoCents: number
  entradasCents: number
  saidasCents: number
}

export interface ContasBalanco {
  contas: ContaBalanceRow[]
  saldoTotalCents: number
  socioContas: ContaBalanceRow[] // kind === 'socio', ordered by `ordem`
  diferencaSociosCents: number // |a − b| when exactly two sócio accounts, else 0
}

export interface TransferenciaRow {
  id: number
  valorCents: number
  data: string | null // ISO
  descricao: string | null
  contaOrigem: string
  contaDestino: string
}

export interface ContaOption {
  id: number
  nome: string
  kind: ContaKind
}

export interface IdNome {
  id: number
  nome: string
}

// ── honorário totals + monthly summary ───────────────────────────────────────
export interface HonorarioTotals {
  recebidoCents: number
  pendenteCents: number
  countRecebido: number
  countPendente: number
}

export interface MonthlySummary {
  mes: string // "YYYY-MM"
  label: string // "jun/26"
  entradasCents: number
  saidasCents: number
  saldoCents: number
  recebidoCents: number
  aReceberCents: number
}

// ── Financeiro interativo (design: unified "lançamento" a receber / a pagar) ──
export type Periodo = "mes" | "trimestre" | "ano"
export type LancDir = "in" | "out" // 'in' = a receber (entrada), 'out' = a pagar (saída)
export type LancSituacao = "pago" | "vencido" | "avencer"

export interface PeriodScope {
  title: string // "Junho" | "2º trimestre" | "2026"
  sub: string // "2026" | "abr–jun · 2026" | "Ano completo"
}

export interface LancamentoRow {
  id: number
  dir: LancDir
  desc: string
  party: string | null // cliente (in) / fornecedor-pagoPara (out)
  caso: string | null
  cat: string | null // categoria
  venc: string | null // ISO due date
  valorCents: number // magnitude (positive)
  pago: boolean // status === 'feito'
  pagoData: string | null // ISO
  contaId: number | null
  conta: string | null
  recorrente: boolean
  grupo: string | null // recurrence label e.g. "Recorrente"
}

export interface FluxoPoint {
  key: string // "YYYY-MM"
  label: string // "jun"
  ano: string // "2026"
  entCents: number
  saiCents: number
  saldoCents: number
  accCents: number // accumulated balance
  proj: boolean // future month → projected
}

export interface FluxoResumo {
  pontos: FluxoPoint[]
  aberturaCents: number
  saldoHojeCents: number
  saldoFinalCents: number
  menorSaldoCents: number
  totalEntCents: number
  totalSaiCents: number
}

// ── Casos & rateio entre sócios ──────────────────────────────────────────────
export interface CasoResponsavelInfo {
  contaId: number
  nome: string
  percentual: number // 0..100
}

export interface CasoRow {
  id: number
  titulo: string
  cliente: string | null
  tipo: CasoTipo
  status: string | null
  area: string | null // área do direito (cível, trabalhista, …)
  responsavel: string | null // free-text operational responsável (from Astrea)
  ultimaMovimentacao: string | null // ISO date (Caso.ultimaMovimentacao)
  honorariosCents: number // total of 'in' lançamentos linked to the caso
  honorariosCount: number
  responsaveis: CasoResponsavelInfo[] // sócio split
}

export interface SocioConta {
  id: number
  nome: string // titular ?? nome
  ordem: number
}

export interface AcertoSocioLado {
  id: number
  nome: string
  direitoCents: number // entitlement from caso splits (paid honorários into sócio accounts)
  recebidoCents: number // honorários actually received into this sócio's conta
  cotaSaidaCents: number // 50% share of shared expenses paid from sócio accounts
  pagoSaidaCents: number // expenses actually paid from this sócio's conta
}

export interface AcertoSocios {
  socios: AcertoSocioLado[] // the two sócios, ordered by `ordem`
  brutoCents: number // gross honorário imbalance before transfers (>=0)
  transferidoCents: number // already settled via sócio↔sócio transfers, toward the debt (>=0)
  valorCents: number // still owed after netting transfers (>=0)
  devedorId: number | null
  credorId: number | null
  devedorNome: string | null
  credorNome: string | null
  quitado: boolean
}

export interface ImportSummary {
  clientes: number
  casos: number
  honorarios: number
  lancamentos: number
  categorias: number
  contas: number
  centrosCusto: number
  anomalias: number
  casosSemFee: number
}
