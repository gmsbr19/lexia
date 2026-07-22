// Generic CSV → Lead column-mapping core (Fase 3 do CRM Comercial). PURE — no
// prisma, no fs, no server-only deps — so the suggestion heuristic and the
// per-row field parsing are unit-testable. The Genions raw importer (leads.ts)
// stays as-is for the fixed Genions "Relatório de atendimentos" export; THIS
// module powers the user-driven "map any CSV column → lead field" flow.
import type { LeadEtapa, LeadOrigem } from "../types"

export type MappedField =
  | "nome"
  | "email"
  | "telefone"
  | "origem"
  | "campanha"
  | "etapa"
  | "valorEstimado"
  | "dataEntrada"
  | "temperatura"
  | "observacoes"

// Target fields shown in the mapping UI (order = display order). Only `nome` is
// required; every other column is optional.
export const MAP_FIELDS: { field: MappedField; label: string; required?: boolean }[] = [
  { field: "nome", label: "Nome do lead", required: true },
  { field: "email", label: "E-mail" },
  { field: "telefone", label: "Telefone / WhatsApp" },
  { field: "origem", label: "Origem" },
  { field: "campanha", label: "Campanha" },
  { field: "etapa", label: "Etapa do funil" },
  { field: "valorEstimado", label: "Valor estimado" },
  { field: "dataEntrada", label: "Data de entrada" },
  { field: "temperatura", label: "Temperatura" },
  { field: "observacoes", label: "Observações" },
]

export type Temperatura = "quente" | "morno" | "frio"

// header→field mapping ("" = ignore this column)
export type ColumnMapping = Record<string, MappedField | "">

const norm = (v: string | null | undefined): string =>
  (v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()

function clean(v: string | null | undefined): string | null {
  if (v == null) return null
  const t = v.trim()
  if (!t) return null
  if (["null", "n/a", "-", "em branco", "ttcblank"].includes(t.toLowerCase())) return null
  return t
}

// Auto-suggested mapping from header names. Each field is claimed by the FIRST
// header that matches its keywords (so a sheet with both "Nome" and "Cliente"
// doesn't map both onto `nome`). Purely a suggestion — the user overrides it.
const HINTS: [MappedField, string[]][] = [
  ["nome", ["nome", "name", "lead", "cliente", "contato/nome"]],
  ["email", ["email", "e-mail", "mail"]],
  ["telefone", ["telefone", "phone", "celular", "whatsapp", "fone", "tel", "cel"]],
  ["origem", ["origem", "source", "fonte", "canal", "utm"]],
  ["campanha", ["campanha", "campaign"]],
  ["etapa", ["etapa", "stage", "status", "situa", "fase", "estagio", "funil", "classifica"]],
  ["valorEstimado", ["valor", "value", "estimado", "ticket", "preco", "amount"]],
  ["dataEntrada", ["data", "date", "entrada", "criado", "created"]],
  ["temperatura", ["temperatura", "temperature", "score"]],
  ["observacoes", ["observ", "obs", "nota", "note", "coment", "descri"]],
]

export function suggestMapping(headers: string[]): ColumnMapping {
  const out: ColumnMapping = {}
  const used = new Set<MappedField>()
  for (const h of headers) {
    const n = norm(h)
    let matched: MappedField | "" = ""
    for (const [field, kws] of HINTS) {
      if (used.has(field)) continue
      if (kws.some((k) => n.includes(k))) {
        matched = field
        break
      }
    }
    if (matched) used.add(matched)
    out[h] = matched
  }
  return out
}

export function parseOrigemMapeada(v: string | null | undefined): LeadOrigem {
  const s = norm(v)
  if (!s) return "outro"
  if (s.includes("google") || s.includes("adwords")) return "google_ads"
  if (s.includes("meta") || s.includes("insta") || s.includes("face") || s.includes("fb")) return "meta_ads"
  if (s.includes("indica")) return "indicacao"
  if (s.includes("organic") || s.includes("organ") || s.includes("site") || s.includes("busca")) return "organico"
  return "outro"
}

export function parseTemperaturaMapeada(v: string | null | undefined): Temperatura | null {
  const s = norm(v)
  if (s.includes("quente") || s.includes("hot")) return "quente"
  if (s.includes("morno") || s.includes("warm")) return "morno"
  if (s.includes("frio") || s.includes("cold")) return "frio"
  return null
}

// Resolve a foreign etapa value onto our funnel. Terminals win first (they carry
// business logic), then an exact key/label match against the configured open
// stages, then a lenient contains-match, else the first open stage.
export function resolveEtapaMapeada(v: string | null | undefined, stages: { key: string; nome: string }[]): LeadEtapa {
  const s = norm(v)
  if (!s) return stages[0]?.key ?? "novo"
  if (s.includes("ganho") || s.includes("won") || s.includes("fechad") || s.includes("convert")) return "ganho"
  if (s.includes("perdid") || s.includes("lost")) return "perdido"
  for (const st of stages) if (norm(st.key) === s || norm(st.nome) === s) return st.key
  for (const st of stages) if (s.includes(norm(st.key)) || s.includes(norm(st.nome))) return st.key
  return stages[0]?.key ?? "novo"
}

// Lenient BRL/number → centavos. Handles "R$ 1.234,56", "1234.56", "1,234.56".
export function parseValorCents(v: string | null | undefined): number | null {
  const s = clean(v)
  if (!s) return null
  let t = s.replace(/[^\d,.-]/g, "")
  if (!t || t === "-") return null
  const hasComma = t.includes(",")
  const hasDot = t.includes(".")
  if (hasComma && hasDot) {
    // The rightmost separator is the decimal point.
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", ".")
    else t = t.replace(/,/g, "")
  } else if (hasComma) {
    t = t.replace(",", ".")
  }
  const n = Number(t)
  if (!isFinite(n)) return null
  return Math.round(n * 100)
}

// Accepts ISO (yyyy-mm-dd...) and BR (dd/mm/yyyy). Returns null when unparseable
// so the caller can default (mirrors the importer's `?? new Date()`).
export function parseDataMapeada(v: string | null | undefined): Date | null {
  const s = clean(v)
  if (!s) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    if (!isNaN(d.getTime())) return d
  }
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s)
  if (br) {
    const y = Number(br[3].length === 2 ? "20" + br[3] : br[3])
    const d = new Date(y, Number(br[2]) - 1, Number(br[1]))
    if (!isNaN(d.getTime())) return d
  }
  return null
}

export interface MappedLeadInput {
  nome: string
  email: string | null
  telefone: string | null
  origem: LeadOrigem
  campanhaNome: string | null
  etapa: LeadEtapa
  valorEstimadoCents: number | null
  dataEntrada: Date | null // null → caller defaults to now
  temperatura: Temperatura | null
  observacoes: string | null
}

// Build a normalized lead payload from one parsed CSV row + the inverted mapping
// (field→header). Returns null when the required `nome` column is empty/missing.
export function rowToMappedLead(
  row: Record<string, string>,
  fieldToHeader: Partial<Record<MappedField, string>>,
  stages: { key: string; nome: string }[],
): MappedLeadInput | null {
  const get = (f: MappedField): string | null => {
    const h = fieldToHeader[f]
    return h ? clean(row[h]) : null
  }
  const nome = get("nome")
  if (!nome) return null
  return {
    nome,
    email: get("email"),
    telefone: get("telefone"),
    origem: parseOrigemMapeada(get("origem")),
    campanhaNome: get("campanha"),
    etapa: resolveEtapaMapeada(get("etapa"), stages),
    valorEstimadoCents: parseValorCents(get("valorEstimado")),
    dataEntrada: parseDataMapeada(get("dataEntrada")),
    temperatura: parseTemperaturaMapeada(get("temperatura")),
    observacoes: get("observacoes"),
  }
}

// Invert a header→field mapping to field→header (first header wins per field).
export function invertMapping(mapping: ColumnMapping): Partial<Record<MappedField, string>> {
  const out: Partial<Record<MappedField, string>> = {}
  for (const [header, field] of Object.entries(mapping)) {
    if (field && !out[field]) out[field] = header
  }
  return out
}
