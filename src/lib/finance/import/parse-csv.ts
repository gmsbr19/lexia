import { readFileSync } from "node:fs"
import { parse } from "csv-parse/sync"

// Astrea fills empty cells with a variety of sentinels, not just "".
const NULL_SENTINELS = new Set(["", "null", "em branco", "ttcblank", "n/a", "-"])

/** Parse CSV text into an array of row objects keyed by header. */
export function parseCsvText(text: string): Record<string, string>[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true,
  }) as Record<string, string>[]
}

/** Read a CSV file into an array of row objects keyed by header. */
export function readCsv(path: string): Record<string, string>[] {
  return parseCsvText(readFileSync(path, "utf8"))
}

/** Normalize Astrea junk sentinels ("null", "Em branco", "ttcBlank", …) to null. */
export function cleanNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null
  const t = v.trim()
  if (NULL_SENTINELS.has(t.toLowerCase())) return null
  return t
}

/** Split a ';'-separated multi-value Astrea field into clean parts. */
export function multi(v: string | null | undefined): string[] {
  const t = cleanNull(v)
  if (!t) return []
  return t
    .split(";")
    .map((p) => cleanNull(p))
    .filter((p): p is string => !!p)
}

/** First clean value of a ';'-separated multi-value field, or null. */
export function firstMulti(v: string | null | undefined): string | null {
  return multi(v)[0] ?? null
}
