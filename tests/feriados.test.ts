import { describe, expect, it } from "vitest"
import {
  feriadosForensesNacionais,
  feriadosNacionais,
  montarFeriados,
  pascoa,
} from "@/lib/processos/feriados"

describe("pascoa — Gregorian Easter (Meeus/Jones/Butcher)", () => {
  it("matches known Easter Sundays", () => {
    expect(pascoa(2023)).toBe("2023-04-09")
    expect(pascoa(2024)).toBe("2024-03-31")
    expect(pascoa(2025)).toBe("2025-04-20")
    expect(pascoa(2026)).toBe("2026-04-05")
    expect(pascoa(2027)).toBe("2027-03-28")
  })
})

describe("feriadosNacionais", () => {
  it("returns the 9 federal civil holidays incl. Consciência Negra (20/11)", () => {
    const f = feriadosNacionais(2026)
    expect(f).toHaveLength(9)
    expect(f).toContain("2026-01-01")
    expect(f).toContain("2026-04-21") // Tiradentes
    expect(f).toContain("2026-05-01") // Trabalho
    expect(f).toContain("2026-11-20") // Consciência Negra (Lei 14.759)
    expect(f).toContain("2026-12-25")
  })
})

describe("feriadosForensesNacionais — Easter-based", () => {
  it("derives Carnaval, Cinzas, Sexta Santa and Corpus Christi from Easter", () => {
    const f = feriadosForensesNacionais(2026) // Easter = 2026-04-05
    expect(f).toContain("2026-02-16") // Carnaval segunda (Easter-48)
    expect(f).toContain("2026-02-17") // Carnaval terça (Easter-47)
    expect(f).toContain("2026-02-18") // Quarta-feira de Cinzas (Easter-46)
    expect(f).toContain("2026-04-03") // Sexta-feira Santa (Easter-2)
    expect(f).toContain("2026-06-04") // Corpus Christi (Easter+60)
  })
})

describe("montarFeriados", () => {
  it("merges national + forensic + extras across years, deduped", () => {
    const set = montarFeriados([2025, 2026], ["2026-07-09"]) // 07/09 = SP estadual example
    expect(set.has("2026-04-21")).toBe(true)
    expect(set.has("2026-06-04")).toBe(true) // Corpus
    expect(set.has("2026-07-09")).toBe(true) // extra (estadual)
    expect(set.has("2025-12-25")).toBe(true)
    expect(set.has("2026-06-15")).toBe(false) // a plain Monday
  })
})
