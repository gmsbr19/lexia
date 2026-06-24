// Unit tests for the areas module: slug generation, pure logic.
// Does NOT hit the DB (prisma is mocked / no setup needed for pure functions).
import { describe, expect, it } from "vitest"
import { normalizar } from "@/lib/text"

function toSlug(nome: string): string {
  return normalizar(nome)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "area"
}

describe("toSlug", () => {
  it("converts ASCII name to snake_case", () => {
    expect(toSlug("Trabalhista")).toBe("trabalhista")
  })
  it("strips accents", () => {
    expect(toSlug("Tributário")).toBe("tributario")
    expect(toSlug("Societário & M&A")).toBe("societario_m_a")
  })
  it("collapses multiple separators into one underscore", () => {
    expect(toSlug("Cível / Contratos")).toBe("civel_contratos")
  })
  it("trims leading and trailing underscores", () => {
    expect(toSlug(" --- Área --- ")).toBe("area")
  })
  it("truncates to 50 chars", () => {
    const long = "aaaaaaaaaa".repeat(6) // 60 chars
    expect(toSlug(long).length).toBe(50)
  })
  it("returns 'area' for empty / whitespace input", () => {
    expect(toSlug("")).toBe("area")
    expect(toSlug("   ")).toBe("area")
  })
})

describe("normalizar", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizar("Cível")).toBe("civel")
    expect(normalizar("Tributário")).toBe("tributario")
    expect(normalizar("Societário")).toBe("societario")
  })
  it("handles null/undefined gracefully", () => {
    expect(normalizar(null)).toBe("")
    expect(normalizar(undefined)).toBe("")
  })
})

describe("normalização map (legacy Caso.area → chave canônica)", () => {
  const normalMap: Record<string, string> = {
    trabalhista: "trab",
    tributario: "trib",
    "tributario fiscal": "trib",
    societario: "soc",
    "societario empresarial": "soc",
    civel: "civ",
    "civel contratos": "civ",
    consultoria: "int",
    internacional: "int",
  }

  const resolve = (raw: string) => {
    const key = normalizar(raw).replace(/[^a-z0-9]+/g, " ").trim()
    return normalMap[key] ?? null
  }

  it("maps 'Trabalhista' → trab", () => expect(resolve("Trabalhista")).toBe("trab"))
  it("maps 'Tributário Fiscal' → trib", () => expect(resolve("Tributário Fiscal")).toBe("trib"))
  it("maps 'Societário & Empresarial' → soc", () => expect(resolve("Societário Empresarial")).toBe("soc"))
  it("maps 'Cível / Contratos' → civ", () => expect(resolve("Cível / Contratos")).toBe("civ"))
  it("returns null for unmapped values", () => expect(resolve("Ambiental")).toBe(null))
})
