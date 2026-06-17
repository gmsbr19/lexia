import { describe, expect, it } from "vitest"
import {
  currentMes,
  inScope,
  normalizePeriodo,
  periodRange,
  periodScope,
  shiftPeriod,
} from "@/lib/finance/periodo"

describe("normalizePeriodo", () => {
  it("accepts the three valid values and defaults to mes", () => {
    expect(normalizePeriodo("trimestre")).toBe("trimestre")
    expect(normalizePeriodo("ano")).toBe("ano")
    expect(normalizePeriodo("mes")).toBe("mes")
    expect(normalizePeriodo("whatever")).toBe("mes")
    expect(normalizePeriodo(undefined)).toBe("mes")
    expect(normalizePeriodo(["ano"])).toBe("ano")
  })
})

describe("currentMes", () => {
  it("zero-pads and uses local time", () => {
    expect(currentMes(new Date(2026, 5, 10))).toBe("2026-06")
    expect(currentMes(new Date(2026, 11, 31))).toBe("2026-12")
    expect(currentMes(new Date(2026, 0, 1))).toBe("2026-01")
  })
})

describe("periodScope", () => {
  it("labels months, quarters and years", () => {
    expect(periodScope("2026-06", "mes")).toEqual({ title: "Junho", sub: "2026" })
    expect(periodScope("2026-05", "trimestre")).toEqual({ title: "2º trimestre", sub: "abr–jun · 2026" })
    expect(periodScope("2026-06", "ano")).toEqual({ title: "2026", sub: "Ano completo" })
  })
})

describe("periodRange", () => {
  it("covers a month as [start, end)", () => {
    const { start, end } = periodRange("2026-06", "mes")
    expect(start).toEqual(new Date(2026, 5, 1))
    expect(end).toEqual(new Date(2026, 6, 1))
  })

  it("rolls December over into January", () => {
    const { start, end } = periodRange("2026-12", "mes")
    expect(start).toEqual(new Date(2026, 11, 1))
    expect(end).toEqual(new Date(2027, 0, 1))
  })

  it("covers the quarter containing the month", () => {
    const { start, end } = periodRange("2026-11", "trimestre")
    expect(start).toEqual(new Date(2026, 9, 1)) // Oct 1
    expect(end).toEqual(new Date(2027, 0, 1)) // Jan 1 next year
  })

  it("covers the full year", () => {
    const { start, end } = periodRange("2026-03", "ano")
    expect(start).toEqual(new Date(2026, 0, 1))
    expect(end).toEqual(new Date(2027, 0, 1))
  })
})

describe("inScope", () => {
  it("scopes by month", () => {
    expect(inScope("2026-06-15", "2026-06", "mes")).toBe(true)
    expect(inScope("2026-07-01", "2026-06", "mes")).toBe(false)
    expect(inScope(null, "2026-06", "mes")).toBe(false)
  })

  it("scopes by quarter and year", () => {
    expect(inScope("2026-04-01", "2026-06", "trimestre")).toBe(true)
    expect(inScope("2026-07-01", "2026-06", "trimestre")).toBe(false)
    expect(inScope("2026-01-01", "2026-06", "ano")).toBe(true)
    expect(inScope("2025-12-31", "2026-06", "ano")).toBe(false)
  })
})

describe("shiftPeriod", () => {
  it("shifts months across year boundaries", () => {
    expect(shiftPeriod("2026-01", "mes", -1)).toBe("2025-12")
    expect(shiftPeriod("2026-12", "mes", 1)).toBe("2027-01")
    expect(shiftPeriod("2026-06", "mes", 1)).toBe("2026-07")
  })

  it("shifts quarters and years", () => {
    expect(shiftPeriod("2026-11", "trimestre", 1)).toBe("2027-02")
    expect(shiftPeriod("2026-02", "trimestre", -1)).toBe("2025-11")
    expect(shiftPeriod("2026-06", "ano", 2)).toBe("2028-06")
  })
})
