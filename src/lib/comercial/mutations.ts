// Comercial / Marketing write layer — campaigns, leads (funnel), and ad-spend.
// Ad spend is created through the Financeiro `createLancamento` so marketing cost
// lands in the same ledger (categoria "Marketing" + campanhaId) with no
// double-count. App-created rows follow the same conventions as Financeiro.
// SERVER ONLY (imports prisma).
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { createLancamento } from "@/lib/finance/mutations"
import { notificarLeadConvertido, notificarOportunidadeAtribuida } from "@/lib/notificacoes/triggers"
import { resolverOuCriarCliente } from "./contato"
import { planejarBackfillCliente } from "./merge"
import {
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
// Open stages are configurable (see settings.ts pipelineSchema) — etapa is a
// free-form key at this layer; only shape (non-empty, trimmed) is enforced
// here. The Zod route schema already caps length; setPipelineConfig rejects
// the 2 reserved terminal keys from ever being reused as an open stage.
function asEtapa(v: unknown): LeadEtapa {
  return typeof v === "string" && v.trim() ? v.trim() : "novo"
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

function asTemperatura(v: unknown): string | null {
  return v === "quente" || v === "morno" || v === "frio" ? v : null
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
  responsavelUserId?: number | null
  proximaAcaoEm?: string | null
  proximaAcaoNota?: string | null
  temperatura?: string | null
  potencialFinanceiro?: string | null
  urgenciaNivel?: string | null
  poderDecisao?: string | null
  jurisdicao?: string | null
  viabilidade?: string | null
  contratoEnviado?: boolean
}

/** Creates a lead/oportunidade — ALWAYS resolves or creates the Cliente
 *  (Contato) it belongs to (dedup by e-mail/telefone; see ./contato.ts), so
 *  no oportunidade is ever left without a person behind it. Notifies the
 *  owner when one is assigned at creation. */
export async function createLead(input: LeadCreate, actorEmail?: string | null) {
  const etapa = asEtapa(input.etapa)
  const nome = reqStr(input.nome, "nome")
  const email = input.email?.trim() || null
  const telefone = input.telefone?.trim() || null
  const origem = asOrigem(input.origem)
  const responsavelUserId = optInt(input.responsavelUserId)
  const lead = await prisma.$transaction(async (tx) => {
    const { id: clienteId } = await resolverOuCriarCliente(tx, { nome, email, telefone, origem })
    return tx.lead.create({
      data: {
        nome,
        email,
        telefone,
        origem,
        campanhaId: optInt(input.campanhaId),
        etapa,
        valorEstimadoCents: typeof input.valorEstimadoCents === "number" ? input.valorEstimadoCents : null,
        dataEntrada: toDate(input.dataEntrada) ?? new Date(),
        dataConversao: etapa === "ganho" ? new Date() : null,
        observacoes: input.observacoes?.trim() || null,
        area: input.area?.trim() || null,
        responsavelUserId,
        proximaAcaoEm: toDate(input.proximaAcaoEm),
        proximaAcaoNota: input.proximaAcaoNota?.trim() || null,
        temperatura: asTemperatura(input.temperatura),
        potencialFinanceiro: input.potencialFinanceiro?.trim() || null,
        urgenciaNivel: input.urgenciaNivel?.trim() || null,
        poderDecisao: input.poderDecisao?.trim() || null,
        jurisdicao: input.jurisdicao?.trim() || null,
        viabilidade: input.viabilidade?.trim() || null,
        contratoEnviadoEm: input.contratoEnviado ? new Date() : null,
        clienteId,
      },
    })
  })
  if (responsavelUserId) {
    void notificarOportunidadeAtribuida({ leadId: lead.id, nome: lead.nome, responsavelUserId, actorEmail })
  }
  return lead
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
  responsavelUserId?: number | null
  proximaAcaoEm?: string | null
  proximaAcaoNota?: string | null
  temperatura?: string | null
  potencialFinanceiro?: string | null
  urgenciaNivel?: string | null
  poderDecisao?: string | null
  jurisdicao?: string | null
  viabilidade?: string | null
  contratoEnviado?: boolean
}

/** Edits the lead's own fields — does NOT re-resolve/re-link the Cliente
 *  (the link is set once, at creation/import/conversion; see ./contato.ts).
 *  Notifies the new owner when responsavelUserId changes to a different user. */
export async function updateLead(id: number, patch: LeadPatch, actorEmail?: string | null) {
  const antes = patch.responsavelUserId !== undefined || patch.contratoEnviado !== undefined
    ? await prisma.lead.findUnique({ where: { id }, select: { responsavelUserId: true, contratoEnviadoEm: true } })
    : null
  const lead = await prisma.lead.update({
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
      ...(patch.responsavelUserId !== undefined ? { responsavelUserId: optInt(patch.responsavelUserId) } : {}),
      ...(patch.proximaAcaoEm !== undefined ? { proximaAcaoEm: toDate(patch.proximaAcaoEm) } : {}),
      ...(patch.proximaAcaoNota !== undefined ? { proximaAcaoNota: patch.proximaAcaoNota?.trim() || null } : {}),
      ...(patch.temperatura !== undefined ? { temperatura: asTemperatura(patch.temperatura) } : {}),
      ...(patch.potencialFinanceiro !== undefined ? { potencialFinanceiro: patch.potencialFinanceiro?.trim() || null } : {}),
      ...(patch.urgenciaNivel !== undefined ? { urgenciaNivel: patch.urgenciaNivel?.trim() || null } : {}),
      ...(patch.poderDecisao !== undefined ? { poderDecisao: patch.poderDecisao?.trim() || null } : {}),
      ...(patch.jurisdicao !== undefined ? { jurisdicao: patch.jurisdicao?.trim() || null } : {}),
      ...(patch.viabilidade !== undefined ? { viabilidade: patch.viabilidade?.trim() || null } : {}),
      ...(patch.contratoEnviado !== undefined
        ? { contratoEnviadoEm: patch.contratoEnviado ? antes?.contratoEnviadoEm ?? new Date() : null }
        : {}),
    },
  })
  const novoResp = optInt(patch.responsavelUserId)
  if (patch.responsavelUserId !== undefined && novoResp && novoResp !== antes?.responsavelUserId) {
    void notificarOportunidadeAtribuida({ leadId: lead.id, nome: lead.nome, responsavelUserId: novoResp, actorEmail })
  }
  return lead
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
      // Sair de 'perdido' (reabrir) limpa também a flag de perda automática —
      // reversão manual do escritório, auditada via runMutation/AuditLog.
      ...(next === "perdido" ? {} : { motivoPerda: null, motivoPerdaCategoria: null, perdidoAutomatico: false }),
    },
  })
  // Conversão (entrou em 'ganho' agora) → avisa os gestores.
  if (next === "ganho" && cur.etapa !== "ganho") {
    void notificarLeadConvertido({ leadId: id, nome: lead.nome, actorEmail })
  }
  if (cur.etapa === "perdido" && next !== "perdido") {
    await prisma.oportunidadeAtividade.create({
      data: { leadId: id, tipo: "nota", descricao: "Lead reaberto — reversão da marcação de Perdido." },
    })
  }
  return lead
}

export async function marcarPerdido(
  id: number,
  motivo?: string | null,
  motivoCategoria?: string | null,
  opts?: { automatico?: boolean },
) {
  return prisma.lead.update({
    where: { id },
    data: {
      etapa: "perdido",
      motivoPerda: motivo?.trim() || null,
      motivoPerdaCategoria: motivoCategoria?.trim() || null,
      dataConversao: null,
      perdidoAutomatico: !!opts?.automatico,
    },
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
  valorContratadoCents?: number | null
  tipoHonorario?: string | null
  clienteNome?: string | null
  casoTitulo?: string | null
  dataConversao?: string | null
}

/** Mark a lead won and link the Cliente / Caso / fee-lançamento it converted into.
 *  When a contracted value is given, creates a fee-lançamento (Lancamento entrada,
 *  subTipo='honorario') carrying that value (used by ROAS / ticket médio). The
 *  legacy `Honorario` entity is no longer created (dormant → dropped in Fase 2). */
export async function converterLead(id: number, input: ConverterLeadInput, actorEmail?: string | null) {
  const dataConv = toDate(input.dataConversao) ?? new Date()
  const antes = await prisma.lead.findUnique({ where: { id }, select: { etapa: true } })
  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, select: { id: true, nome: true, clienteId: true } })
    if (!lead) throw new UserError("Lead não encontrado")
    // Every lead already resolves to a Contato at creation/import — fall back
    // to it instead of nulling the link out when the caller omits clienteId.
    const clienteId = optInt(input.clienteId) ?? lead.clienteId
    let lancamentoId: number | null = null
    const valor = typeof input.valorContratadoCents === "number" ? Math.abs(Math.round(input.valorContratadoCents)) : 0
    if (valor > 0) {
      const desc = input.casoTitulo?.trim() || input.clienteNome?.trim() || `Honorário — ${lead.nome}`
      const lanc = await tx.lancamento.create({
        data: {
          astreaId: `app-lanc-lead-${randomUUID()}`,
          tipo: "entrada",
          status: "aberto",
          subTipo: "honorario",
          descricao: desc,
          valorCents: valor,
          valorOriginalCents: valor,
          valorLiquidoCents: valor,
          tipoHonorario: mapTipoHonorario(input.tipoHonorario),
          dataLancamento: new Date(),
          dataVencimento: dataConv,
          isAnomalia: false,
          geradoPorApp: true,
          origem: "manual",
          clienteId,
          casoId: optInt(input.casoId),
        },
      })
      lancamentoId = lanc.id
    }
    return tx.lead.update({
      where: { id },
      data: {
        etapa: "ganho",
        dataConversao: dataConv,
        clienteId,
        casoId: optInt(input.casoId),
        lancamentoId,
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

export interface MesclarLeadInput {
  clienteId: number
}

/** Merge a lead into an ALREADY-REGISTERED Cliente — for when the same person
 *  was a client before also showing up as a lead (e.g. re-imported from
 *  Genions). Links the lead to that Cliente and marks it 'ganho' (no
 *  Honorário is created here — the client relationship, and any of its
 *  contracts, already exist); backfills empty Cliente contact fields (email/
 *  telefone) from the lead. */
export async function mesclarLeadComCliente(id: number, input: MesclarLeadInput, actorEmail?: string | null) {
  const clienteId = reqInt(input.clienteId, "cliente")
  const antes = await prisma.lead.findUnique({ where: { id }, select: { etapa: true, dataConversao: true } })
  if (!antes) throw new UserError("Lead não encontrado")
  const result = await prisma.$transaction(async (tx) => {
    const [lead, cliente] = await Promise.all([
      tx.lead.findUnique({ where: { id }, select: { id: true, nome: true, email: true, telefone: true, origem: true } }),
      tx.cliente.findUnique({ where: { id: clienteId }, select: { emails: true, telefones: true, origem: true } }),
    ])
    if (!lead) throw new UserError("Lead não encontrado")
    if (!cliente) throw new UserError("Cliente não encontrado")
    const patch = planejarBackfillCliente(lead, cliente)
    if (Object.keys(patch).length > 0) await tx.cliente.update({ where: { id: clienteId }, data: patch })
    return tx.lead.update({
      where: { id },
      data: {
        etapa: "ganho",
        dataConversao: antes.dataConversao ?? new Date(),
        clienteId,
        motivoPerda: null,
      },
    })
  })
  // Mesclagem nova (não estava em 'ganho' antes) → avisa os gestores, mesmo
  // fluxo de notificação da conversão normal.
  if (antes.etapa !== "ganho") {
    void notificarLeadConvertido({ leadId: id, nome: result.nome, actorEmail })
  }
  return result
}

// ── lote (bulk edit de oportunidades) ──────────────────────────────────────────
export interface LeadsLote {
  ids: number[]
  etapa?: LeadEtapa
  responsavelUserId?: number | null
  temperatura?: string | null
  area?: string | null
  excluir?: boolean
}

/** Bulk edit across many oportunidades, or delete the selection — replaces the
 *  client-side per-id loop (1 round-trip). Moving to 'ganho'/'perdido' is
 *  REJECTED here — those carry per-lead side effects (fee-lançamento,
 *  dataConversao, notification) that only the single-lead flows
 *  (Converter/Marcar perdido) apply correctly; only open-stage moves are safe
 *  as a raw bulk update. Notifies each newly-assigned dono, mirroring
 *  updateLead (a bulk reassignment must not go silent just because it's bulk). */
export async function bulkUpdateLeads(input: LeadsLote, actorEmail?: string | null) {
  const ids = (input.ids ?? []).filter((n) => Number.isInteger(n) && n > 0)
  if (!ids.length) throw new UserError("Selecione ao menos uma oportunidade")
  if (input.excluir) {
    const r = await prisma.lead.deleteMany({ where: { id: { in: ids } } })
    return { excluidas: r.count }
  }
  const data: Prisma.LeadUncheckedUpdateManyInput = {}
  if (input.etapa !== undefined) {
    // Compara o valor JÁ APARADO (mesmo que será persistido) — comparar o cru
    // permite burlar o guard com espaços (" ganho" não bate na igualdade, mas
    // asEtapa() aparava e gravava "ganho" mesmo assim).
    const next = asEtapa(input.etapa)
    if (next === "ganho" || next === "perdido") {
      throw new UserError("Use Converter/Marcar perdido para mudar para ganho/perdido — cada oportunidade precisa de detalhes próprios")
    }
    data.etapa = next
    data.dataConversao = null
    data.motivoPerda = null
    data.motivoPerdaCategoria = null
  }
  const novoResp = input.responsavelUserId !== undefined ? optInt(input.responsavelUserId) : undefined
  if (input.responsavelUserId !== undefined) data.responsavelUserId = novoResp
  if (input.temperatura !== undefined) data.temperatura = asTemperatura(input.temperatura)
  if (input.area !== undefined) data.area = input.area?.trim() || null
  if (Object.keys(data).length === 0) throw new UserError("Nenhuma alteração informada")

  // Snapshot "antes" só quando o dono está mudando, para notificar só quem de
  // fato ganhou um dono NOVO (espelha o guard de updateLead).
  const antes = novoResp
    ? await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true, responsavelUserId: true } })
    : []

  const r = await prisma.lead.updateMany({ where: { id: { in: ids } }, data })

  if (novoResp) {
    for (const l of antes) {
      if (l.responsavelUserId !== novoResp) {
        void notificarOportunidadeAtribuida({ leadId: l.id, nome: l.nome, responsavelUserId: novoResp, actorEmail })
      }
    }
  }
  return { atualizadas: r.count }
}
