// LexIA · Comercial — client-side taxonomies, formatters, period scope and metric
// computations (ported from the design store). PURE / client-safe — money is
// integer centavos throughout. Period scoping + metrics run client-side so tab /
// period switching is instant; mutations persist via the REST API + refresh.
import { cmRedactLeads } from "@/lib/comercial/lgpd"
import {
  desempenhoPorDono,
  forecastPonderado,
  relatorioAtividades,
  type DonoDesempenho,
  type Forecast,
  type RelatorioAtividades,
  type StageProb,
} from "@/lib/comercial/analytics"
import {
  contarToques,
  engajamentoScore,
  ESTADO_META,
  estadoLead,
  fitScore,
  prioridadeLead,
  proximoToque,
  urgenciaTemporal,
  type Estado,
  type ProximoToque,
} from "@/lib/comercial/score"
import type { FollowupConfig, ScoringConfig } from "@/lib/settings"
import {
  CAMPANHA_STATUS_LABEL,
  ETAPA_LABEL,
  ORIGEM_LABEL,
  PLATAFORMA_LABEL,
  type CampanhaStatus,
  type CmDataset,
  type CmDatasetCampaign,
  type CmDatasetGasto,
  type CmDatasetLead,
  type LeadEtapa,
  type LeadOrigem,
  type Periodo,
  type Plataforma,
} from "@/lib/comercial/types"

export { ESTADO_META }
export type { Estado }

export type { Periodo }
export { ETAPA_LABEL, ORIGEM_LABEL, PLATAFORMA_LABEL, CAMPANHA_STATUS_LABEL }

const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const MON_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

// ── money / numbers (centavos) ───────────────────────────────────────────────
const _brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export const cmMoney = (cents: number) => _brl.format((cents || 0) / 100).replace("-", "−")
export function cmCompact(cents: number): string {
  const reais = (cents || 0) / 100
  const a = Math.abs(reais)
  const s = reais < 0 ? "−" : ""
  if (a >= 1000) return `${s}R$ ${(a / 1000).toLocaleString("pt-BR", { minimumFractionDigits: a >= 100000 ? 0 : 1, maximumFractionDigits: 1 })} mil`
  return cmMoney(cents)
}
export const cmInt = (n: number) => (n || 0).toLocaleString("pt-BR")
export const cmPct = (n: number, d = 1) => `${(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`
export const cmRoas = (n: number | null) => (n == null || !isFinite(n) ? "—" : `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`)
export const cmDate = (iso: string | null) => {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y.slice(2)}`
}
export function cmToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
export const reaisToCents = (n: number) => Math.round((n || 0) * 100)
/** Parse a user-typed BRL string ("1.234,56" / "1234.56") into centavos. */
export function cmParseCents(s: string | number): number {
  if (typeof s === "number") return reaisToCents(s)
  if (!s) return 0
  const clean = String(s).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")
  const v = parseFloat(clean)
  return isNaN(v) ? 0 : reaisToCents(v)
}

// ── taxonomies ───────────────────────────────────────────────────────────────
export interface Stage { key: LeadEtapa; label: string; color: string }
export const CM_STAGES: Stage[] = [
  { key: "novo", label: "Novo", color: "#7C8AA5" },
  { key: "contato", label: "Contato", color: "#4A78C0" },
  { key: "qualificado", label: "Qualificado", color: "#C0A147" },
  { key: "proposta", label: "Proposta", color: "#9A6FB0" },
  { key: "ganho", label: "Ganho", color: "#2E9E5B" },
]
export const CM_STAGE_PERDIDO: Stage = { key: "perdido", label: "Perdido", color: "#C0492F" }
export const CM_STAGE_MAP: Record<string, Stage & { i: number }> = Object.fromEntries(
  CM_STAGES.map((s, i) => [s.key, { ...s, i }]),
)
export const reachOf = (etapa: LeadEtapa): number => (etapa === "perdido" ? 0 : CM_STAGE_MAP[etapa]?.i ?? 0)

export const ORIGENS: LeadOrigem[] = ["google_ads", "meta_ads", "organico", "indicacao", "outro"]
export const ORIGEM_COLOR: Record<LeadOrigem, string> = {
  google_ads: "#3B7DDD",
  meta_ads: "#8B5CF6",
  organico: "#2E9E5B",
  indicacao: "#C0A147",
  outro: "#7C8AA5",
}
export const PLATAFORMAS: Plataforma[] = ["google_ads", "meta_ads"]
export const PLATAFORMA_COLOR: Record<Plataforma, string> = { google_ads: "#3B7DDD", meta_ads: "#8B5CF6", outro: "#7C8AA5" }
export const PLATAFORMA_SHORT: Record<Plataforma, string> = { google_ads: "G", meta_ads: "M", outro: "·" }
export const CAMP_STATUSES: CampanhaStatus[] = ["ativa", "pausada", "encerrada"]
export const OBJETIVOS = ["Geração de leads", "Conversão", "Reconhecimento", "Tráfego"]
export const MOTIVOS = ["Preço / honorários", "Sem retorno do contato", "Escolheu concorrente", "Fora da área de atuação", "Sem orçamento no momento", "Caso inviável"]
export const TIPOS_HONORARIO = ["À vista", "Parcelado", "Recorrente", "Êxito"]
export const cmStageLabel = (k: LeadEtapa) => (k === "perdido" ? "Perdido" : CM_STAGE_MAP[k]?.label ?? k)

// ── period scope ─────────────────────────────────────────────────────────────
export interface CmRef { y: number; m: number }
export interface CmScope { title: string; sub: string; test: (iso: string | null) => boolean }

const yr = (iso: string) => Number(iso.slice(0, 4))
const moIdx = (iso: string) => Number(iso.slice(5, 7)) - 1
const dayOf = (iso: string) => Number(iso.slice(8, 10))

function inPeriod(iso: string | null, ref: CmRef, period: Periodo): boolean {
  if (!iso) return false
  if (yr(iso) !== ref.y) return false
  if (period === "ano") return true
  if (period === "trimestre") return Math.floor(moIdx(iso) / 3) === Math.floor(ref.m / 3)
  return moIdx(iso) === ref.m
}
export function cmScope(ref: CmRef, period: Periodo): CmScope {
  const { y, m } = ref
  const test = (iso: string | null) => inPeriod(iso, ref, period)
  if (period === "ano") return { title: `${y}`, sub: "Ano completo", test }
  if (period === "trimestre") {
    const q = Math.floor(m / 3)
    const a = q * 3
    return { title: `${q + 1}º trimestre`, sub: `${MON[a]}–${MON[a + 2]} · ${y}`, test }
  }
  return { title: MON_FULL[m], sub: `${y}`, test }
}
export function cmShiftRef(ref: CmRef, period: Periodo, delta: number): CmRef {
  let { y, m } = ref
  if (period === "ano") y += delta
  else if (period === "trimestre") m += delta * 3
  else m += delta
  while (m < 0) { m += 12; y -= 1 }
  while (m > 11) { m -= 12; y += 1 }
  return { y, m }
}
export function cmRefToday(): CmRef {
  const d = new Date()
  return { y: d.getFullYear(), m: d.getMonth() }
}
/** A sensible default record date for a new entry in the viewed period: today
 *  when it falls inside the scope, otherwise the LAST day of the viewed period —
 *  so an expense logged while viewing a past month lands in that month instead
 *  of silently defaulting to today. */
export function cmDefaultDateFor(ref: CmRef, period: Periodo): string {
  const today = cmToday()
  if (cmScope(ref, period).test(today)) return today
  const m = period === "ano" ? 11 : period === "trimestre" ? Math.floor(ref.m / 3) * 3 + 2 : ref.m
  const last = new Date(ref.y, m + 1, 0).getDate()
  return `${ref.y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`
}

// ── metrics (all centavos) ───────────────────────────────────────────────────
export interface CmKpiSet {
  leads: number
  conversoes: number
  taxaConv: number
  investimento: number
  valorContratado: number
  roas: number | null
  roi: number | null
  cac: number | null
  cpl: number | null
  ticket: number | null
}
/** Won leads ATTRIBUTED to the period by ENTRY date (when the lead first
 *  contacted us). A June lead counts for June even if it closes months later —
 *  it was June's spend/strategy that brought it in. Same cohort model as the
 *  funnel; keep every ad-acquisition metric on this basis. */
function ganhosDoPeriodo(leads: CmDatasetLead[], sc: CmScope): CmDatasetLead[] {
  return leads.filter((l) => l.etapa === "ganho" && sc.test(l.dataEntrada))
}

export function cmKpis(leads: CmDatasetLead[], gastos: CmDatasetGasto[], ref: CmRef, period: Periodo): CmKpiSet {
  const sc = cmScope(ref, period)
  const L = leads.filter((l) => sc.test(l.dataEntrada))
  const ganhos = ganhosDoPeriodo(leads, sc)
  const investimento = gastos.filter((g) => sc.test(g.data)).reduce((a, g) => a + g.valorCents, 0)
  const leadsN = L.length
  const conv = ganhos.length
  const valorContratado = ganhos.reduce((a, g) => a + (g.valorContratadoCents || 0), 0)
  return {
    leads: leadsN,
    conversoes: conv,
    taxaConv: leadsN ? (conv / leadsN) * 100 : 0,
    investimento,
    valorContratado,
    roas: investimento ? valorContratado / investimento : null,
    roi: investimento ? ((valorContratado - investimento) / investimento) * 100 : null,
    cac: conv ? investimento / conv : null,
    cpl: leadsN ? investimento / leadsN : null,
    ticket: conv ? valorContratado / conv : null,
  }
}
export function cmDeltaPct(cur: number | null, prev: number | null): number | null {
  if (prev == null || cur == null) return null
  if (prev === 0) return cur === 0 ? 0 : null
  return ((cur - prev) / Math.abs(prev)) * 100
}

export interface TrendBucket { label: string; leads: number; conv: number }
export function cmTrend(leads: CmDatasetLead[], ref: CmRef, period: Periodo): TrendBucket[] {
  const sc = cmScope(ref, period)
  // Leads AND their eventual conversões are plotted by ENTRY date (the cohort
  // that entered that week/month), matching the entry-based KPIs.
  const L = leads.filter((l) => sc.test(l.dataEntrada))
  let buckets: TrendBucket[]
  if (period === "mes") {
    buckets = [0, 1, 2, 3, 4].map((w) => ({ label: `S${w + 1}`, leads: 0, conv: 0 }))
    L.forEach((l) => {
      if (!l.dataEntrada) return
      const w = Math.min(4, Math.floor((dayOf(l.dataEntrada) - 1) / 7))
      buckets[w].leads++
      if (l.etapa === "ganho") buckets[w].conv++
    })
  } else if (period === "trimestre") {
    const a = Math.floor(ref.m / 3) * 3
    buckets = [0, 1, 2].map((i) => ({ label: MON[a + i], leads: 0, conv: 0 }))
    L.forEach((l) => {
      if (!l.dataEntrada) return
      const i = moIdx(l.dataEntrada) - a
      if (buckets[i]) { buckets[i].leads++; if (l.etapa === "ganho") buckets[i].conv++ }
    })
  } else {
    buckets = MON.map((m) => ({ label: m, leads: 0, conv: 0 }))
    L.forEach((l) => {
      if (!l.dataEntrada) return
      const i = moIdx(l.dataEntrada)
      buckets[i].leads++
      if (l.etapa === "ganho") buckets[i].conv++
    })
  }
  return buckets
}

export interface ChannelRow { key: string; label: string; color: string; leads: number; conversoes: number; investimento: number; valorContratado: number; roas: number | null }
export function cmChannels(dataset: Pick<CmDataset, "leads" | "gastos" | "campaigns">, ref: CmRef, period: Periodo): ChannelRow[] {
  const { leads, gastos, campaigns } = dataset
  const sc = cmScope(ref, period)
  const L = leads.filter((l) => sc.test(l.dataEntrada))
  const G = ganhosDoPeriodo(leads, sc) // won leads by entry (contact) month
  const campPlat = new Map(campaigns.map((c) => [c.id, c.plataforma]))
  const spend: Record<string, number> = { google_ads: 0, meta_ads: 0 }
  gastos.filter((g) => sc.test(g.data)).forEach((g) => {
    const p = g.campanhaId != null ? campPlat.get(g.campanhaId) : undefined
    if (p && spend[p] != null) spend[p] += g.valorCents
  })
  const defs: { key: string; label: string; color: string; test: (l: CmDatasetLead) => boolean; invest: number }[] = [
    { key: "google_ads", label: "Google Ads", color: "#3B7DDD", test: (l) => l.origem === "google_ads", invest: spend.google_ads },
    { key: "meta_ads", label: "Meta Ads", color: "#8B5CF6", test: (l) => l.origem === "meta_ads", invest: spend.meta_ads },
    { key: "organico", label: "Orgânico / Indicação", color: "#2E9E5B", test: (l) => l.origem === "organico" || l.origem === "indicacao" || l.origem === "outro", invest: 0 },
  ]
  return defs.map((d) => {
    const rows = L.filter(d.test)
    const ganhos = G.filter(d.test)
    const valor = ganhos.reduce((a, g) => a + (g.valorContratadoCents || 0), 0)
    return { key: d.key, label: d.label, color: d.color, leads: rows.length, conversoes: ganhos.length, investimento: d.invest, valorContratado: valor, roas: d.invest ? valor / d.invest : null }
  })
}

export interface CampaignStat extends CmDatasetCampaign {
  leads: number
  conversoes: number
  investimento: number
  valorContratado: number
  cpl: number | null
  cac: number | null
  roas: number | null
  roi: number | null
}
export function cmCampaignStats(dataset: Pick<CmDataset, "campaigns" | "leads" | "gastos">, ref: CmRef, period: Periodo): CampaignStat[] {
  const { campaigns, leads, gastos } = dataset
  const sc = cmScope(ref, period)
  return campaigns.map((c) => {
    const L = leads.filter((l) => l.campanhaId === c.id && sc.test(l.dataEntrada))
    const ganhos = L.filter((l) => l.etapa === "ganho")
    const invest = gastos.filter((g) => g.campanhaId === c.id && sc.test(g.data)).reduce((a, g) => a + g.valorCents, 0)
    const valor = ganhos.reduce((a, g) => a + (g.valorContratadoCents || 0), 0)
    const conv = ganhos.length
    const leadsN = L.length
    return {
      ...c,
      leads: leadsN,
      conversoes: conv,
      investimento: invest,
      valorContratado: valor,
      cpl: leadsN ? invest / leadsN : null,
      cac: conv ? invest / conv : null,
      roas: invest ? valor / invest : null,
      roi: invest ? ((valor - invest) / invest) * 100 : null,
    }
  })
}

export interface FunnelStage extends Stage { count: number; value: number; conv: number }
export interface FunnelGargalo { from: string; to: string; drop: number; conv: number }
export interface FunnelResult {
  stages: FunnelStage[]
  gargalos: FunnelGargalo[]
  ganho: number
  perdido: number
  ganhoValor: number
  perdidoValor: number
  motivos: { motivo: string; count: number; value: number }[]
  total: number
}
export function cmFunnel(leads: CmDatasetLead[], ref: CmRef, period: Periodo): FunnelResult {
  const sc = cmScope(ref, period)
  // Cohort: leads that ENTERED in the period and where they are now — same
  // entry-based attribution as the KPIs, so "Ganho" here == "Conversões".
  const L = leads.filter((l) => sc.test(l.dataEntrada))
  const stages: FunnelStage[] = CM_STAGES.map((s, i) => {
    const rows = L.filter((l) => reachOf(l.etapa) >= i)
    const value = i === 4 ? rows.reduce((a, r) => a + (r.valorContratadoCents || 0), 0) : rows.reduce((a, r) => a + r.valorEstimadoCents, 0)
    return { ...s, count: rows.length, value, conv: 0 }
  })
  stages.forEach((s, i) => { s.conv = i === 0 ? 100 : stages[i - 1].count ? (s.count / stages[i - 1].count) * 100 : 0 })
  const gargalos = stages.slice(1).map((s, i) => ({ from: stages[i].label, to: s.label, drop: stages[i].count - s.count, conv: s.conv }))
    .filter((g) => g.drop > 0).sort((a, b) => a.conv - b.conv)
  const ganho = L.filter((l) => l.etapa === "ganho")
  const perdido = L.filter((l) => l.etapa === "perdido")
  const motivos = Object.values(
    perdido.reduce<Record<string, { motivo: string; count: number; value: number }>>((m, l) => {
      const k = l.motivoPerda || "Não informado"
      m[k] = m[k] || { motivo: k, count: 0, value: 0 }
      m[k].count++
      m[k].value += l.valorEstimadoCents
      return m
    }, {}),
  ).sort((a, b) => b.count - a.count)
  return {
    stages,
    gargalos,
    ganho: ganho.length,
    perdido: perdido.length,
    ganhoValor: ganho.reduce((a, g) => a + (g.valorContratadoCents || 0), 0),
    perdidoValor: perdido.reduce((a, l) => a + l.valorEstimadoCents, 0),
    motivos,
    total: L.length,
  }
}

// ── análise (Fase 4): desempenho por dono · forecast ponderado · atividades ───
export type { DonoDesempenho, Forecast, RelatorioAtividades, StageProb }

/** Per-owner performance for the period (entry cohort). Contracted value uses
 *  the dataset's already-deduped per-caso revenue (valorContratadoCents). */
export function cmOwnerStats(dataset: Pick<CmDataset, "leads" | "usuarios">, ref: CmRef, period: Periodo): DonoDesempenho[] {
  const sc = cmScope(ref, period)
  const nome = new Map(dataset.usuarios.map((u) => [u.id, u.nome]))
  return desempenhoPorDono(
    dataset.leads
      .filter((l) => sc.test(l.dataEntrada))
      .map((l) => ({ responsavelUserId: l.responsavelUserId, etapa: l.etapa, valorContratadoCents: l.etapa === "ganho" ? l.valorContratadoCents : null })),
    (id) => nome.get(id) ?? `usuário #${id}`,
  )
}

/** Weighted forecast of the CURRENT open pipeline (não escopado por período —
 *  todo lead aberto conta). Probabilidades vêm da config do pipeline. */
export function cmForecast(leads: CmDatasetLead[], stages: StageProb[]): Forecast {
  return forecastPonderado(leads.map((l) => ({ etapa: l.etapa, valorEstimadoCents: l.valorEstimadoCents })), stages)
}

/** Activity report for the period (por tipo e por responsável), scoped by the
 *  activity date. Metadata only — sem PII. */
export function cmAtividadeReport(dataset: Pick<CmDataset, "atividades" | "usuarios">, ref: CmRef, period: Periodo): RelatorioAtividades {
  const sc = cmScope(ref, period)
  const nome = new Map(dataset.usuarios.map((u) => [u.id, u.nome]))
  return relatorioAtividades(
    dataset.atividades.filter((a) => sc.test(a.ocorreuEm)).map((a) => ({ tipo: a.tipo, autorId: a.autorId })),
    (id) => nome.get(id) ?? `usuário #${id}`,
  )
}

// ── score de leads + follow-up (Fase 5): Fit/Engajamento derivados, estado
// A-D, prioridade e sugestão de próximo toque, por lead ───────────────────
export interface CmLeadScore {
  fit: number
  eng: number
  estado: Estado
  prioridade: number
  toquesFeitos: number
  ultimoContatoISO: string | null
  proximoToque: ProximoToque | null
  reuniaoMarcada: boolean
}

/** Deriva Fit/Engajamento/Estado/Prioridade/próximo toque para CADA lead do
 *  dataset, a partir da timeline de atividades + reuniões vinculadas da
 *  agenda. Zero round-trip extra: tudo já vem no CmDataset. */
export function cmLeadScores(
  dataset: Pick<CmDataset, "leads" | "atividades" | "eventos">,
  scoringCfg: ScoringConfig,
  followupCfg: FollowupConfig,
  hojeISO: string,
): Map<number, CmLeadScore> {
  const atividadesPorLead = new Map<number, CmDataset["atividades"]>()
  for (const a of dataset.atividades) {
    const arr = atividadesPorLead.get(a.leadId) ?? []
    arr.push(a)
    atividadesPorLead.set(a.leadId, arr)
  }
  const reuniaoPorLead = new Set<number>()
  const agora = new Date(hojeISO).getTime()
  for (const e of dataset.eventos) {
    if (e.status === "confirmado" && new Date(e.dataInicio).getTime() >= agora) reuniaoPorLead.add(e.leadId)
  }

  const result = new Map<number, CmLeadScore>()
  for (const l of dataset.leads) {
    const atividades = atividadesPorLead.get(l.id) ?? []
    const fit = fitScore(
      {
        area: l.area,
        origem: l.origem,
        potencialFinanceiro: l.potencialFinanceiro,
        urgenciaNivel: l.urgenciaNivel,
        poderDecisao: l.poderDecisao,
        jurisdicao: l.jurisdicao,
        viabilidade: l.viabilidade,
      },
      scoringCfg,
    )
    const eng = engajamentoScore(
      atividades.map((a) => ({ sinais: a.sinais, resultado: a.resultado, ocorreuEm: a.ocorreuEm ?? "" })),
      scoringCfg,
    )
    const estado = estadoLead(fit, eng, scoringCfg.limiares)
    const urg = urgenciaTemporal(l.proximaAcaoEm, hojeISO, followupCfg.urgenciaHorizonteDias)
    const prioridade = prioridadeLead(fit, eng, urg, followupCfg.prioridade)
    const toquesFeitos = contarToques(atividades.map((a) => ({ toqueNumero: a.toqueNumero })))
    const ultimoContatoISO =
      atividades
        .filter((a) => a.tipo !== "nota" && a.ocorreuEm)
        .map((a) => a.ocorreuEm as string)
        .sort()
        .at(-1) ?? null
    result.set(l.id, {
      fit,
      eng,
      estado,
      prioridade,
      toquesFeitos,
      ultimoContatoISO,
      proximoToque: proximoToque(followupCfg.cadencia, toquesFeitos, l.dataEntrada ?? hojeISO, hojeISO),
      reuniaoMarcada: reuniaoPorLead.has(l.id),
    })
  }
  return result
}

// ── export (CSV / JSON / AI prompt) ──────────────────────────────────────────
export function cmDownload(filename: string, text: string, mime: string) {
  const blob = new Blob([(mime.includes("csv") ? "﻿" : "") + text], { type: `${mime};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const esc = (s: unknown) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`
const rowCsv = (arr: unknown[]) => arr.map(esc).join(";")
const reais2 = (cents: number) => ((cents || 0) / 100).toFixed(2).replace(".", ",")

export function cmLeadsCSV(leads: CmDatasetLead[], campaigns: CmDatasetCampaign[]): string {
  const cmap = new Map(campaigns.map((c) => [c.id, c.nome]))
  const head = ["Nome", "Contato", "Origem", "Campanha", "Etapa", "Valor estimado", "Data entrada", "Cliente", "Caso", "Valor contratado", "Motivo perda"]
  const lines = [rowCsv(head)]
  leads.forEach((l) =>
    lines.push(rowCsv([l.nome, l.contato, ORIGEM_LABEL[l.origem], l.campanhaId ? cmap.get(l.campanhaId) ?? "" : "", cmStageLabel(l.etapa), reais2(l.valorEstimadoCents), l.dataEntrada, l.cliente || "", l.caso || "", l.valorContratadoCents ? reais2(l.valorContratadoCents) : "", l.motivoPerda || ""])),
  )
  return lines.join("\r\n")
}

export interface CmPayload {
  periodo: { label: string; sub: string }
  kpis: CmKpiSet
  funil: FunnelResult
  canais: ChannelRow[]
  campanhas: CampaignStat[]
  leads: CmDatasetLead[]
}
export function cmPeriodPayload(dataset: CmDataset, ref: CmRef, period: Periodo): CmPayload {
  const sc = cmScope(ref, period)
  return {
    periodo: { label: sc.title, sub: sc.sub },
    kpis: cmKpis(dataset.leads, dataset.gastos, ref, period),
    funil: cmFunnel(dataset.leads, ref, period),
    canais: cmChannels(dataset, ref, period),
    campanhas: cmCampaignStats(dataset, ref, period),
    leads: dataset.leads.filter((l) => sc.test(l.dataEntrada)),
  }
}
export function cmExportJSON(dataset: CmDataset, ref: CmRef, period: Periodo, redact = false): string {
  const p = cmPeriodPayload(dataset, ref, period)
  if (redact) p.leads = cmRedactLeads(p.leads)
  return JSON.stringify(p, null, 2)
}
export function cmExportCSV(dataset: CmDataset, ref: CmRef, period: Periodo, redact = false): string {
  const p = cmPeriodPayload(dataset, ref, period)
  if (redact) p.leads = cmRedactLeads(p.leads)
  const k = p.kpis
  const out: string[] = []
  out.push(`# KPIs · ${p.periodo.label}`)
  out.push(rowCsv(["Métrica", "Valor"]))
  ;[
    ["Leads", cmInt(k.leads)], ["Conversões", cmInt(k.conversoes)], ["Taxa de conversão", cmPct(k.taxaConv)],
    ["Investimento", reais2(k.investimento)], ["Valor contratado", reais2(k.valorContratado)],
    ["ROAS", cmRoas(k.roas)], ["ROI", k.roi == null ? "—" : cmPct(k.roi, 0)],
    ["CAC", k.cac == null ? "—" : reais2(k.cac)], ["CPL", k.cpl == null ? "—" : reais2(k.cpl)], ["Ticket médio", k.ticket == null ? "—" : reais2(k.ticket)],
  ].forEach((r) => out.push(rowCsv(r)))
  out.push("", "# Funil", rowCsv(["Etapa", "Quantidade", "Valor", "Conversão da etapa"]))
  p.funil.stages.forEach((s) => out.push(rowCsv([s.label, s.count, reais2(s.value), cmPct(s.conv, 0)])))
  out.push("", "# Canais", rowCsv(["Canal", "Leads", "Conversões", "Investimento", "Valor contratado", "ROAS"]))
  p.canais.forEach((c) => out.push(rowCsv([c.label, c.leads, c.conversoes, reais2(c.investimento), reais2(c.valorContratado), cmRoas(c.roas)])))
  out.push("", "# Campanhas", rowCsv(["Plataforma", "Campanha", "Status", "Investimento", "Leads", "Conversões", "Valor contratado", "CPL", "CAC", "ROAS", "ROI"]))
  p.campanhas.forEach((c) => out.push(rowCsv([PLATAFORMA_LABEL[c.plataforma], c.nome, CAMPANHA_STATUS_LABEL[c.status], reais2(c.investimento), c.leads, c.conversoes, reais2(c.valorContratado), c.cpl == null ? "" : reais2(c.cpl), c.cac == null ? "" : reais2(c.cac), cmRoas(c.roas), c.roi == null ? "" : cmPct(c.roi, 0)])))
  out.push("", "# Leads", cmLeadsCSV(p.leads, dataset.campaigns))
  return out.join("\r\n")
}
export function cmBuildPrompt(payload: CmPayload): string {
  const k = payload.kpis
  return `Você é um analista de marketing jurídico sênior. Gere um RELATÓRIO EXECUTIVO de marketing e captação para os sócios de um escritório de advocacia, em português do Brasil, a partir dos dados do período "${payload.periodo.label} (${payload.periodo.sub})" que estão no CSV anexado.

Contexto do período (resumo):
- Leads: ${cmInt(k.leads)} · Conversões: ${cmInt(k.conversoes)} · Taxa de conversão: ${cmPct(k.taxaConv)}
- Investimento em anúncios: ${cmMoney(k.investimento)} · Valor contratado: ${cmMoney(k.valorContratado)}
- ROAS: ${cmRoas(k.roas)} · ROI: ${k.roi == null ? "—" : cmPct(k.roi, 0)} · CAC: ${k.cac == null ? "—" : cmMoney(k.cac)} · CPL: ${k.cpl == null ? "—" : cmMoney(k.cpl)} · Ticket médio: ${k.ticket == null ? "—" : cmMoney(k.ticket)}

Estruture o relatório com:
1. Veredito em uma frase: estamos ganhando dinheiro com anúncios? (sim/não e por quê)
2. Destaques do período (3 a 5 bullets com números)
3. Desempenho por canal (Google Ads, Meta Ads, Orgânico/Indicação) — onde investir mais e onde cortar
4. Saúde do funil — principais gargalos e taxa de ganho, com hipóteses
5. Campanhas: melhores e piores por ROAS/ROI, com recomendação (escalar, otimizar ou pausar)
6. 3 ações priorizadas para o próximo período, com impacto esperado

Seja direto, orientado a decisão e use os números do CSV. Evite jargão. Formate com títulos e bullets.`
}
