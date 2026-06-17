import { describe, expect, it } from "vitest"
import { aggregarCusto, rotuloTipo } from "@/lib/consumo/cost"
import type { CostBucket, CostResult } from "@/lib/consumo/types"

function r(p: Partial<CostResult> & { amount: string }): CostResult {
  return {
    currency: "USD",
    cost_type: "tokens",
    description: null,
    model: null,
    token_type: null,
    context_window: null,
    service_tier: "standard",
    workspace_id: null,
    ...p,
  }
}

const INICIO = Date.UTC(2026, 5, 1) // 2026-06-01
const FIM = Date.UTC(2026, 5, 2) //    2026-06-02 (exclusive)

const buckets: CostBucket[] = [
  {
    starting_at: "2026-06-01T00:00:00Z",
    ending_at: "2026-06-02T00:00:00Z",
    results: [
      r({ amount: "100", model: "claude-opus-4-8", token_type: "uncached_input_tokens" }), // $1.00
      r({ amount: "50", model: "claude-opus-4-8", token_type: "output_tokens" }), //          $0.50
      r({ amount: "30", model: "claude-sonnet-4-6", token_type: "output_tokens" }), //        $0.30
      r({ amount: "10", model: null, cost_type: "web_search" }), //                           $0.10
    ],
  },
  {
    // out of window — must be ignored
    starting_at: "2026-05-31T00:00:00Z",
    ending_at: "2026-06-01T00:00:00Z",
    results: [r({ amount: "9999", model: "claude-opus-4-8", token_type: "output_tokens" })],
  },
]

describe("aggregarCusto", () => {
  const agg = aggregarCusto(buckets, INICIO, FIM)

  it("sums only buckets inside the window, converting cents→USD", () => {
    expect(agg.totalUsd).toBeCloseTo(1.9, 6)
  })

  it("groups by model (token lines) and labels non-token lines", () => {
    const byModel = Object.fromEntries(agg.porModelo.map((m) => [m.rotulo, m.usd]))
    expect(byModel["claude-opus-4-8"]).toBeCloseTo(1.5, 6)
    expect(byModel["claude-sonnet-4-6"]).toBeCloseTo(0.3, 6)
    expect(byModel["Busca na web"]).toBeCloseTo(0.1, 6)
    expect(agg.porModelo[0].rotulo).toBe("claude-opus-4-8") // sorted desc by cost
  })

  it("groups by cost type", () => {
    const byTipo = Object.fromEntries(agg.porTipo.map((t) => [t.rotulo, t.usd]))
    expect(byTipo["Tokens"]).toBeCloseTo(1.8, 6)
    expect(byTipo["Busca na web"]).toBeCloseTo(0.1, 6)
  })

  it("produces one per-day entry for the in-window bucket", () => {
    expect(agg.porDia).toHaveLength(1)
    expect(agg.porDia[0].dia).toBe("2026-06-01")
    expect(agg.porDia[0].usd).toBeCloseTo(1.9, 6)
  })
})

describe("rotuloTipo", () => {
  it("maps cost types to PT-BR labels", () => {
    expect(rotuloTipo("web_search")).toBe("Busca na web")
    expect(rotuloTipo("code_execution")).toBe("Execução de código")
    expect(rotuloTipo("session_usage")).toBe("Sessões")
    expect(rotuloTipo("tokens")).toBe("Tokens")
    expect(rotuloTipo(null)).toBe("Tokens")
  })
})
