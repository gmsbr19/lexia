// Pure date helpers for the Processos module — especially the prazo (deadline)
// engine. All date-only values are "YYYY-MM-DD" strings manipulated with UTC
// math so results are timezone-immune (mirrors the Date.UTC idiom in
// src/lib/lexia/agent/datas.ts). No Date.now() lives in the core math — callers
// pass the reference "today" in (see prazo.ts / urgencia.ts), keeping the whole
// engine deterministic and unit-testable with NO Prisma / env import in the chain.
const TZ = "America/Sao_Paulo"

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

/** Today as "YYYY-MM-DD" in São Paulo (the office timezone). */
export function hojeISO(now: Date = new Date()): string {
  // en-CA renders ISO-shaped dates (YYYY-MM-DD).
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now)
}

/**
 * Normalize a Date or ISO-ish string to a "YYYY-MM-DD" date-only string.
 * - String inputs are sliced (TZ-safe; the repo's `periodo.ts` does the same).
 * - Date inputs use the São Paulo wall-clock day, so a 23:00 SP timestamp stays
 *   "today" instead of rolling into tomorrow's UTC date.
 */
export function toISODate(input: string | Date): string {
  if (input instanceof Date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(input)
  }
  const m = input.match(ISO_DATE)
  if (!m) throw new Error(`Data inválida: ${input}`)
  return `${m[1]}-${m[2]}-${m[3]}`
}

/** Shift a "YYYY-MM-DD" date by n calendar days (exact, UTC math). */
export function addDiasISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Weekday of a date-only string: 0=domingo … 6=sábado (UTC, so TZ-immune). */
export function weekdayISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Saturday or Sunday? */
export function isFimDeSemana(iso: string): boolean {
  const w = weekdayISO(iso)
  return w === 0 || w === 6
}

/** Lexicographic compare works for "YYYY-MM-DD": a<b → -1, a==b → 0, a>b → 1. */
export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Whole calendar days from `a` to `b` (negative if b precedes a). */
export function diasEntreISO(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number)
  const [by, bm, bd] = b.split("-").map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/** The 4-digit year of a "YYYY-MM-DD" string. */
export function anoDeISO(iso: string): number {
  return Number(iso.slice(0, 4))
}
