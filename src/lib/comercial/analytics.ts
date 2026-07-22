// Pure analysis functions for the Comercial CRM (Fase 4) — owner performance,
// weighted pipeline forecast, and activity reports. NO prisma / React imports:
// plain arrays in, plain rows out (money = integer centavos), so the SAME cores
// power the server queries (queries.ts → LexIA/briefing) AND the client tab
// (cm-meta.ts → Visão geral). Testable in isolation (tests/comercial-analytics).

export const ETAPAS_TERMINAIS = new Set(["ganho", "perdido"])
export const ehEtapaAberta = (etapa: string): boolean => !ETAPAS_TERMINAIS.has(etapa)

// ── performance por dono (responsável) ────────────────────────────────────────
export interface LeadDono {
  responsavelUserId: number | null
  etapa: string
  valorContratadoCents: number | null
}
export interface DonoDesempenho {
  userId: number | null
  nome: string
  leads: number
  abertos: number
  conversoes: number
  taxaConversaoPct: number
  valorContratadoCents: number
  ticketMedioCents: number
}

/** Aggregates leads by owner: total, open, won, conversion rate, contracted
 *  value and average ticket. Sorted by contracted value desc. `null` owner is
 *  bucketed as "Sem responsável". */
export function desempenhoPorDono(leads: LeadDono[], nomePorId: (id: number) => string): DonoDesempenho[] {
  const map = new Map<number | null, { leads: number; abertos: number; conversoes: number; valorContratadoCents: number }>()
  for (const l of leads) {
    const key = l.responsavelUserId ?? null
    const row = map.get(key) ?? { leads: 0, abertos: 0, conversoes: 0, valorContratadoCents: 0 }
    row.leads++
    if (l.etapa === "ganho") {
      row.conversoes++
      row.valorContratadoCents += l.valorContratadoCents ?? 0
    } else if (ehEtapaAberta(l.etapa)) {
      row.abertos++
    }
    map.set(key, row)
  }
  return [...map.entries()]
    .map(([userId, d]): DonoDesempenho => ({
      userId,
      nome: userId == null ? "Sem responsável" : nomePorId(userId),
      leads: d.leads,
      abertos: d.abertos,
      conversoes: d.conversoes,
      taxaConversaoPct: d.leads ? (d.conversoes / d.leads) * 100 : 0,
      valorContratadoCents: d.valorContratadoCents,
      ticketMedioCents: d.conversoes ? Math.round(d.valorContratadoCents / d.conversoes) : 0,
    }))
    .sort((a, b) => b.valorContratadoCents - a.valorContratadoCents || b.conversoes - a.conversoes || b.leads - a.leads)
}

// ── forecast ponderado (valor estimado × probabilidade por etapa) ─────────────
export interface LeadForecast {
  etapa: string
  valorEstimadoCents: number
}
export interface StageProb {
  key: string
  nome: string
  probabilidade?: number | null
}
export interface ForecastEtapa {
  key: string
  nome: string
  probabilidadePct: number
  leads: number
  valorBrutoCents: number
  valorPonderadoCents: number
}
export interface Forecast {
  etapas: ForecastEtapa[]
  totalLeads: number
  totalBrutoCents: number
  totalPonderadoCents: number
}

/** Weighted pipeline value: for each OPEN lead, expected value = valor estimado
 *  × (probabilidade da etapa / 100). Won/lost leads are settled and excluded.
 *  Open leads whose etapa was removed from the config bucket under "Outras
 *  etapas" (probabilidade 0). Stages keep the configured order. */
export function forecastPonderado(leadsAbertos: LeadForecast[], stages: StageProb[]): Forecast {
  const acc = new Map<string, { nome: string; prob: number; leads: number; bruto: number }>()
  const order: string[] = []
  for (const s of stages) {
    acc.set(s.key, { nome: s.nome, prob: s.probabilidade ?? 0, leads: 0, bruto: 0 })
    order.push(s.key)
  }
  for (const l of leadsAbertos) {
    if (!ehEtapaAberta(l.etapa)) continue
    let bucket = acc.get(l.etapa)
    if (!bucket) {
      bucket = { nome: "Outras etapas", prob: 0, leads: 0, bruto: 0 }
      acc.set(l.etapa, bucket)
      order.push(l.etapa)
    }
    bucket.leads++
    bucket.bruto += l.valorEstimadoCents ?? 0
  }
  const etapas = order
    .map((key): ForecastEtapa => {
      const b = acc.get(key)!
      return {
        key,
        nome: b.nome,
        probabilidadePct: b.prob,
        leads: b.leads,
        valorBrutoCents: b.bruto,
        valorPonderadoCents: Math.round((b.bruto * b.prob) / 100),
      }
    })
    .filter((e) => e.leads > 0)
  return {
    etapas,
    totalLeads: etapas.reduce((a, e) => a + e.leads, 0),
    totalBrutoCents: etapas.reduce((a, e) => a + e.valorBrutoCents, 0),
    totalPonderadoCents: etapas.reduce((a, e) => a + e.valorPonderadoCents, 0),
  }
}

// ── relatório de atividades (timeline manual das oportunidades) ───────────────
export const TIPOS_ATIVIDADE = ["ligacao", "email", "reuniao", "whatsapp", "nota", "outro"] as const
export const TIPO_ATIVIDADE_LABEL: Record<string, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  whatsapp: "WhatsApp",
  nota: "Nota",
  outro: "Outro",
}
export interface AtividadeMeta {
  tipo: string
  autorId: number | null
}
export interface RelatorioAtividades {
  total: number
  porTipo: { tipo: string; label: string; count: number }[]
  porDono: { userId: number | null; nome: string; count: number }[]
}

/** Counts activities by type and by author. Takes only metadata (tipo/autorId)
 *  — descrição/título are PII and never enter this report. */
export function relatorioAtividades(atividades: AtividadeMeta[], nomePorId: (id: number) => string): RelatorioAtividades {
  const tipos = new Map<string, number>()
  const donos = new Map<number | null, number>()
  for (const a of atividades) {
    tipos.set(a.tipo, (tipos.get(a.tipo) ?? 0) + 1)
    const key = a.autorId ?? null
    donos.set(key, (donos.get(key) ?? 0) + 1)
  }
  const porTipo = TIPOS_ATIVIDADE.map((tipo) => ({ tipo, label: TIPO_ATIVIDADE_LABEL[tipo], count: tipos.get(tipo) ?? 0 })).filter((r) => r.count > 0)
  const porDono = [...donos.entries()]
    .map(([userId, count]) => ({ userId, nome: userId == null ? "Sem autor" : nomePorId(userId), count }))
    .sort((a, b) => b.count - a.count)
  return { total: atividades.length, porTipo, porDono }
}
