import { describe, expect, it } from "vitest"
import { valorDoEvento } from "@/lib/captacao/eventos-core"

describe("valorDoEvento — modo fixo", () => {
  it("usa o fixo genérico quando não há override por área", () => {
    const r = valorDoEvento({ area: "trab", fit: 50, valorRealCents: null }, { modo: "fixo", fixoCents: 50000, porArea: {} })
    expect(r).toEqual({ cents: 50000, motivo: "valor fixo padrão" })
  })

  it("o valor por área tem PRECEDÊNCIA sobre o fixo genérico", () => {
    const r = valorDoEvento({ area: "trab", fit: 50, valorRealCents: null }, { modo: "fixo", fixoCents: 50000, porArea: { trab: 80000 } })
    expect(r.cents).toBe(80000)
    expect(r.motivo).toContain("trab")
  })

  it("sem área correspondente no override, cai para o fixo genérico", () => {
    const r = valorDoEvento({ area: "civel", fit: 50, valorRealCents: null }, { modo: "fixo", fixoCents: 50000, porArea: { trab: 80000 } })
    expect(r.cents).toBe(50000)
  })

  it("sem fixoCents configurado → 0", () => {
    const r = valorDoEvento({ area: null, fit: 0, valorRealCents: null }, { modo: "fixo", porArea: {} })
    expect(r.cents).toBe(0)
  })
})

describe("valorDoEvento — modo fit", () => {
  const FAIXAS = [{ min: 0, cents: 10000 }, { min: 50, cents: 50000 }, { min: 80, cents: 100000 }]

  it("escolhe a MAIOR faixa que o fit atinge (não a primeira que bate)", () => {
    expect(valorDoEvento({ area: null, fit: 85, valorRealCents: null }, { modo: "fit", fitFaixas: FAIXAS }).cents).toBe(100000)
    expect(valorDoEvento({ area: null, fit: 60, valorRealCents: null }, { modo: "fit", fitFaixas: FAIXAS }).cents).toBe(50000)
    expect(valorDoEvento({ area: null, fit: 10, valorRealCents: null }, { modo: "fit", fitFaixas: FAIXAS }).cents).toBe(10000)
  })

  it("fronteira exata (min inclusivo)", () => {
    expect(valorDoEvento({ area: null, fit: 50, valorRealCents: null }, { modo: "fit", fitFaixas: FAIXAS }).cents).toBe(50000)
  })

  it("fit abaixo de todas as faixas → 0, com motivo explicando", () => {
    const r = valorDoEvento({ area: null, fit: -1, valorRealCents: null }, { modo: "fit", fitFaixas: [{ min: 10, cents: 5000 }] })
    expect(r.cents).toBe(0)
    expect(r.motivo).toMatch(/abaixo/)
  })

  it("fit ausente (undefined) trata como 0", () => {
    const r = valorDoEvento({ area: null, valorRealCents: null }, { modo: "fit", fitFaixas: FAIXAS })
    expect(r.cents).toBe(10000)
  })
})

describe("valorDoEvento — modo real", () => {
  it("usa o valor real do contrato/lançamento quando presente", () => {
    const r = valorDoEvento({ area: null, fit: 0, valorRealCents: 250000 }, { modo: "real" })
    expect(r).toEqual({ cents: 250000, motivo: "valor real do contrato/lançamento vinculado" })
  })

  it("sem valor real vinculado → 0, NUNCA inventa um número", () => {
    const r = valorDoEvento({ area: null, fit: 0, valorRealCents: null }, { modo: "real" })
    expect(r.cents).toBe(0)
    expect(r.motivo).toMatch(/não tem contrato/)
  })

  it("valor real zero ou negativo também cai no fallback de 0 (nunca envia um zero 'real')", () => {
    const r = valorDoEvento({ area: null, fit: 0, valorRealCents: 0 }, { modo: "real" })
    expect(r.cents).toBe(0)
  })
})

describe("valorDoEvento — sem regra configurada", () => {
  it("evento sem regra → 0, mas ainda devolve um motivo (a emissão do evento não é bloqueada)", () => {
    const r = valorDoEvento({ area: null, fit: 0, valorRealCents: null }, undefined)
    expect(r.cents).toBe(0)
    expect(r.motivo.length).toBeGreaterThan(0)
  })
})
