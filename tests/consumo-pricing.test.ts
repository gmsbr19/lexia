import { describe, expect, it } from "vitest"
import { custoUsd, precoModelo } from "@/lib/consumo/pricing"

describe("pricing — per-model USD from raw token counts", () => {
  it("prices Opus 4.8 at $5/$25 per MTok with cache multipliers", () => {
    // 1M uncached input + 1M output = $5 + $25
    expect(
      custoUsd("claude-opus-4-8", { inputTokens: 1_000_000, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 1_000_000 }),
    ).toBeCloseTo(30, 6)
    // cache write = 1.25x input ($6.25), cache read = 0.1x input ($0.50)
    expect(
      custoUsd("claude-opus-4-8", { inputTokens: 0, cacheWriteTokens: 1_000_000, cacheReadTokens: 1_000_000, outputTokens: 0 }),
    ).toBeCloseTo(6.75, 6)
  })

  it("prices the Sonnet and Haiku tiers", () => {
    expect(
      custoUsd("claude-sonnet-4-6", { inputTokens: 1_000_000, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0 }),
    ).toBeCloseTo(3, 6)
    expect(
      custoUsd("claude-haiku-4-5", { inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 1_000_000 }),
    ).toBeCloseTo(5, 6)
  })

  it("tolerates dated model ids and falls back to Sonnet for unknown models", () => {
    expect(precoModelo("claude-haiku-4-5-20251001").input).toBe(1)
    expect(precoModelo("some-future-model").input).toBe(3) // sonnet fallback (never free)
  })

  it("reproduces the Opus 06-15 export line", () => {
    const opus = custoUsd("claude-opus-4-8", {
      inputTokens: 382042,
      cacheWriteTokens: 0,
      cacheReadTokens: 610728,
      outputTokens: 25377,
    })
    expect(opus).toBeCloseTo(382042 * 5e-6 + 610728 * 0.5e-6 + 25377 * 25e-6, 6)
  })
})
