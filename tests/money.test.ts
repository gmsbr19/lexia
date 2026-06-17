import { describe, expect, it } from "vitest"
import { formatBRL, formatBRLCompact, parseBRLToCents, toCents } from "@/lib/finance/money"

// Intl pt-BR uses non-breaking spaces; normalize for readable assertions.
const norm = (s: string) => s.replace(/ /g, " ")

describe("toCents", () => {
  it("parses the Astrea export formats", () => {
    expect(toCents("-600.0")).toBe(-60000)
    expect(toCents("2500.0")).toBe(250000)
    expect(toCents("475")).toBe(47500)
  })

  it("parses pt-BR formatting", () => {
    expect(toCents("1.234,56")).toBe(123456)
    expect(toCents("1234,56")).toBe(123456)
    expect(toCents("-1.234,56")).toBe(-123456)
  })

  it("handles numbers, empties and garbage", () => {
    expect(toCents(12.34)).toBe(1234)
    expect(toCents(-0.01)).toBe(-1)
    expect(toCents(null)).toBe(0)
    expect(toCents(undefined)).toBe(0)
    expect(toCents("")).toBe(0)
    expect(toCents("abc")).toBe(0)
    expect(toCents(Number.NaN)).toBe(0)
  })
})

describe("parseBRLToCents", () => {
  it("accepts user-typed BRL strings", () => {
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456)
    expect(parseBRLToCents("1.234,56")).toBe(123456)
    expect(parseBRLToCents("1234,56")).toBe(123456)
    expect(parseBRLToCents("1234.56")).toBe(123456)
    expect(parseBRLToCents("1234")).toBe(123400)
  })

  it("accepts numbers and negatives", () => {
    expect(parseBRLToCents(12.34)).toBe(1234)
    expect(parseBRLToCents("-R$ 50,00")).toBe(-5000)
    expect(parseBRLToCents(null)).toBe(0)
  })
})

describe("formatBRL", () => {
  it("formats centavos as pt-BR currency", () => {
    expect(norm(formatBRL(123456))).toBe("R$ 1.234,56")
    expect(norm(formatBRL(0))).toBe("R$ 0,00")
  })

  it("formats negatives", () => {
    expect(norm(formatBRL(-123456))).toBe("-R$ 1.234,56")
  })
})

describe("formatBRLCompact", () => {
  it("compacts thousands and millions", () => {
    expect(formatBRLCompact(1_250_000)).toBe("R$ 12,5 mil")
    expect(formatBRLCompact(120_000_000)).toBe("R$ 1,2 mi")
    expect(formatBRLCompact(45_000)).toBe("R$ 450")
  })

  it("keeps the sign", () => {
    expect(formatBRLCompact(-1_250_000)).toBe("-R$ 12,5 mil")
  })
})
