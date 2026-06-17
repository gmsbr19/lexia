/** Format an ISO date string as dd/mm/yyyy (pt-BR), or "—" when absent. */
export function formatDateBR(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Format a percentage with pt-BR decimals, e.g. 8.05 → "8,1%". */
export function formatPct(n: number | null, digits = 1): string {
  if (n === null || !Number.isFinite(n)) return "—"
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
}

/** Build a KPI delta {label, dir} from a signed number, or null. */
export function deltaFrom(n: number | null, kind: "pct" | "pp"): { label: string; dir: "up" | "down" } | null {
  if (n === null || !Number.isFinite(n) || n === 0) return null
  const abs = Math.abs(n)
  const label = kind === "pp" ? `${abs.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.` : formatPct(abs)
  return { label, dir: n >= 0 ? "up" : "down" }
}
