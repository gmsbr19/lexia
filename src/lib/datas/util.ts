// Pure local-noon date-math primitives shared by every module under
// src/lib/datas/*. "YYYY-MM-DD" strings in/out only — Date objects never
// escape a caller of this module.
//
// Mirrors the local-noon anchoring trick already used in
// src/components/tarefas/tf-meta.ts: parse "YYYY-MM-DD" as
// `new Date(y, m-1, d, 12, 0, 0)` and format back via
// getFullYear/getMonth()+1/getDate() (never toISOString, never UTC methods) —
// this cancels out timezone entirely. Every function that needs "today" takes
// an explicit `hojeISO`/`iso` parameter; nothing here ever calls `new Date()`
// with no arguments.

/** Builds "YYYY-MM-DD" from a (possibly out-of-range) year/0-indexed-month/day
 * triple, letting the JS Date constructor normalize overflow/underflow. */
export function isoOf(y: number, m0: number, d: number): string {
  const dt = new Date(y, m0, d, 12, 0, 0)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

/** "YYYY-MM-DD" -> local-noon Date. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Number of days in the given (year, 0-indexed month). */
export function lastDayOfMonth(ano: number, mes0: number): number {
  return new Date(ano, mes0 + 1, 0).getDate()
}

/** Same day-of-month, CLAMPED to the last day of the target month when it
 * doesn't have that many days (e.g. addMonths("2026-01-31", 1) -> "2026-02-28"). */
export function addMonths(iso: string, n: number): string {
  const d = parseISO(iso)
  const day = d.getDate()
  // day=1 avoids day-overflow rolling the month normalization itself.
  const probe = new Date(d.getFullYear(), d.getMonth() + n, 1, 12, 0, 0)
  const clampedDay = Math.min(day, lastDayOfMonth(probe.getFullYear(), probe.getMonth()))
  return isoOf(probe.getFullYear(), probe.getMonth(), clampedDay)
}

/** 0=domingo..6=sábado (JS getDay() convention). */
export function weekdayOf(iso: string): number {
  return parseISO(iso).getDay()
}

export function dayOfMonth(iso: string): number {
  return parseISO(iso).getDate()
}

/** -1/0/1 — plain string compare is correct for fixed-width "YYYY-MM-DD", written
 * out explicitly for a clear numeric contract. */
export function compareISO(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** Rejects malformed strings AND calendar-invalid dates like "2026-02-30" by
 * constructing the Date and verifying the fields round-trip (same technique as
 * the `toDate` validator in src/lib/finance/mutations.ts — JS silently rolls
 * invalid calendar dates over instead of rejecting them). */
export function isValidISO(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d, 12, 0, 0)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
}

/** Advances to the next occurrence of weekday `alvo` (0=domingo..6=sábado)
 * strictly after `iso` by default — if `iso` itself already falls on `alvo`,
 * jumps a full week (+7), never +0. Pass `permitirHoje: true` to allow `iso`
 * itself as a valid result when it already matches. */
export function nextWeekday(iso: string, alvo: number, permitirHoje = false): string {
  const wd = weekdayOf(iso)
  let delta = (alvo - wd + 7) % 7
  if (delta === 0 && !permitirHoje) delta = 7
  return addDays(iso, delta)
}
