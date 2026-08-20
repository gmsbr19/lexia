import { describe, expect, it } from "vitest"
import { buildMonthGrid, addMonthIndex } from "@/lib/datas/mes"

describe("buildMonthGrid", () => {
  it("always returns 42 cells (6 weeks × 7 days)", () => {
    expect(buildMonthGrid(2026, 6, "2026-07-24")).toHaveLength(42) // julho 2026
    expect(buildMonthGrid(2028, 1, "2028-02-15")).toHaveLength(42) // fevereiro bissexto
  })

  it("week starts on domingo — cells before day 1 belong to the previous month", () => {
    // julho/2026 começa numa quarta-feira -> a grade recua até domingo 28/jun.
    const cells = buildMonthGrid(2026, 6, "2026-07-24")
    expect(cells[0].iso).toBe("2026-06-28")
    expect(cells[0].foraDoMes).toBe(true)
    expect(cells[0].dia).toBe(28)
  })

  it("real adjacent-month dates at both edges, not null placeholders", () => {
    const cells = buildMonthGrid(2026, 6, "2026-07-24")
    // last cell of the 42 spills into agosto
    expect(cells[41].iso).toBe("2026-08-08")
    expect(cells[41].foraDoMes).toBe(true)
    expect(cells[41].dia).toBe(8)
    // the first in-month cell (dia 1 of julho) is NOT foraDoMes
    const primeiroDoMes = cells.find((c) => c.iso === "2026-07-01")
    expect(primeiroDoMes?.foraDoMes).toBe(false)
  })

  it("handles a leap February correctly — 29 in-month cells, correct edges", () => {
    const cells = buildMonthGrid(2028, 1, "2028-02-15")
    expect(cells[0].iso).toBe("2028-01-30")
    expect(cells[0].foraDoMes).toBe(true)
    expect(cells[41].iso).toBe("2028-03-11")
    expect(cells[41].foraDoMes).toBe(true)
    const emFevereiro = cells.filter((c) => !c.foraDoMes)
    expect(emFevereiro).toHaveLength(29)
    expect(emFevereiro[0].iso).toBe("2028-02-01")
    expect(emFevereiro[28].iso).toBe("2028-02-29")
  })

  it("flags exactly the cell matching hojeISO", () => {
    const cells = buildMonthGrid(2026, 6, "2026-07-24")
    const hojeCells = cells.filter((c) => c.hoje)
    expect(hojeCells).toHaveLength(1)
    expect(hojeCells[0].iso).toBe("2026-07-24")
  })

  it("hoje is false for every cell when hojeISO falls outside the grid entirely", () => {
    const cells = buildMonthGrid(2026, 6, "2020-01-01")
    expect(cells.some((c) => c.hoje)).toBe(false)
  })
})

describe("addMonthIndex", () => {
  it("steps forward and normalizes month overflow into the next year", () => {
    expect(addMonthIndex(2026, 11, 1)).toEqual({ ano: 2027, mes0: 0 }) // dez -> jan
  })
  it("steps backward and normalizes month underflow into the previous year", () => {
    expect(addMonthIndex(2026, 0, -1)).toEqual({ ano: 2025, mes0: 11 }) // jan -> dez
  })
  it("no-op for delta 0", () => {
    expect(addMonthIndex(2026, 6, 0)).toEqual({ ano: 2026, mes0: 6 })
  })
})
