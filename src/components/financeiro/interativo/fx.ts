// Pure display helpers for the Financeiro interativo (client-safe).
import { formatBRL, formatBRLCompact } from "@/lib/finance/money"
import type { LancamentoRow, LancSituacao } from "@/lib/finance/types"

export const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export const SIT_LABEL: Record<LancSituacao, string> = { pago: "Pago", vencido: "Vencido", avencer: "A vencer" }

export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** Format integer centavos as "R$ 1.234,56" with a real minus sign. */
export const fmtMoney = (cents: number) => formatBRL(cents).replace("-", "−")
export const fmtCompact = (cents: number) => formatBRLCompact(cents).replace("-", "−")

export function fmtDateShort(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y.slice(2)}`
}
export function fmtDateLong(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return `${d} ${MES[m - 1]} ${y}`
}

export function situacao(row: Pick<LancamentoRow, "pago" | "venc">, today = todayISO()): LancSituacao {
  if (row.pago) return "pago"
  const v = (row.venc ?? "").slice(0, 10)
  return v && v < today ? "vencido" : "avencer"
}

/** Days from today to the due date (negative = overdue). */
export function daysTo(iso: string | null, today = todayISO()): number {
  if (!iso) return 0
  const a = new Date(iso.slice(0, 10) + "T12:00:00")
  const b = new Date(today + "T12:00:00")
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

export function agingLabel(daysOverdue: number): string {
  return daysOverdue <= 30 ? "1–30 dias" : daysOverdue <= 60 ? "31–60 dias" : "+60 dias"
}
