// Diacritic/case-insensitive text normalization for accent-insensitive search.
//
// SQLite's LIKE (what Prisma `contains` compiles to) folds case only for ASCII
// and never folds diacritics — and the Astrea-imported data mixes accented and
// unaccented spellings of the same name (e.g. "José" vs "Jose", "Conceição" vs
// "Conceicao"). So a name typed without the stored accent (very common in
// pt-BR) matches nothing. Name lookups must therefore compare on a normalized
// form. Mirrors the client-side `norm` used across the CRM pages. Pure.
export function semAcento(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** Lowercased, accent-stripped, trimmed — the canonical search key. */
export function normalizar(s: string | null | undefined): string {
  return semAcento(s).toLowerCase().trim()
}

/**
 * True when `needle` (ALREADY normalized via `normalizar`) occurs in any of the
 * given fields. Empty needle ⇒ false (callers guard the min-length case).
 */
export function contemNormalizado(needle: string, ...campos: (string | null | undefined)[]): boolean {
  if (!needle) return false
  return campos.some((c) => normalizar(c).includes(needle))
}
