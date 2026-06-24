// Comercial / Marketing write layer — campaigns, leads (funnel), and ad-spend.
// Ad spend is created through the Financeiro `createLancamento` so marketing cost
// lands in the same ledger (categoria "Marketing" + campanhaId) with no
// double-count. App-created rows follow the same conventions as Financeiro.
// SERVER ONLY (imports prisma).
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { createLancamento } from "@/lib/finance/mutations"
import { notificarLeadConvertido } from "@/lib/notificacoes/triggers"
import {
  LEAD_ETAPAS,
  MARKETING_CATEGORIA_ASTREA_ID,
  PLATAFORMA_LABEL,
  type CampanhaStatus,
  type LeadEtapa,
  type LeadOrigem,
  type Plataforma,
} from "./types"

// ── input helpers (mirrors finance/mutations) ────────────────────────────────
function toDate(input: string | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null
  if (input instanceof Date) return input
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}
function reqInt(v: unknown, name: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) throw new UserError(`${name} inválido`)
  return v
}
function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}
function optInt(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null
}
const PLATAFORMAS: Plataforma[] = ["google_ads", "meta_ads", "outro"]
const CAMPANHA_STATUSES: CampanhaStatus[] = ["ativa", "pausada", "encerrada"]
const ORIGENS: LeadOrigem[] = ["google_ads", "meta_ads", "indicacao", "organico", "outro"]

function asPlataforma(v: unknown): Plataforma {
  return PLATAFORMAS.includes(v as Plataforma) ? (v as Plataforma) : "outro"
}
function asStatus(v: unknown): CampanhaStatus {
  return CAMPANHA_STATUSES.includes(v as CampanhaStatus) ? (v as CampanhaStatus) : "ativa"
}
function asOrigem(v: unknown): LeadOrigem {
  return ORIGENS.includes(v as LeadOrigem) ? (v as LeadOrigem) : "outro"
}
function asEtapa(v: unknown): LeadEtapa {
  return LEAD_ETAPAS.includes(v as LeadEtapa) ? (v as LeadEtapa) : "novo"
}

/** Upsert the auto-managed "Marketing" expense categoria; returns its id. */
export async function ensureMarketingCategoriaId(): Promise<number> {
  const cat = await prisma.categoria.upsert({
    where: { astreaId: MARKETING_CATEGORIA_ASTREA_ID },
    create: { astreaId: MARKETING_CATEGORIA_ASTREA_ID, nome: "Marketing", cor: "#C0A147", ativo: true },
    update: {},
  })
  return cat.id
}

// ── Campanhas ────────────────────────────────────────────────────────────────
export interface CampanhaCreate {
  plataforma: Plataforma
  nome: string
  objetivo?: string | null
  status?: CampanhaStatus
  externalId?: string | null
  dataInicio?: string | null
  dataFim?: string | null
  area?: string | null
}

export async function createCampanha(input: CampanhaCreate) {
  return prisma.campanha.create({
    data: {
      plataforma: asPlataforma(input.plataforma),
      nome: reqStr(input.nome, "nome"),
      objetivo: input.objetivo?.trim() || null,
      status: asStatus(input.status),
      externalId: input.externalId?.trim() || null,
      dataInicio: toDate(input.dataInicio),
      dataFim: toDate(input.dataFim),
      area: input.area?.trim() || null,
      ativo: true,
    },
  })
}

export interface CampanhaPatch {
  plataforma?: Plataforma
  nome?: string
  objetivo?: string | null
  status?: CampanhaStatus
  externalId?: string | null
  dataInicio?: string | null
  dataFim?: string | null
  ativo?: boolean
  area?: string | null
}

export async function updateCampanha(id: number, patch: CampanhaPatch) {
  return prisma.campanha.update({
    where: { id },
    data: {
      ...(patch.plataforma !== undefined ? { plataforma: asPlataforma(patch.plataforma) } : {}),
      ...(patch.nome !== undefined ? { nome: reqStr(patch.nome, "nome") } : {}),
      ...(patch.objetivo !== undefined ? { objetivo: patch.objetivo?.trim() || null } : {}),
      ...(patch.status !== undefined ? { status: asStatus(patch.status) } : {}),
      ...(patch.externalId !== undefined ? { externalId: patch.externalId?.trim() || null } : {}),
      ...(patch.dataInicio !== undefined ? { dataInicio: toDate(patch.dataInicio) } : {}),
      ...(patch.dataFim !== undefined ? { dataFim: toDate(patch.dataFim) } : {}),
      ...(patch.ativo !== undefined ? { ativo: !!patch.ativo } : {}),
      ...(patch.area !== undefined ? { area: patch.area?.trim() || null } : {}),
    },
  })
}

/** Delete a campaign. Blocked while it still has ad spend or leads attached, so
 *  financial/funnel history is never silently orphaned — reassign or archive
 *  (set ativo=false) instead. */
export async function deleteCampanha(id: number) {
  const [gastos, leads] = await Promise.all([
    prisma.lancamento.count({ where: { campanhaId: id } }),
    prisma.lead.count({ where: { campanhaId: id } }),
  ])
  if (gastos > 0) throw new UserError("Campanha possui gastos vinculados — arquive em vez de excluir")
  if (leads > 0) throw new UserError("Campanha possui leads vinculados — arquive em vez de excluir")
  return prisma.campanha.delete({ where: { id } })
}

// ── Ad spend → Financeiro ledger ─────────────────────────────────────────────
export interface RegistrarGastoInput {
  campanhaId: number
  valorCents: number // magnitude
  data?: string | null // record date (dataLancamento)
  contaId?: number | null // account that paid
  descricao?: string | null
  pago?: boolean // default true (already paid)
  requestId?: string | null // client idempotency key — retried creates are no-ops
}

export async function registrarGasto(input: RegistrarGastoInput) {
  const campanhaId = reqInt(input.campanhaId, "campanha")
  const camp = await prisma.campanha.findUnique({ where: { id: campanhaId }, select: { nome: true, plataforma: true } })
  if (!camp) throw new UserError("Campanha não encontrada")
  const categoriaId = await ensureMarketingCategoriaId()
  return createLancamento({
    tipo: "saida",
    valorCents: input.valorCents,
    descricao: input.descricao?.trim() || `Anúncios — ${camp.nome}`,
    status: input.pago === false ? "aberto" : "feito",
    dataLancamento: input.data ?? null,
    contaId: optInt(input.contaId),
    categoriaId,
    campanhaId,
    pagoPara: PLATAFORMA_LABEL[camp.plataforma as Plataforma] ?? "Anúncios",
    subTipo: "avulsa",
    requestId: input.requestId ?? null,
  })
}

// ── Leads (funnel) ───────────────────────────────────────────────────────────
export interface LeadCreate {
  nome: string
  email?: string | null
  telefone?: string | null
  origem?: LeadOrigem
  campanhaId?: number | null
  etapa?: LeadEtapa
  valorEstimadoCents?: number | null
  dataEntrada?: string | null
  observacoes?: string | null
  area?: string | null
}

export async function createLead(input: LeadCreate) {
  const etapa = asEtapa(input.etapa)
  return prisma.lead.create({
    data: {
      nome: reqStr(input.nome, "nome"),
      email: input.email?.trim() || null,
      telefone: input.telefone?.trim() || null,
      origem: asOrigem(input.origem),
      campanhaId: optInt(input.campanhaId),
      etapa,
      valorEstimadoCents: typeof input.valorEstimadoCents === "number" ? input.valorEstimadoCents : null,
      dataEntrada: toDate(input.dataEntrada) ?? new Date(),
      dataConversao: etapa === "ganho" ? new Date() : null,
      observacoes: input.observacoes?.trim() || null,
      area: input.area?.trim() || null,
    },
  })
}

export interface LeadPatch {
  nome?: string
  email?: string | null
  telefone?: string | null
  origem?: LeadOrigem
  campanhaId?: number | null
  valorEstimadoCents?: number | null
  dataEntrada?: string | null
  observacoes?: string | null
  area?: string | null
}

export async function updateLead(id: number, patch: LeadPatch) {
  return prisma.lead.update({
    where: { id },
    data: {
      ...(patch.nome !== undefined ? { nome: reqStr(patch.nome, "nome") } : {}),
      ...(patch.email !== undefined ? { email: patch.email?.trim() || null } : {}),
      ...(patch.telefone !== undefined ? { telefone: patch.telefone?.trim() || null } : {}),
      ...(patch.origem !== undefined ? { origem: asOrigem(patch.origem) } : {}),
      ...(patch.campanhaId !== undefined ? { campanhaId: optInt(patch.campanhaId) } : {}),
      ...(patch.valorEstimadoCents !== undefined
        ? { valorEstimadoCents: typeof patch.valorEstimadoCents === "number" ? patch.valorEstimadoCents : null }
        : {}),
      ...(patch.dataEntrada !== undefined ? { dataEntrada: toDate(patch.dataEntrada) ?? new Date() } : {}),
      ...(patch.observacoes !== undefined ? { observacoes: patch.observacoes?.trim() || null } : {}),
      ...(patch.area !== undefined ? { area: patch.area?.trim() || null } : {}),
    },
  })
}

export async function deleteLead(id: number) {
  return prisma.lead.delete({ where: { id } })
}

/** Move a lead to a funnel stage. Sets dataConversao on first reaching 'ganho';
 *  clears it (and conversion links) when moving back out of 'ganho'. */
export async function moverEtapa(id: number, etapa: LeadEtapa, actorEmail?: string | null) {
  const next = asEtapa(etapa)
  const cur = await prisma.lead.findUnique({ where: { id }, select: { dataConversao: true, etapa: true, nome: true } })
  if (!cur) throw new UserError("Lead não encontrado")
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      etapa: next,
      ...(next === "ganho"
        ? { dataConversao: cur.dataConversao ?? new Date() }
        : { dataConversao: null }),
      ...(next === "perdido" ? {} : { motivoPerda: null }),
    },
  })
  // Conversão (entrou em 'ganho' agora) → avisa os gestores.
  if (next === "ganho" && cur.etapa !== "ganho") {
    void notificarLeadConvertido({ leadId: id, nome: lead.nome, actorEmail })
  }
  return lead
}

export async function marcarPerdido(id: number, motivo?: string | null) {
  return prisma.lead.update({
    where: { id },
    data: { etapa: "perdido", motivoPerda: motivo?.trim() || null, dataConversao: null },
  })
}

function mapTipoHonorario(v?: string | null): string {
  const t = (v ?? "").toLowerCase()
  if (t.includes("parcel")) return "parcelado"
  if (t.includes("recorr")) return "recorrente"
  if (t.includes("xito") || t.includes("exito")) return "exito"
  return "avista"
}

export interface ConverterLeadInput {
  clienteId?: number | null
  casoId?: number | null
  honorarioId?: number | null
  valorContratadoCents?: number | null
  tipoHonorario?: string | null
  clienteNome?: string | null
  casoTitulo?: string | null
  dataConversao?: string | null
}

/** Mark a lead won and link the Cliente / Caso / Honorário it converted into.
 *  When a contracted value is given (and no honorário is linked yet), creates a
 *  Honorário in Financeiro carrying that value (used by ROAS / ticket médio). */
export async function converterLead(id: number, input: ConverterLeadInput, actorEmail?: string | null) {
  const dataConv = toDate(input.dataConversao) ?? new Date()
  const antes = await prisma.lead.findUnique({ where: { id }, select: { etapa: true } })
  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, select: { id: true, nome: true } })
    if (!lead) throw new UserError("Lead não encontrado")
    let honorarioId = optInt(input.honorarioId)
    const valor = typeof input.valorContratadoCents === "number" ? Math.abs(Math.round(input.valorContratadoCents)) : 0
    if (!honorarioId && valor > 0) {
      const desc = input.casoTitulo?.trim() || input.clienteNome?.trim() || `Honorário — ${lead.nome}`
      const hon = await tx.honorario.create({
        data: {
          astreaId: `app-hon-lead-${randomUUID()}`,
          descricao: desc,
          valorCents: valor,
          valorLiquidoCents: valor,
          dataVencimento: dataConv,
          status: "lancado",
          tipo: mapTipoHonorario(input.tipoHonorario),
          clienteId: optInt(input.clienteId),
          casoId: optInt(input.casoId),
        },
      })
      honorarioId = hon.id
    }
    return tx.lead.update({
      where: { id },
      data: {
        etapa: "ganho",
        dataConversao: dataConv,
        clienteId: optInt(input.clienteId),
        casoId: optInt(input.casoId),
        honorarioId,
        motivoPerda: null,
      },
    })
  })
  // Conversão nova (não estava em 'ganho' antes) → avisa os gestores.
  if (antes && antes.etapa !== "ganho") {
    void notificarLeadConvertido({ leadId: id, nome: result.nome, actorEmail })
  }
  return result
}
