// LGPD redaction helpers — PURE + client-safe. Strips direct identifiers from
// the lead-level export payloads (telefone/email removed, names → initials)
// before they leave the app (CSV/JSON downloads, AI-prompt attachments).
import type { CmDatasetLead, ExportBundle } from "./types"

/** "Maria da Silva" → "M. S." (first + last word; connectors ignored). */
export function initials(nome: string | null | undefined): string {
  if (!nome) return ""
  const stop = new Set(["da", "de", "do", "das", "dos", "e"])
  const words = nome
    .trim()
    .split(/\s+/)
    .filter((w) => w && !stop.has(w.toLowerCase()))
  if (!words.length) return ""
  const first = words[0][0].toUpperCase()
  if (words.length === 1) return `${first}.`
  const last = words[words.length - 1][0].toUpperCase()
  return `${first}. ${last}.`
}

/** Server export bundle (API /api/comercial/export) with lead PII removed. */
export function redactBundle(bundle: ExportBundle): ExportBundle {
  return {
    ...bundle,
    leads: bundle.leads.map((l) => ({
      ...l,
      nome: initials(l.nome),
      email: null,
      telefone: null,
      cliente: l.cliente ? initials(l.cliente) : l.cliente,
    })),
  }
}

/** Client dataset leads (Exportar tab) with PII removed. */
export function cmRedactLeads(leads: CmDatasetLead[]): CmDatasetLead[] {
  return leads.map((l) => ({
    ...l,
    nome: initials(l.nome),
    contato: null,
    cliente: l.cliente ? initials(l.cliente) : l.cliente,
  }))
}
