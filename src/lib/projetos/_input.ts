// Projetos — server-only input coercion/validation. Reuses the generic tarefas
// coercers (toDate/reqStr/optStr/optId) and adds the project/template-specific
// validators. SERVER ONLY.
export { optId, optStr, reqStr, toDate } from "../tarefas/_input"
import { PROJETO_STATUS_IDS, type ProjetoStatus, type TemplateBase } from "./types"

export function validProjetoStatus(v: unknown): ProjetoStatus {
  return (typeof v === "string" && (PROJETO_STATUS_IDS as string[]).includes(v) ? v : "ativo") as ProjetoStatus
}

export function validBase(v: unknown): TemplateBase {
  return v === "anterior" ? "anterior" : "inicio"
}

/** Priority clamped to 1..4 (default 3 for projects/templates). */
export function clampPrio3(v: unknown): number {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n) || n < 1) return 3
  if (n > 4) return 4
  return n
}

/** Non-negative integer business-day offset. */
export function optOffset(v: unknown): number {
  const n = Math.trunc(Number(v))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Trimmed, non-empty string list (caps length), for DoR/DoD persisted as JSON. */
export function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 12)
}
