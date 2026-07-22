// LexIA · Comercial v2 — Leads column model + filter engine (shared by table/
// kanban/CSV), ported from the design handoff (src/com2/cx-leads-model.jsx) and
// typed over the real CmDatasetLead + derived scores. PURE (no React, no I/O).
import { ESTADO_META, type Estado } from "@/lib/comercial/score"
import type { CmDatasetLead } from "@/lib/comercial/types"
import type { CmLeadScore } from "./cm-meta"

export interface CxLeadCtx {
  campMap: Map<number, string>
  userMap: Map<number, string>
  stageLabel: (etapa: string) => string
  areaLabel: (area: string | null) => string
  origemLabel: (origem: string) => string
  tempLabel: (temp: string | null) => string
  scores: Map<number, CmLeadScore>
  /** enum option pools (labels) for the "é um de" filter */
  enums: {
    origem: string[]
    area: string[]
    temperatura: string[]
    etapa: string[]
    responsavel: string[]
  }
}

export type CxColType = "text" | "num" | "money" | "date" | "enum" | "stage" | "person"

export interface CxCol {
  key: string
  label: string
  type: CxColType
  sort?: boolean
  group?: boolean
  always?: boolean
  def?: boolean
  align?: "left" | "right"
  minW?: number
}

// Column descriptors. `group` = groupable, `sort` = sortable, `type` drives filter ops.
export const CX_COLS: CxCol[] = [
  { key: "nome", label: "Lead", type: "text", sort: true, always: true, minW: 190 },
  { key: "contato", label: "Contato", type: "text", sort: true, def: true, minW: 130 },
  { key: "origem", label: "Origem", type: "enum", group: true, sort: true, def: true, minW: 120 },
  { key: "campanha", label: "Campanha", type: "enum", group: true, sort: true, def: false, minW: 150 },
  { key: "etapa", label: "Etapa", type: "stage", group: true, sort: true, def: true, minW: 130 },
  { key: "area", label: "Área", type: "enum", group: true, sort: true, def: false, minW: 150 },
  { key: "responsavel", label: "Responsável", type: "person", group: true, sort: true, def: true, minW: 150 },
  { key: "temperatura", label: "Temp.", type: "enum", group: true, sort: true, def: true, minW: 90 },
  { key: "qualState", label: "Qualificação", type: "enum", group: true, sort: true, def: true, minW: 130 },
  { key: "fit", label: "Fit", type: "num", sort: true, def: true, align: "right", minW: 64 },
  { key: "engajamento", label: "Engaj.", type: "num", sort: true, def: true, align: "right", minW: 72 },
  { key: "valorEstimado", label: "Estimado", type: "money", sort: true, def: true, align: "right", minW: 100 },
  { key: "valorContratado", label: "Contratado", type: "money", sort: true, def: false, align: "right", minW: 108 },
  { key: "dataEntrada", label: "Entrada", type: "date", sort: true, def: true, minW: 96 },
  { key: "proximaAcao", label: "Próx. ação", type: "date", sort: true, def: false, minW: 100 },
  { key: "dataConv", label: "Conversão", type: "date", sort: true, def: false, minW: 100 },
]
export const CX_COL_MAP = Object.fromEntries(CX_COLS.map((c) => [c.key, c])) as Record<string, CxCol>
export const CX_GROUPABLE = CX_COLS.filter((c) => c.group)

/** Raw comparable value for sort/filter/group/CSV. Money is in REAIS (cents/100)
 *  so a "> 5000" rule means R$ 5.000, like the design. */
export function cxColValue(l: CmDatasetLead, key: string, ctx: CxLeadCtx): string | number {
  const s = ctx.scores.get(l.id)
  switch (key) {
    case "nome": return l.nome
    case "contato": return l.contato ?? ""
    case "origem": return ctx.origemLabel(l.origem)
    case "campanha": return l.campanhaId != null ? ctx.campMap.get(l.campanhaId) ?? "" : ""
    case "etapa": return ctx.stageLabel(l.etapa)
    case "area": return ctx.areaLabel(l.area)
    case "responsavel": return l.responsavelUserId != null ? ctx.userMap.get(l.responsavelUserId) ?? "" : ""
    case "temperatura": return ctx.tempLabel(l.temperatura)
    case "qualState": return s ? ESTADO_META[s.estado].label : ""
    case "fit": return s?.fit ?? 0
    case "engajamento": return s?.eng ?? 0
    case "valorEstimado": return (l.valorEstimadoCents || 0) / 100
    case "valorContratado": return l.valorContratadoCents != null ? l.valorContratadoCents / 100 : ""
    case "dataEntrada": return l.dataEntrada ?? ""
    case "proximaAcao": return l.proximaAcaoEm ?? ""
    case "dataConv": return l.dataConv ?? ""
    default: return ""
  }
}
/** group key + display for a groupable column */
export function cxGroupKey(l: CmDatasetLead, key: string, ctx: CxLeadCtx): string {
  const v = cxColValue(l, key, ctx)
  return v === "" || v == null ? "—" : String(v)
}

// operators per type
export const CX_OPS: Record<CxColType, { v: string; l: string }[]> = {
  text: [{ v: "contains", l: "contém" }, { v: "eq", l: "é igual a" }, { v: "ne", l: "diferente de" }, { v: "empty", l: "está vazio" }, { v: "nempty", l: "não vazio" }],
  num: [{ v: "eq", l: "=" }, { v: "gt", l: ">" }, { v: "lt", l: "<" }, { v: "between", l: "entre" }, { v: "empty", l: "vazio" }],
  money: [{ v: "eq", l: "=" }, { v: "gt", l: ">" }, { v: "lt", l: "<" }, { v: "between", l: "entre" }, { v: "empty", l: "vazio" }],
  date: [{ v: "eq", l: "em" }, { v: "gt", l: "depois de" }, { v: "lt", l: "antes de" }, { v: "between", l: "entre" }, { v: "empty", l: "vazio" }],
  enum: [{ v: "in", l: "é um de" }, { v: "ne", l: "diferente de" }, { v: "empty", l: "vazio" }],
  stage: [{ v: "in", l: "é um de" }, { v: "ne", l: "diferente de" }],
  person: [{ v: "in", l: "é um de" }, { v: "empty", l: "sem responsável" }],
}

/** distinct enum values (labels) for a column — feeds the "é um de" picker */
export function cxEnumValues(key: string, ctx: CxLeadCtx): string[] {
  switch (key) {
    case "origem": return ctx.enums.origem
    case "area": return ctx.enums.area
    case "temperatura": return ctx.enums.temperatura
    case "qualState": return (Object.keys(ESTADO_META) as Estado[]).map((e) => ESTADO_META[e].label)
    case "etapa": return ctx.enums.etapa
    case "responsavel": return ctx.enums.responsavel
    case "campanha": return [...ctx.campMap.values()]
    default: return []
  }
}

export interface CxRule {
  id: string
  col: string
  op: string
  value: string
  value2: string
  values: string[]
}

export function cxEvalRule(l: CmDatasetLead, rule: CxRule, ctx: CxLeadCtx): boolean {
  const col = CX_COL_MAP[rule.col]
  if (!col) return true
  const raw = cxColValue(l, rule.col, ctx)
  const t = col.type
  if (rule.op === "empty") return raw === "" || raw == null
  if (rule.op === "nempty") return !(raw === "" || raw == null)
  if (t === "text") {
    const s = String(raw ?? "").toLowerCase()
    const q = String(rule.value ?? "").toLowerCase()
    if (rule.op === "contains") return s.includes(q)
    if (rule.op === "eq") return s === q
    if (rule.op === "ne") return s !== q
  }
  if (t === "num" || t === "money") {
    const n = Number(raw) || 0
    const a = Number(rule.value) || 0
    const b = Number(rule.value2) || 0
    if (rule.op === "eq") return n === a
    if (rule.op === "gt") return n > a
    if (rule.op === "lt") return n < a
    if (rule.op === "between") return n >= Math.min(a, b) && n <= Math.max(a, b)
  }
  if (t === "date") {
    const s = String(raw ?? "")
    if (rule.op === "eq") return s.slice(0, 10) === rule.value
    if (rule.op === "gt") return s > (rule.value || "")
    if (rule.op === "lt") return !!s && s < (rule.value || "9999")
    if (rule.op === "between") return s >= (rule.value || "") && s <= (rule.value2 || "9999")
  }
  if (t === "enum" || t === "stage" || t === "person") {
    const vals = rule.values ?? []
    if (rule.op === "in") return vals.length === 0 ? true : vals.includes(String(raw))
    if (rule.op === "ne") return !vals.includes(String(raw))
  }
  return true
}

export function cxApplyRules(leads: CmDatasetLead[], rules: CxRule[], combinator: "E" | "OU", ctx: CxLeadCtx): CmDatasetLead[] {
  const active = rules.filter((r) => r.col && r.op)
  if (!active.length) return leads
  return leads.filter((l) => (combinator === "OU" ? active.some((r) => cxEvalRule(l, r, ctx)) : active.every((r) => cxEvalRule(l, r, ctx))))
}

// ---- CSV of the current view (visible columns; ; separated) ----
export function cxLeadsViewCSV(rows: CmDatasetLead[], visKeys: string[], ctx: CxLeadCtx): string {
  const cols = CX_COLS.filter((c) => c.always || visKeys.includes(c.key))
  const esc = (s: unknown) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c.label)).join(";")
  const lines = [head]
  rows.forEach((l) => {
    lines.push(cols.map((c) => {
      let v: string | number = cxColValue(l, c.key, ctx)
      if (c.type === "money") v = v === "" ? "" : Number(v).toFixed(2).replace(".", ",")
      return esc(v)
    }).join(";"))
  })
  return lines.join("\r\n")
}

let cxSeq = 0
export const cxNewId = (p: string) => `${p}${Date.now().toString(36)}${(++cxSeq).toString(36)}`
