// Local Anthropic price table (USD per million tokens) — values confirmed against
// the claude-api reference (platform.claude.com pricing). Pure module (no I/O, no
// server imports) so it's unit-testable and importable from the client settings UI.
// cache write (5m TTL) = 1.25× input, cache read = 0.1× input. We price ALL cache
// writes at the 5m rate; the 1h system-prefix write (2×) is a tiny, infrequent
// fraction, so the small under-count is immaterial. Keep in sync on model launches.

export interface ModelPrice {
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
}

export const PRECO_USD_MTOK: Record<string, ModelPrice> = {
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
}

// Unknown/aliased model → price as Sonnet (mid tier), never free.
const FALLBACK: ModelPrice = PRECO_USD_MTOK["claude-sonnet-4-6"]

export function precoModelo(modelo: string): ModelPrice {
  if (PRECO_USD_MTOK[modelo]) return PRECO_USD_MTOK[modelo]
  // Tolerate dated variants (e.g. "claude-haiku-4-5-20251001").
  for (const key of Object.keys(PRECO_USD_MTOK)) {
    if (modelo.startsWith(key)) return PRECO_USD_MTOK[key]
  }
  return FALLBACK
}

export interface TokenCounts {
  inputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
  outputTokens: number
}

/** USD cost of one usage row, from raw token counts + the model's price. */
export function custoUsd(modelo: string, t: TokenCounts): number {
  const p = precoModelo(modelo)
  return (
    (t.inputTokens * p.input +
      t.cacheWriteTokens * p.cacheWrite +
      t.cacheReadTokens * p.cacheRead +
      t.outputTokens * p.output) /
    1_000_000
  )
}
