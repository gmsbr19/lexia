import { getTemplate, type DocCategory } from "@/lib/documents/registry"

export const DOCUMENT_TYPE_ABBR: Record<string, string> = {
  Contrato: "CT",
  Procuração: "PR",
  Proposta: "PP",
  "Parecer Jurídico": "PJ",
}

export const DOCUMENT_EXAMPLES = [
  "Contrato de honorários mensais R$ 8.500",
  "Procuração ad judicia para ação trabalhista",
  "Proposta de consultoria empresarial",
  "Parecer sobre impacto da LGPD",
]

export const DOCUMENT_LIBRARY_FILTERS = ["Todos", "Contratos", "Procurações", "Propostas", "Pareceres"] as const

/** Resolve a documento's category (via the template registry) so the row can
 *  show the right type label / abbreviation. Falls back to "Contrato". */
export function categoriaDoTemplate(template: string): DocCategory {
  return getTemplate(template)?.category ?? "Contrato"
}

export function abreviaturaDoTemplate(template: string): string {
  return DOCUMENT_TYPE_ABBR[categoriaDoTemplate(template)] ?? "DOC"
}

/** Relative pt-BR date from an ISO string, e.g. "há 4 min", "ontem", "3 mar". */
export function dataRelativa(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `há ${diffMin} min`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `há ${diffHours}h`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return "ontem"
  if (diffDays < 7) return `há ${diffDays} dias`
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
}
