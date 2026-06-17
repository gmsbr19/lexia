import { describe, expect, it } from "vitest"
import { avaliarTeto } from "@/lib/consumo/guard"
import type { RouteDecision } from "@/lib/lexia/agent/router"
import type { ConsumoOrcamento } from "@/lib/consumo/types"

const opus: RouteDecision = { model: "claude-opus-4-8", effort: "medium", maxTokens: 8000, useTools: true }
const orc = (over: Partial<ConsumoOrcamento> = {}): ConsumoOrcamento => ({
  orcamentoUsd: 100,
  brlRate: null,
  autoDowngrade: true,
  limiarPct: 90,
  ...over,
})

describe("budget guard — avaliarTeto (pure)", () => {
  it("passes through when disabled or uncapped, even way over spend", () => {
    expect(avaliarTeto(opus, 999, orc({ autoDowngrade: false })).rebaixado).toBe(false)
    expect(avaliarTeto(opus, 999, orc({ orcamentoUsd: null })).rebaixado).toBe(false)
    expect(avaliarTeto(opus, 999, orc({ orcamentoUsd: 0 })).rebaixado).toBe(false)
  })

  it("downgrades Opus→Sonnet once spend reaches the threshold", () => {
    expect(avaliarTeto(opus, 50, orc()).rebaixado).toBe(false) // 50% < 90%
    const at = avaliarTeto(opus, 90, orc()) // exactly 90%
    expect(at.rebaixado).toBe(true)
    expect(at.decision.model).toBe("claude-sonnet-4-6")
    expect(at.decision.useTools).toBe(true) // preserves tool access
  })

  it("respects a custom limiarPct", () => {
    expect(avaliarTeto(opus, 60, orc({ limiarPct: 50 })).rebaixado).toBe(true)
    expect(avaliarTeto(opus, 60, orc({ limiarPct: 70 })).rebaixado).toBe(false)
  })

  it("flags estourado at/over 100% and never touches non-Opus turns", () => {
    expect(avaliarTeto(opus, 120, orc()).estourado).toBe(true)
    const sonnet: RouteDecision = { model: "claude-sonnet-4-6", effort: "medium", maxTokens: 8192, useTools: true }
    const r = avaliarTeto(sonnet, 120, orc())
    expect(r.rebaixado).toBe(false)
    expect(r.decision.model).toBe("claude-sonnet-4-6")
  })
})
