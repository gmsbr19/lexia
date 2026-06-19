// Projetos & Tarefas — pure client helpers (dates + live project rollup).
// The authoritative progresso/saúde are derived server-side (queries.ts); these
// mirror that logic on the client so optimistic task edits reflect instantly in
// the rail/canvas without a refetch. Ported from the design's projetos-data.jsx
// `rollup`, but anchored to the REAL current day via tf-meta.
import { MO, tDiff, tParse } from "@/components/tarefas/tf-meta"
import type { TaskRow } from "@/lib/tarefas/types"
import type { SaudeProjeto } from "@/lib/projetos/types"

/** "9 jun" — short absolute date. */
export function dateAbs(s: string | null): string {
  if (!s) return "—"
  const d = tParse(s)
  return `${d.getDate()} ${MO[d.getMonth()]}`
}

/** "9 jun 2026" — full absolute date. */
export function dateFull(s: string | null): string {
  if (!s) return "—"
  const d = tParse(s)
  return `${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear()}`
}

/** Weekend-only business-day add (no holiday calendar on the client). Used ONLY
 * for the instantiation wizard PREVIEW — the server recomputes the real CPC
 * deadlines (skipping holidays too) when the project is actually created. */
export function addBizDaysClient(iso: string, n: number): string {
  const d = tParse(iso)
  const isBiz = (x: Date) => x.getDay() !== 0 && x.getDay() !== 6
  if (n <= 0) {
    while (!isBiz(d)) d.setDate(d.getDate() + 1)
  } else {
    let added = 0
    while (added < n) {
      d.setDate(d.getDate() + 1)
      if (isBiz(d)) added++
    }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export interface LiveRollup {
  total: number
  done: number
  overdue: number
  progresso: number
  saude: SaudeProjeto
}

/** Live rollup of a project from the current (optimistic) task list. */
export function deriveRollup(projetoId: number, tasks: TaskRow[]): LiveRollup {
  const ts = tasks.filter((t) => t.projetoId === projetoId)
  const total = ts.length
  const done = ts.filter((t) => t.done).length
  const overdue = ts.filter((t) => !t.done && t.prazo && tDiff(t.prazo) < 0).length
  const progresso = total ? Math.round((done / total) * 100) : 0
  let saude: SaudeProjeto = "no_prazo"
  if (overdue > 0) saude = "atrasado"
  else if (ts.some((t) => !t.done && t.prazo && tDiff(t.prazo) <= 2)) saude = "em_risco"
  return { total, done, overdue, progresso, saude }
}
