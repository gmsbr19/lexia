// Month-grid + pt-BR calendar label constants — pure, shared by the DatePicker
// UI and any other calendar view. WD/WD_LONG/MO/MONTHS_LONG mirror the arrays
// in src/components/tarefas/tf-meta.ts verbatim; tf-meta keeps re-exporting its
// own copies unchanged (other files already import those).
import { addDays, isoOf, parseISO } from "./util"

export const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
export const WD_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
export const MO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
export const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export interface MonthCell {
  iso: string
  dia: number
  foraDoMes: boolean
  hoje: boolean
}

/** 42 cells (6 weeks × 7 days), week starting on DOMINGO (index 0, matching
 * WD[0] and the existing hand-rolled grid in CalendarioView). Cells before day
 * 1 and after the month's last day are REAL adjacent-month dates
 * (`foraDoMes: true`), not null placeholders, so the panel can still render
 * and select them — common calendar UX. */
export function buildMonthGrid(ano: number, mes0: number, hojeISO: string): MonthCell[] {
  const firstIso = isoOf(ano, mes0, 1)
  const first = parseISO(firstIso)
  const targetYear = first.getFullYear()
  const targetMonth = first.getMonth()
  const gridStartIso = addDays(firstIso, -first.getDay())

  const cells: MonthCell[] = []
  for (let i = 0; i < 42; i++) {
    const iso = addDays(gridStartIso, i)
    const d = parseISO(iso)
    cells.push({
      iso,
      dia: d.getDate(),
      foraDoMes: d.getFullYear() !== targetYear || d.getMonth() !== targetMonth,
      hoje: iso === hojeISO,
    })
  }
  return cells
}

/** Normalizes a (year, 0-indexed month) pair after stepping by `delta` months
 * (delta may be negative). Pure integer math, no Date involved. */
export function addMonthIndex(ano: number, mes0: number, delta: number): { ano: number; mes0: number } {
  const total = ano * 12 + mes0 + delta
  const newAno = Math.floor(total / 12)
  const newMes0 = ((total % 12) + 12) % 12
  return { ano: newAno, mes0: newMes0 }
}
