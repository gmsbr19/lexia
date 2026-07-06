import { describe, expect, it } from "vitest"
import { modificadorLinha } from "@/lib/lexia/agent/modificadores"

describe("modificadorLinha — instrução volátil do RetryMenu 'Ajustar' (Fase 5)", () => {
  it("sem modificador → string vazia (não abre <ajuste> à toa)", () => {
    expect(modificadorLinha(undefined)).toBe("")
  })

  it("curta → pede resposta mais curta", () => {
    const s = modificadorLinha("curta")
    expect(s).toContain("<ajuste>")
    expect(s.toLowerCase()).toContain("curta")
  })

  it("formal → pede tom mais formal", () => {
    expect(modificadorLinha("formal").toLowerCase()).toContain("formal")
  })

  it("simples → pede tom mais simples/acessível", () => {
    expect(modificadorLinha("simples").toLowerCase()).toContain("simples")
  })

  it("cada variante produz um texto distinto (não é um bloco genérico repetido)", () => {
    const textos = new Set((["curta", "formal", "simples"] as const).map((m) => modificadorLinha(m)))
    expect(textos.size).toBe(3)
  })
})
