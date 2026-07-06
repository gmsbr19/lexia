import { describe, expect, it } from "vitest"
import { valorContratadoPorLead, somaValorContratado, type LeadValorInput } from "@/lib/comercial/valor"

const lead = (over: Partial<LeadValorInput>): LeadValorInput => ({
  id: 1,
  casoId: null,
  conv: 0,
  honorarioCents: 0,
  casoRevenueCents: 0,
  estimadoCents: 0,
  ...over,
})

describe("valorContratadoPorLead", () => {
  it("values a won lead by the real revenue of its caso", () => {
    const m = valorContratadoPorLead([lead({ id: 1, casoId: 10, casoRevenueCents: 240000 })])
    expect(m.get(1)).toBe(240000)
  })

  it("credits a caso's revenue ONCE when two leads share it (latest conversion wins)", () => {
    const m = valorContratadoPorLead([
      lead({ id: 1, casoId: 10, conv: 100, casoRevenueCents: 240000 }),
      lead({ id: 2, casoId: 10, conv: 200, casoRevenueCents: 240000 }),
    ])
    expect(m.get(2)).toBe(240000) // latest conversion carries the value
    expect(m.get(1)).toBe(0) // the other gets 0 — no double count
    expect(somaValorContratado([
      lead({ id: 1, casoId: 10, conv: 100, casoRevenueCents: 240000 }),
      lead({ id: 2, casoId: 10, conv: 200, casoRevenueCents: 240000 }),
    ])).toBe(240000)
  })

  it("prefers caso revenue over the lead's own honorário/estimate", () => {
    const m = valorContratadoPorLead([lead({ id: 1, casoId: 10, casoRevenueCents: 240000, honorarioCents: 50000, estimadoCents: 999999 })])
    expect(m.get(1)).toBe(240000)
  })

  it("falls back to the honorário linked to the lead when the caso has no revenue", () => {
    const m = valorContratadoPorLead([lead({ id: 1, casoId: 10, casoRevenueCents: 0, honorarioCents: 50000, estimadoCents: 999999 })])
    expect(m.get(1)).toBe(50000) // honorário beats estimate
  })

  it("falls back to the lead's estimate when there are no fees anywhere (Thiago case)", () => {
    // won via quick-"ganho": no honorário, caso not linked or empty → the closed
    // value the user typed as the lead estimate is used.
    const m = valorContratadoPorLead([lead({ id: 1, casoId: null, honorarioCents: 0, estimadoCents: 240000 })])
    expect(m.get(1)).toBe(240000)
  })

  it("is 0 only when even the estimate is 0", () => {
    const m = valorContratadoPorLead([lead({ id: 1, casoId: 10, casoRevenueCents: 0, honorarioCents: 0, estimadoCents: 0 })])
    expect(m.get(1)).toBe(0)
  })

  it("sums distinct casos plus caso-less leads (real revenue, honorário, estimate)", () => {
    const total = somaValorContratado([
      lead({ id: 1, casoId: 10, conv: 1, casoRevenueCents: 240000 }),
      lead({ id: 2, casoId: 11, conv: 1, casoRevenueCents: 600000 }),
      lead({ id: 3, casoId: null, honorarioCents: 30000 }),
      lead({ id: 4, casoId: null, estimadoCents: 240000 }),
    ])
    expect(total).toBe(240000 + 600000 + 30000 + 240000)
  })
})
