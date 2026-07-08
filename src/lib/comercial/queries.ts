// Comercial / Marketing query layer — pure async functions over Prisma, the
// single place that knows the acquisition semantics (leads, funnel, ad spend,
// ROI/ROAS/CAC/CPL). Ad spend is read from the SAME Lancamento ledger the
// Financeiro uses (tipo 'saida', categoria Marketing or campanhaId), so the two
// modules reconcile. SERVER ONLY (imports prisma) — never import from a
// "use client" module.
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { normalizar } from "@/lib/text"
import { valorContratadoPorLead, somaValorContratado } from "./valor"
import { currentMes, periodRange, periodScope, shiftPeriod } from "@/lib/finance/periodo"
import { getCasoOptions, getClienteOptions, getContasOptions } from "@/lib/finance/queries"
import {
  ETAPA_LABEL,
  FUNIL_ETAPAS,
  MARKETING_CATEGORIA_ASTREA_ID,
  ORIGEM_LABEL,
  PLATAFORMA_LABEL,
  type CampanhaOption,
  type CampanhaRow,
  type CampanhaStatus,
  type CmDataset,
  type CmDatasetCampaign,
  type CmDatasetGasto,
  type CmDatasetLead,
  type ComercialKpis,
  type ExportBundle,
  type FunilEtapa,
  type LeadEtapa,
  type LeadFilters,
  type LeadOrigem,
  type LeadRow,
  type OrigemRow,
  type Periodo,
  type Plataforma,
  type SeriePoint,
} from "./types"

// ── helpers ──────────────────────────────────────────────────────────────────
const MES_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
function inWindow(d: Date | null | undefined, start: Date, end: Date): boolean {
  return d != null && d >= start && d < end
}
const FUNIL_RANK: Record<string, number> = { novo: 0, contato: 1, qualificado: 2, proposta: 3, ganho: 4 }

function plataformaToOrigem(p: string | null | undefined): LeadOrigem {
  return p === "google_ads" ? "google_ads" : p === "meta_ads" ? "meta_ads" : "outro"
}

function origemKey(v: string): LeadOrigem {
  return v === "google_ads" || v === "meta_ads" || v === "indicacao" || v === "organico" ? v : "outro"
}

// Contracted value of a won lead: the linked honorário, else the lead estimate.
type ValuedLead = { valorEstimadoCents: number | null; honorario: { valorCents: number } | null }
const wonValue = (l: ValuedLead) => l.honorario?.valorCents ?? l.valorEstimadoCents ?? 0

// Real revenue booked to a caso: its Honorário records PLUS income Lançamentos
// typed as honorário that AREN'T already mirrored by a Honorário (a Lançamento
// carrying honorarios is the Astrea entrada behind an imported Honorário —
// counting both would double-count). Lets the office's manual "entrada"
// bookings (how new contracts are recorded) feed the acquisition value.
type CasoRevenueSel = {
  honorarios: { valorCents: number }[]
  lancamentos: { valorCents: number; honorarios: { id: number }[] }[]
} | null
function casoRevenueCents(caso: CasoRevenueSel): number {
  if (!caso) return 0
  const fees = caso.honorarios.reduce((a, h) => a + h.valorCents, 0)
  const manualIncome = caso.lancamentos
    .filter((l) => l.honorarios.length === 0)
    .reduce((a, l) => a + Math.abs(l.valorCents), 0)
  return fees + manualIncome
}
// Caso select shared by the two contracted-value call sites.
const casoRevenueInclude = {
  honorarios: { select: { valorCents: true } },
  lancamentos: {
    where: { tipo: "entrada", subTipo: "honorario" } as const,
    select: { valorCents: true, honorarios: { select: { id: true } } },
  },
} as const

/** True for any categoria the office treats as marketing/ad spend. Matches by
 *  NAME (accent-insensitive) so it catches both the app-managed "Marketing"
 *  (astreaId app-cat-marketing) AND the Astrea-imported "Marketing/Anúncios" —
 *  their ids differ per environment, so we never hardcode ids. */
function ehCategoriaMarketing(nome: string | null | undefined): boolean {
  const n = normalizar(nome ?? "")
  return n.includes("marketing") || n.includes("anuncio") || n.includes("ad ") || n === "ads"
}

// All categoria ids counted as ad spend: the app-managed one + any whose name
// looks like marketing. Empty array means "match only by campanhaId".
async function marketingCategoriaIds(): Promise<number[]> {
  const cats = await prisma.categoria.findMany({ select: { id: true, nome: true, astreaId: true } })
  return cats.filter((c) => c.astreaId === MARKETING_CATEGORIA_ASTREA_ID || ehCategoriaMarketing(c.nome)).map((c) => c.id)
}

// Ad spend belongs to the period of its VENCIMENTO (competência) when set, else
// the record date (dataLancamento) — i.e. COALESCE(dataVencimento, dataLancamento)
// ∈ [start, end). Kept in one place so every ad-spend query buckets identically.
// Expressed as an OR because Prisma has no COALESCE-in-range operator.
function spendPeriodo(start: Date, end: Date): Prisma.LancamentoWhereInput {
  return {
    OR: [
      { dataVencimento: { gte: start, lt: end } },
      { dataVencimento: null, dataLancamento: { gte: start, lt: end } },
    ],
  }
}

// Ad-spend rows = saídas tagged to a campaign OR filed under a Marketing
// categoria, that fall in the period by competência (vencimento ?? lançamento).
function spendWhere(marketingIds: number[], start: Date, end: Date): Prisma.LancamentoWhereInput {
  const tagged: Prisma.LancamentoWhereInput[] = [{ campanhaId: { not: null } }]
  if (marketingIds.length) tagged.push({ categoriaId: { in: marketingIds } })
  return { tipo: "saida", isAnomalia: false, AND: [{ OR: tagged }, spendPeriodo(start, end)] }
}

const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null)
const pct = (num: number, den: number): number | null => (den > 0 ? (num / den) * 100 : null)
const perUnit = (num: number, den: number): number | null => (den > 0 ? Math.round(num / den) : null)

// ── KPIs ─────────────────────────────────────────────────────────────────────
export async function getComercialKpis(mes?: string, periodo: Periodo = "mes"): Promise<ComercialKpis> {
  const m = mes ?? currentMes()
  const { start, end } = periodRange(m, periodo)
  const { start: ps, end: pe } = periodRange(shiftPeriod(m, periodo, -1), periodo)
  const marketingIds = await marketingCategoriaIds()

  const [leads, leadsPrev, ganhos, investimento, recebido] = await Promise.all([
    prisma.lead.count({ where: { dataEntrada: { gte: start, lt: end } } }),
    prisma.lead.count({ where: { dataEntrada: { gte: ps, lt: pe } } }),
    prisma.lead.findMany({
      // Attribution by ENTRY date: a lead won this period is credited to the
      // month it first contacted us (that spend/strategy brought it in), even
      // if it closes later. Matches the client cmKpis + the funnel cohort.
      where: { etapa: "ganho", dataEntrada: { gte: start, lt: end } },
      select: {
        id: true,
        casoId: true,
        dataConversao: true,
        valorEstimadoCents: true,
        honorario: { select: { valorCents: true } },
        caso: { select: casoRevenueInclude },
      },
    }),
    prisma.lancamento.aggregate({ _sum: { valorCents: true }, where: spendWhere(marketingIds, start, end) }),
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { tipo: "entrada", subTipo: "honorario", isAnomalia: false, status: "feito", dataPagamento: { gte: start, lt: end } },
    }),
  ])

  const conversoes = ganhos.length
  // Contracted value follows the caso's REAL honorários (deduped per caso), not
  // just the lead's linked honorário — see ./valor. Aligns with the Comercial UI.
  const valorContratadoCents = somaValorContratado(
    ganhos.map((g) => ({
      id: g.id,
      casoId: g.casoId,
      conv: g.dataConversao?.getTime() ?? 0,
      honorarioCents: g.honorario?.valorCents ?? 0,
      casoRevenueCents: casoRevenueCents(g.caso),
      estimadoCents: g.valorEstimadoCents ?? 0,
    })),
  )
  const investimentoCents = Math.abs(investimento._sum.valorCents ?? 0)

  return {
    leads,
    leadsDeltaPct: pct(leads - leadsPrev, leadsPrev),
    conversoes,
    taxaConversaoPct: pct(conversoes, leads),
    investimentoCents,
    valorContratadoCents,
    receitaRecebidaCents: Math.abs(recebido._sum.valorCents ?? 0),
    roas: ratio(valorContratadoCents, investimentoCents),
    roiPct: pct(valorContratadoCents - investimentoCents, investimentoCents),
    cacCents: perUnit(investimentoCents, conversoes),
    cplCents: perUnit(investimentoCents, leads),
    ticketMedioCents: perUnit(valorContratadoCents, conversoes),
  }
}

// ── funil (cohort of leads that ENTERED in the period) ───────────────────────
export async function getFunil(mes?: string, periodo: Periodo = "mes"): Promise<FunilEtapa[]> {
  const { start, end } = periodRange(mes ?? currentMes(), periodo)
  const leads = await prisma.lead.findMany({
    where: { dataEntrada: { gte: start, lt: end } },
    select: { etapa: true, valorEstimadoCents: true, honorario: { select: { valorCents: true } } },
  })
  const top = leads.length
  // reached[i]: leads that got at least to funnel stage i. Everyone "entered"
  // (i=0, incl. perdidos); for later stages, count non-lost leads ranked ≥ i.
  const counts = FUNIL_ETAPAS.map((etapa, i) => {
    const reached = leads.filter((l) => {
      if (i === 0) return true
      if (l.etapa === "perdido") return false
      return (FUNIL_RANK[l.etapa] ?? 0) >= i
    })
    return {
      etapa,
      count: reached.length,
      valorCents: reached.reduce((a, l) => a + wonValue(l), 0),
    }
  })
  return counts.map((c, i): FunilEtapa => ({
    etapa: c.etapa,
    label: ETAPA_LABEL[c.etapa],
    count: c.count,
    valorCents: c.valorCents,
    pctDoTopo: top > 0 ? (c.count / top) * 100 : 0,
    conversaoDaAnterior: i === 0 ? null : pct(c.count, counts[i - 1].count),
  }))
}

// ── per-campaign performance ─────────────────────────────────────────────────
export async function getCampanhas(mes?: string, periodo: Periodo = "mes"): Promise<CampanhaRow[]> {
  const { start, end } = periodRange(mes ?? currentMes(), periodo)
  const [campanhas, leads, gastos] = await Promise.all([
    prisma.campanha.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: { id: true, plataforma: true, nome: true, status: true, objetivo: true, dataInicio: true, dataFim: true },
    }),
    prisma.lead.findMany({
      where: { campanhaId: { not: null } },
      select: {
        campanhaId: true,
        etapa: true,
        dataEntrada: true,
        dataConversao: true,
        valorEstimadoCents: true,
        honorario: { select: { valorCents: true } },
      },
    }),
    prisma.lancamento.findMany({
      where: { tipo: "saida", isAnomalia: false, campanhaId: { not: null }, ...spendPeriodo(start, end) },
      select: { campanhaId: true, valorCents: true },
    }),
  ])

  const spendBy = new Map<number, number>()
  for (const g of gastos) if (g.campanhaId != null) spendBy.set(g.campanhaId, (spendBy.get(g.campanhaId) ?? 0) + Math.abs(g.valorCents))

  const leadBy = new Map<number, { leads: number; conversoes: number; contratado: number }>()
  for (const l of leads) {
    if (l.campanhaId == null) continue
    if (!inWindow(l.dataEntrada, start, end)) continue // attribute by entry (contact) month
    const cur = leadBy.get(l.campanhaId) ?? { leads: 0, conversoes: 0, contratado: 0 }
    cur.leads += 1
    if (l.etapa === "ganho") {
      cur.conversoes += 1
      cur.contratado += wonValue(l)
    }
    leadBy.set(l.campanhaId, cur)
  }

  return campanhas.map((c): CampanhaRow => {
    const investimentoCents = spendBy.get(c.id) ?? 0
    const lb = leadBy.get(c.id) ?? { leads: 0, conversoes: 0, contratado: 0 }
    return {
      id: c.id,
      plataforma: c.plataforma as Plataforma,
      nome: c.nome,
      status: c.status as CampanhaStatus,
      objetivo: c.objetivo,
      dataInicio: iso(c.dataInicio),
      dataFim: iso(c.dataFim),
      investimentoCents,
      leads: lb.leads,
      conversoes: lb.conversoes,
      valorContratadoCents: lb.contratado,
      cplCents: perUnit(investimentoCents, lb.leads),
      cacCents: perUnit(investimentoCents, lb.conversoes),
      roas: ratio(lb.contratado, investimentoCents),
      roiPct: pct(lb.contratado - investimentoCents, investimentoCents),
    }
  })
}

// ── per-channel (origem) breakdown ───────────────────────────────────────────
export async function getOrigemBreakdown(mes?: string, periodo: Periodo = "mes"): Promise<OrigemRow[]> {
  const { start, end } = periodRange(mes ?? currentMes(), periodo)
  const marketingIds = await marketingCategoriaIds()
  const [entered, won, spend] = await Promise.all([
    prisma.lead.findMany({ where: { dataEntrada: { gte: start, lt: end } }, select: { origem: true } }),
    prisma.lead.findMany({
      // Won leads credited by ENTRY month (same cohort attribution as the KPIs).
      where: { etapa: "ganho", dataEntrada: { gte: start, lt: end } },
      select: { origem: true, valorEstimadoCents: true, honorario: { select: { valorCents: true } } },
    }),
    prisma.lancamento.findMany({
      where: spendWhere(marketingIds, start, end),
      select: { valorCents: true, campanha: { select: { plataforma: true } } },
    }),
  ])

  const keys: LeadOrigem[] = ["google_ads", "meta_ads", "indicacao", "organico", "outro"]
  const acc = new Map<LeadOrigem, { leads: number; conversoes: number; contratado: number; investimento: number }>()
  for (const k of keys) acc.set(k, { leads: 0, conversoes: 0, contratado: 0, investimento: 0 })

  for (const l of entered) acc.get(origemKey(l.origem))!.leads += 1
  for (const l of won) {
    const o = acc.get(origemKey(l.origem))!
    o.conversoes += 1
    o.contratado += wonValue(l)
  }
  for (const s of spend) {
    acc.get(plataformaToOrigem(s.campanha?.plataforma))!.investimento += Math.abs(s.valorCents)
  }

  return keys
    .map((origem): OrigemRow => {
      const a = acc.get(origem)!
      return {
        origem,
        label: ORIGEM_LABEL[origem],
        leads: a.leads,
        conversoes: a.conversoes,
        investimentoCents: a.investimento,
        valorContratadoCents: a.contratado,
        taxaConversaoPct: pct(a.conversoes, a.leads),
        cplCents: perUnit(a.investimento, a.leads),
        cacCents: perUnit(a.investimento, a.conversoes),
        roas: ratio(a.contratado, a.investimento),
      }
    })
    .filter((r) => r.leads > 0 || r.investimentoCents > 0)
}

// ── leads list (period-scoped + filters) ─────────────────────────────────────
export async function getLeads(mes?: string, periodo: Periodo = "mes", filters: LeadFilters = {}): Promise<LeadRow[]> {
  const where: Prisma.LeadWhereInput = {}
  if (mes) {
    const { start, end } = periodRange(mes, periodo)
    where.dataEntrada = { gte: start, lt: end }
  }
  if (filters.origem) where.origem = filters.origem
  if (filters.etapa) where.etapa = filters.etapa
  if (filters.campanhaId) where.campanhaId = filters.campanhaId

  const rows = await prisma.lead.findMany({
    where,
    orderBy: { dataEntrada: "desc" },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      origem: true,
      campanhaId: true,
      etapa: true,
      valorEstimadoCents: true,
      dataEntrada: true,
      dataConversao: true,
      motivoPerda: true,
      clienteId: true,
      casoId: true,
      campanha: { select: { nome: true } },
      cliente: { select: { nome: true } },
      honorario: { select: { valorCents: true } },
    },
  })

  let mapped = rows.map((r): LeadRow => ({
    id: r.id,
    nome: r.nome,
    email: r.email,
    telefone: r.telefone,
    origem: r.origem as LeadOrigem,
    campanhaId: r.campanhaId,
    campanha: r.campanha?.nome ?? null,
    etapa: r.etapa as LeadEtapa,
    valorEstimadoCents: r.valorEstimadoCents,
    valorContratadoCents: r.honorario?.valorCents ?? null,
    dataEntrada: iso(r.dataEntrada),
    dataConversao: iso(r.dataConversao),
    motivoPerda: r.motivoPerda,
    clienteId: r.clienteId,
    cliente: r.cliente?.nome ?? null,
    casoId: r.casoId,
  }))

  const q = filters.q?.trim().toLowerCase()
  if (q) {
    mapped = mapped.filter((r) =>
      [r.nome, r.email, r.telefone, r.campanha, r.cliente].some((f) => f?.toLowerCase().includes(q)),
    )
  }
  return mapped
}

// ── leads vs conversões trend (rolling, all months present) ──────────────────
export async function getLeadsSeries(): Promise<SeriePoint[]> {
  const leads = await prisma.lead.findMany({ select: { dataEntrada: true, etapa: true, dataConversao: true } })
  const map = new Map<string, { leads: number; conversoes: number }>()
  const bump = (key: string, field: "leads" | "conversoes") => {
    const cur = map.get(key) ?? { leads: 0, conversoes: 0 }
    cur[field] += 1
    map.set(key, cur)
  }
  for (const l of leads) {
    if (l.dataEntrada) bump(monthKey(l.dataEntrada), "leads")
    if (l.etapa === "ganho" && l.dataConversao) bump(monthKey(l.dataConversao), "conversoes")
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]): SeriePoint => ({
      key,
      label: MES_ABBR[Number(key.slice(5, 7)) - 1],
      leads: v.leads,
      conversoes: v.conversoes,
    }))
}

// ── option lists for filters / modals ────────────────────────────────────────
export async function getCampanhaOptions(): Promise<CampanhaOption[]> {
  const rows = await prisma.campanha.findMany({
    where: { ativo: true },
    orderBy: [{ nome: "asc" }],
    select: { id: true, nome: true, plataforma: true },
  })
  return rows.map((r) => ({ id: r.id, nome: r.nome, plataforma: r.plataforma as Plataforma }))
}

export function getOrigemOptions(): { value: LeadOrigem; label: string }[] {
  return (Object.keys(ORIGEM_LABEL) as LeadOrigem[]).map((value) => ({ value, label: ORIGEM_LABEL[value] }))
}

// ── export bundle (CSV/JSON + AI prompt source) ──────────────────────────────
export async function getExportBundle(mes?: string, periodo: Periodo = "mes"): Promise<ExportBundle> {
  const m = mes ?? currentMes()
  const scope = periodScope(m, periodo)
  const [kpis, funil, campanhas, origens, leads] = await Promise.all([
    getComercialKpis(m, periodo),
    getFunil(m, periodo),
    getCampanhas(m, periodo),
    getOrigemBreakdown(m, periodo),
    getLeads(m, periodo),
  ])
  return { scope: { mes: m, periodo, title: scope.title, sub: scope.sub }, kpis, funil, campanhas, origens, leads }
}

// ── raw dataset for the client app ───────────────────────────────────────────
// One server fetch of campaigns + leads + ad-spend; the client app does period
// scoping + metric computation (instant tab/period switching). Mutations hit the
// REST routes then router.refresh() re-runs this.
const isoDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null)

export async function getComercialDataset(): Promise<CmDataset> {
  const marketingIds = await marketingCategoriaIds()
  const spendOr: Prisma.LancamentoWhereInput[] = [{ campanhaId: { not: null } }]
  if (marketingIds.length) spendOr.push({ categoriaId: { in: marketingIds } })

  const [campanhas, leads, gastos, contas, clientes, casos] = await Promise.all([
    prisma.campanha.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: { id: true, plataforma: true, nome: true, objetivo: true, status: true, dataInicio: true, dataFim: true, externalId: true, area: true },
    }),
    prisma.lead.findMany({
      orderBy: { dataEntrada: "desc" },
      select: {
        id: true,
        nome: true,
        telefone: true,
        origem: true,
        campanhaId: true,
        etapa: true,
        valorEstimadoCents: true,
        dataEntrada: true,
        dataConversao: true,
        motivoPerda: true,
        area: true,
        casoId: true,
        cliente: { select: { nome: true } },
        caso: { select: { titulo: true, ...casoRevenueInclude } },
        honorario: { select: { valorCents: true } },
      },
    }),
    prisma.lancamento.findMany({
      where: { tipo: "saida", isAnomalia: false, OR: spendOr },
      orderBy: { dataLancamento: "desc" },
      select: { id: true, campanhaId: true, valorCents: true, dataLancamento: true, dataVencimento: true, descricao: true, conta: { select: { nome: true } } },
    }),
    getContasOptions(),
    getClienteOptions(),
    getCasoOptions(),
  ])

  const valorLeadMap = valorContratadoPorLead(
    leads
      .filter((l) => l.etapa === "ganho")
      .map((l) => ({
        id: l.id,
        casoId: l.casoId,
        conv: l.dataConversao?.getTime() ?? 0,
        honorarioCents: l.honorario?.valorCents ?? 0,
        casoRevenueCents: casoRevenueCents(l.caso),
        estimadoCents: l.valorEstimadoCents ?? 0,
      })),
  )

  return {
    campaigns: campanhas.map((c): CmDatasetCampaign => ({
      id: c.id,
      plataforma: c.plataforma as Plataforma,
      nome: c.nome,
      objetivo: c.objetivo,
      status: c.status as CampanhaStatus,
      inicio: isoDate(c.dataInicio),
      fim: isoDate(c.dataFim),
      extId: c.externalId,
      area: c.area,
    })),
    leads: leads.map((l): CmDatasetLead => ({
      id: l.id,
      nome: l.nome,
      contato: l.telefone,
      origem: l.origem as LeadOrigem,
      campanhaId: l.campanhaId,
      etapa: l.etapa as LeadEtapa,
      valorEstimadoCents: l.valorEstimadoCents ?? 0,
      // Contracted value follows the REAL honorários of the lead's caso (deduped
      // per caso), so lançar honorários no caso + marcar o lead ganho já alimenta
      // o ROI — sem depender do "Converter". Fallback: honorário ligado ao lead.
      valorContratadoCents: valorLeadMap.get(l.id) ?? null,
      dataEntrada: isoDate(l.dataEntrada),
      dataConv: isoDate(l.dataConversao),
      cliente: l.cliente?.nome ?? null,
      caso: l.caso?.titulo ?? null,
      motivoPerda: l.motivoPerda,
      area: l.area,
    })),
    gastos: gastos.map((g): CmDatasetGasto => ({
      id: g.id,
      campanhaId: g.campanhaId,
      valorCents: Math.abs(g.valorCents),
      // Competência: o gasto pertence ao mês do vencimento quando houver, senão
      // ao da data do lançamento — mesma regra do spendWhere no servidor.
      data: isoDate(g.dataVencimento ?? g.dataLancamento),
      conta: g.conta?.nome ?? null,
      descricao: g.descricao,
    })),
    contas: contas.map((c) => ({ id: c.id, nome: c.nome })),
    clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
    casos: casos.map((c) => c.nome),
  }
}

// re-exported for convenience so callers don't reach into types for labels
export { PLATAFORMA_LABEL }
