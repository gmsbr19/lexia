import { describe, expect, it } from "vitest"
import { contemNormalizado, normalizar, semAcento } from "@/lib/text"

describe("normalizar / semAcento", () => {
  it("strips diacritics and lowercases", () => {
    expect(normalizar("Conceição")).toBe("conceicao")
    expect(normalizar("JOSÉ")).toBe("jose")
    expect(normalizar("Águas")).toBe("aguas")
    expect(normalizar("Bragança")).toBe("braganca")
    expect(normalizar("Comércio e Serviços")).toBe("comercio e servicos")
  })

  it("trims and tolerates null/undefined", () => {
    expect(normalizar("  Olá  ")).toBe("ola")
    expect(normalizar(null)).toBe("")
    expect(normalizar(undefined)).toBe("")
  })

  it("semAcento keeps case (used before lowercasing)", () => {
    expect(semAcento("José")).toBe("Jose")
  })
})

describe("contemNormalizado — accent/case-insensitive name search", () => {
  it("matches a name typed without the stored accent (the LexIA bug)", () => {
    // user types "conceicao", record stored as "...Conceição"
    expect(contemNormalizado(normalizar("conceicao"), "Ane Pamella Cristina da Conceição")).toBe(true)
    expect(contemNormalizado(normalizar("Conceição"), "ane pamella cristina da conceicao")).toBe(true)
  })

  it("unifies accented and unaccented spellings of the same query", () => {
    expect(contemNormalizado(normalizar("jose"), "José Edclaudio Alves Rocha")).toBe(true)
    expect(contemNormalizado(normalizar("josé"), "Jose Valdinei Concuruto")).toBe(true)
  })

  it("scans multiple fields and ignores a blank needle", () => {
    expect(contemNormalizado(normalizar("braganca"), null, "Vila de Bragança")).toBe(true)
    expect(contemNormalizado(normalizar("xyz"), "Conceição")).toBe(false)
    expect(contemNormalizado("", "qualquer")).toBe(false)
  })
})
