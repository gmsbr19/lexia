// Saved-view preferences for the DataGrid (Fase 2 do CRM Comercial) — pure
// parser, mirrors src/lib/notificacoes/preferencias-core.ts. One JSON blob on
// User.crmViewPrefs, keyed by gridId, so a single column serves every grid
// instance (Oportunidades, Contatos). CLIENT-SAFE (no I/O).
import type { GridViewState } from "@/components/ui/datagrid/types"

export type GridId = "oportunidades" | "contatos"
export type CrmViewPrefs = Partial<Record<GridId, GridViewState>>

export function parseViewPrefs(raw: string | null | undefined): CrmViewPrefs {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === "object" ? (v as CrmViewPrefs) : {}
  } catch {
    return {}
  }
}
