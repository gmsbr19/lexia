// All money in Lexia is stored and passed around as integer centavos.
// Parsing happens once at import; formatting happens only at the UI edge.

/**
 * Parse a numeric value (number or string) into integer centavos.
 * Handles the formats present in the Astrea export ("-600.0", "2500.0", "475")
 * and is defensive about pt-BR formatting ("1.234,56") just in case.
 */
export function toCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) : 0
  }
  const raw = value.trim()
  if (!raw) return 0

  let normalized = raw
  const hasComma = raw.includes(",")
  const hasDot = raw.includes(".")
  if (hasComma && hasDot) {
    // "1.234,56" → dot = thousands, comma = decimal
    normalized = raw.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    // "1234,56" → comma = decimal
    normalized = raw.replace(",", ".")
  }
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/**
 * Parse a user-typed BRL string back into integer centavos, for inline editing.
 * Accepts "R$ 1.234,56", "1.234,56", "1234,56", "1234.56", "1234".
 */
export function parseBRLToCents(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : 0
  if (value === null || value === undefined) return 0
  const cleaned = value.replace(/R\$/gi, "").replace(/[\s ]/g, "")
  return toCents(cleaned)
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

/** Format integer centavos as "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  return brl.format((cents ?? 0) / 100)
}

/** Compact form for chart axes / tight spaces: "R$ 12,5 mil", "R$ 1,2 mi". */
export function formatBRLCompact(cents: number): string {
  const reais = (cents ?? 0) / 100
  const abs = Math.abs(reais)
  const sign = reais < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(1).replace(".", ",")} mil`
  return `${sign}R$ ${abs.toFixed(0)}`
}
