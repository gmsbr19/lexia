// Astrea uses TWO date formats in the same backup:
//   • Entradas.csv  → ISO "yyyy-mm-dd"
//   • every other file → "dd/mm/yyyy hh:mm" (or "dd/mm/yyyy")
// We store date-only at local noon so the month never shifts under timezone
// conversion (a midnight value can roll back a day → wrong month on the curve).

import { cleanNull } from "./parse-csv"

function atNoon(y: number, m: number, d: number): Date | null {
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d, 12, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Parse "dd/mm/yyyy" or "dd/mm/yyyy hh:mm". */
export function parseBr(v: string | null | undefined): Date | null {
  const t = cleanNull(v)
  if (!t) return null
  const [d, m, y] = t.split(" ")[0].split("/").map((n) => Number.parseInt(n, 10))
  return atNoon(y, m, d)
}

/** Parse ISO "yyyy-mm-dd" (optionally with a time component). */
export function parseIso(v: string | null | undefined): Date | null {
  const t = cleanNull(v)
  if (!t) return null
  const [y, m, d] = t.split(/[ T]/)[0].split("-").map((n) => Number.parseInt(n, 10))
  return atNoon(y, m, d)
}
