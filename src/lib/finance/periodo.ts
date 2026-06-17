// Period scoping for the Financeiro interativo (mês / trimestre / ano).
// Pure + client-safe (no prisma) so both the query layer and the period-bar
// island can use it. `mes` is always a "YYYY-MM" string.
import type { Periodo, PeriodScope } from "./types"

export const MES_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
export const MES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export function normalizePeriodo(v: string | string[] | undefined): Periodo {
  const s = Array.isArray(v) ? v[0] : v
  return s === "trimestre" || s === "ano" ? s : "mes"
}

export function currentMes(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** Heading + subtitle for the current period. */
export function periodScope(mes: string, periodo: Periodo): PeriodScope {
  const [y, m] = mes.split("-").map(Number)
  const mi = m - 1
  if (periodo === "ano") return { title: `${y}`, sub: "Ano completo" }
  if (periodo === "trimestre") {
    const q = Math.floor(mi / 3)
    const a = q * 3
    return { title: `${q + 1}º trimestre`, sub: `${MES_ABBR[a]}–${MES_ABBR[a + 2]} · ${y}` }
  }
  return { title: MES_FULL[mi], sub: `${y}` }
}

/** Date range [start, end) for the scoped period (for DB/range queries). */
export function periodRange(mes: string, periodo: Periodo): { start: Date; end: Date } {
  const [y, m] = mes.split("-").map(Number)
  const mi = m - 1
  if (periodo === "ano") return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) }
  if (periodo === "trimestre") {
    const a = Math.floor(mi / 3) * 3
    return { start: new Date(y, a, 1), end: new Date(y, a + 3, 1) }
  }
  return { start: new Date(y, mi, 1), end: new Date(y, mi + 1, 1) }
}

/** Is an ISO date within the scoped period? String-based (TZ-safe). */
export function inScope(iso: string | null, mes: string, periodo: Periodo): boolean {
  if (!iso) return false
  const [y, m] = mes.split("-").map(Number)
  const mi = m - 1
  const ry = Number(iso.slice(0, 4))
  const rmi = Number(iso.slice(5, 7)) - 1
  if (periodo === "ano") return ry === y
  if (periodo === "trimestre") return ry === y && Math.floor(rmi / 3) === Math.floor(mi / 3)
  return ry === y && rmi === mi
}

/** Shift the reference period by `delta` units (months / quarters / years). */
export function shiftPeriod(mes: string, periodo: Periodo, delta: number): string {
  const [y, m] = mes.split("-").map(Number)
  let yy = y
  let mi = m - 1
  if (periodo === "ano") yy += delta
  else if (periodo === "trimestre") mi += delta * 3
  else mi += delta
  while (mi < 0) { mi += 12; yy -= 1 }
  while (mi > 11) { mi -= 12; yy += 1 }
  return `${yy}-${String(mi + 1).padStart(2, "0")}`
}
