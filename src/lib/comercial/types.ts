// Comercial / Marketing module — canonical string-union "enums" (SQLite has no
// native enums) + the view-model shapes shared between the query layer (server)
// and the components (client). Money is always integer centavos. Period scoping
// reuses the Financeiro `Periodo` so the single PeriodBar drives both modules.
import type { Periodo } from "@/lib/finance/types"

export type { Periodo }

// Synthetic `Categoria.astreaId` for the auto-managed "Marketing" expense bucket
// every ad-spend Lancamento is filed under. Shared by the query + write layers
// so they never drift. (Client-safe constant — no prisma here.)
export const MARKETING_CATEGORIA_ASTREA_ID = "app-cat-marketing"

export type Plataforma = "google_ads" | "meta_ads" | "outro"
export type CampanhaStatus = "ativa" | "pausada" | "encerrada"
export type LeadOrigem = "google_ads" | "meta_ads" | "indicacao" | "organico" | "outro"
export type LeadEtapa = "novo" | "contato" | "qualificado" | "proposta" | "ganho" | "perdido"

// Canonical funnel order (terminal "perdido" handled separately as lost).
export const FUNIL_ETAPAS: LeadEtapa[] = ["novo", "contato", "qualificado", "proposta", "ganho"]
export const LEAD_ETAPAS: LeadEtapa[] = [...FUNIL_ETAPAS, "perdido"]

export const PLATAFORMA_LABEL: Record<Plataforma, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  outro: "Outro",
}
export const ORIGEM_LABEL: Record<LeadOrigem, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  indicacao: "Indicação",
  organico: "Orgânico",
  outro: "Outro",
}
export const ETAPA_LABEL: Record<LeadEtapa, string> = {
  novo: "Novo",
  contato: "Contato",
  qualificado: "Qualificado",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
}
export const CAMPANHA_STATUS_LABEL: Record<CampanhaStatus, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
}

// ── view models ──────────────────────────────────────────────────────────────

export interface ComercialKpis {
  leads: number
  leadsDeltaPct: number | null // vs previous period
  conversoes: number
  taxaConversaoPct: number | null // conversões / leads
  investimentoCents: number // ad spend committed in the period
  valorContratadoCents: number // contracted value of leads won in the period
  receitaRecebidaCents: number // cash actually received (honorário recebido) in the period
  roas: number | null // valorContratado / investimento
  roiPct: number | null // (valorContratado − investimento) / investimento
  cacCents: number | null // investimento / conversões
  cplCents: number | null // investimento / leads
  ticketMedioCents: number | null // valorContratado / conversões
}

export interface FunilEtapa {
  etapa: LeadEtapa
  label: string
  count: number
  valorCents: number // sum of estimated/contracted value at this stage
  pctDoTopo: number // count / total leads (0..100)
  conversaoDaAnterior: number | null // % retained from the previous stage
}

export interface CampanhaRow {
  id: number
  plataforma: Plataforma
  nome: string
  status: CampanhaStatus
  objetivo: string | null
  dataInicio: string | null // ISO
  dataFim: string | null // ISO
  investimentoCents: number
  leads: number
  conversoes: number
  valorContratadoCents: number
  cplCents: number | null
  cacCents: number | null
  roas: number | null
  roiPct: number | null
}

export interface CampanhaOption {
  id: number
  nome: string
  plataforma: Plataforma
}

export interface OrigemRow {
  origem: LeadOrigem
  label: string
  leads: number
  conversoes: number
  investimentoCents: number
  valorContratadoCents: number
  taxaConversaoPct: number | null
  cplCents: number | null
  cacCents: number | null
  roas: number | null
}

export interface SeriePoint {
  key: string // "YYYY-MM"
  label: string // "jun"
  leads: number
  conversoes: number
}

export interface LeadRow {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  origem: LeadOrigem
  campanhaId: number | null
  campanha: string | null
  etapa: LeadEtapa
  valorEstimadoCents: number | null
  valorContratadoCents: number | null // from the linked honorário, when won
  dataEntrada: string | null // ISO
  dataConversao: string | null // ISO
  motivoPerda: string | null
  clienteId: number | null
  cliente: string | null
  casoId: number | null
}

export interface LeadFilters {
  origem?: LeadOrigem | null
  etapa?: LeadEtapa | null
  campanhaId?: number | null
  q?: string | null
}

export interface ExportScope {
  mes: string
  periodo: Periodo
  title: string
  sub: string
}

// Flat aggregate bundle consumed by the Exportar tab (CSV/JSON download + the
// paste-ready AI prompt built in report.ts).
export interface ExportBundle {
  scope: ExportScope
  kpis: ComercialKpis
  funil: FunilEtapa[]
  campanhas: CampanhaRow[]
  origens: OrigemRow[]
  leads: LeadRow[]
}

// ── raw dataset for the client app (period scoping + metrics done client-side) ─
export interface CmDatasetCampaign {
  id: number
  plataforma: Plataforma
  nome: string
  objetivo: string | null
  status: CampanhaStatus
  inicio: string | null // ISO date
  fim: string | null // ISO date
  extId: string | null
  area: string | null
}
export interface CmDatasetLead {
  id: number
  nome: string
  contato: string | null
  origem: LeadOrigem
  campanhaId: number | null
  etapa: LeadEtapa
  valorEstimadoCents: number
  valorContratadoCents: number | null // from the linked honorário, when won
  dataEntrada: string | null // ISO date
  dataConv: string | null // ISO date
  cliente: string | null
  caso: string | null
  motivoPerda: string | null
  area: string | null
}
export interface CmDatasetGasto {
  id: number
  campanhaId: number | null
  valorCents: number // positive magnitude
  data: string | null // ISO date · competência (vencimento ?? lançamento)
  conta: string | null
  descricao: string | null
}
export interface CmContaOption {
  id: number
  nome: string
}
export interface CmClienteOption {
  id: number
  nome: string
}
export interface CmDataset {
  campaigns: CmDatasetCampaign[]
  leads: CmDatasetLead[]
  gastos: CmDatasetGasto[]
  contas: CmContaOption[]
  clientes: CmClienteOption[]
  casos: string[]
}
