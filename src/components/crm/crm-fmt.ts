// CRM formatting + date helpers. Money is integer centavos everywhere (real
// backend), formatted via the app's pt-BR formatter. Dates are ISO strings
// ("YYYY-MM-DD" or full datetime). Mirrors the design's fx*/crm* helpers.
import { formatBRL, formatBRLCompact } from "@/lib/finance/money"

export const CRM_MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
export const CRM_MON_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]
export const CRM_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

/** Real minus sign for negatives, pt-BR currency. Input is integer centavos. */
export const crmMoney = (cents: number) => formatBRL(cents).replace("-", "−")
export const crmCompact = (cents: number) => formatBRLCompact(cents).replace("-", "−")

export function crmTodayISO(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** "YYYY-MM-DD" (+n months), preserving day-of-month best-effort. */
export function crmAddMonths(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  const dt = new Date(y, m - 1 + n, d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

export function crmDate(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y.slice(2)}`
}
export function crmDateLong(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return `${d} ${CRM_MON[m - 1]} ${y}`
}
/** "Quarta, 11 jun" — weekday + day + short month. */
export function crmDateWeekday(iso: string | null): string {
  if (!iso) return "—"
  const dt = new Date(iso.slice(0, 10) + "T12:00:00")
  const [, m, d] = iso.slice(0, 10).split("-").map(Number)
  return `${CRM_WEEK[dt.getDay()]}, ${d} ${CRM_MON[m - 1]}`
}

export function crmDaysTo(iso: string | null, today = crmTodayISO()): number {
  if (!iso) return 0
  const a = new Date(iso.slice(0, 10) + "T12:00:00")
  const b = new Date(today + "T12:00:00")
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

/** Two-letter initials from a name. */
export function crmInitials(name: string): string {
  const words = (name || "?").trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return (words[0] ?? "?").slice(0, 2).toUpperCase()
}

/** Time portion "HH:MM" from a full datetime ISO, or null. */
export function crmTime(iso: string | null): string | null {
  if (!iso || iso.length <= 10) return null
  const t = iso.slice(11, 16)
  return /^\d{2}:\d{2}$/.test(t) ? t : null
}

/** Compose "YYYY-MM-DD" + "HH:MM" → "YYYY-MM-DDTHH:MM" (or just the date). */
export function crmDateTime(dia: string, hora?: string | null): string {
  return hora && /^\d{2}:\d{2}$/.test(hora) ? `${dia.slice(0, 10)}T${hora}` : dia.slice(0, 10)
}
