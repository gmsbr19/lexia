import { describe, expect, it } from "vitest"
import { valorContratadoPorLead, somaValorContratado, type LeadValorInput } from "@/lib/comercial/valor"

const lead = (over: Partial<LeadValorInput>): LeadValorInput => ({
  id: 1,
  casoId: null,
  conv: 0,
  honorarioCents: 0,
  casoHonorariosCents: 0,
  ...over,
})

describe("valorContratadoPorLead", () => {
  it("values a won lead by the real honorários of its caso", () => {
    const m = valorContratadoPorLead([lead({ id: 1, casoId: 10, casoHonorariosCents: 240000 })])
    expect(m.get(1)).toBe(240000)
  })

  it("credits a caso's honorários ONCE when two leads share it (latest conversion wins)", () => {
    const m = valorContratadoPorLead([
      lead({ id: 1, casoId: 10, conv: 100, casoHonorariosCents: 240000 }),
      lead({ id: 2, casoId: 10, conv: 200, casoHonorariosCents: 240000 }),
    ])
    expect(m.get(2)).toBe(240000) // latest conversion carries the value
    expect(m.get(1)).toBe(0) // the other gets 0 — no double count
    expect(somaValorContratado([
      lead({ id: 1, casoId: 10, conv: 100, casoHonorariosCents: 240000 }),
      lead({ id: 2, casoId: 10, conv: 200, casoHonorariosCents: 240000 }),
    ])).toBe(240000)
  })

  it("falls back to the honorário linked to the lead when there's no caso", () => {
    const m = valorContratadoPorLead([lead({ id: 1, casoId: null, honorarioCents: 50000 })])
    expect(m.get(1)).toBe(50000)
  })

  it("falls back to the linked honorário when the caso has no honorários", () => {
    const m = valorContratadoPorLead([lead({ id: 1, casoId: 10, casoHonorariosCents: 0, honorarioCents: 50000 })])
    expect(m.get(1)).toBe(50000)
  })

  it("is 0 when there are no real fees anywhere (no estimate fallback)", () => {
    const m = valorContratadoPorLead([lead({ id: 1, casoId: 10, casoHonorariosCents: 0, honorarioCents: 0 })])
    expect(m.get(1)).toBe(0)
  })

  it("sums distinct casos plus caso-less leads", () => {
    const total = somaValorContratado([
      lead({ id: 1, casoId: 10, conv: 1, casoHonorariosCents: 240000 }),
      lead({ id: 2, casoId: 11, conv: 1, casoHonorariosCents: 600000 }),
      lead({ id: 3, casoId: null, honorarioCents: 30000 }),
    ])
    expect(total).toBe(240000 + 600000 + 30000)
  })
})
