import { describe, expect, it } from "vitest"
import {
  CLAUSULA_BY_ID,
  resolveClausula,
  isClausulaOverridden,
  setClausulaOverride,
  clearClausulaOverride,
} from "@/lib/documents/generators/contrato-honorarios/clausulas"
import { buildContratoHonorarios } from "@/lib/documents/generators/contrato-honorarios/content"
import { newContratoData, type ContratoHonorariosData } from "@/lib/types/contrato-honorarios"

const quinta = CLAUSULA_BY_ID["quinta"]

/** Flatten every rendered paragraph/heading into one string for assertions. */
function allText(data: ContratoHonorariosData): string {
  return buildContratoHonorarios(data)
    .map((b) =>
      b.type === "paragraph"
        ? b.chunks.map((c) => c.text).join("")
        : b.type === "heading"
        ? b.text
        : "",
    )
    .join("\n")
}

describe("resolveClausula", () => {
  it("returns the canonical text when there is no override", () => {
    expect(resolveClausula(newContratoData(), quinta)).toBe(quinta.texto)
  })
  it("returns the override when present", () => {
    const d = setClausulaOverride(newContratoData(), "quinta", "Texto novo.")
    expect(resolveClausula(d, quinta)).toBe("Texto novo.")
  })
  it("falls back to the default when the override is blank", () => {
    const d = setClausulaOverride(newContratoData(), "quinta", "   ")
    expect(resolveClausula(d, quinta)).toBe(quinta.texto)
  })
})

describe("isClausulaOverridden", () => {
  it("is false for default / equal text and true for a real change", () => {
    expect(isClausulaOverridden(newContratoData(), "quinta")).toBe(false)
    expect(isClausulaOverridden(setClausulaOverride(newContratoData(), "quinta", quinta.texto), "quinta")).toBe(false)
    expect(isClausulaOverridden(setClausulaOverride(newContratoData(), "quinta", "Outro texto."), "quinta")).toBe(true)
  })
})

describe("set / clearClausulaOverride", () => {
  it("set is immutable and clear removes the entry", () => {
    const base = newContratoData()
    const set = setClausulaOverride(base, "quinta", "X")
    expect(base.clausulas).toBeUndefined()
    expect(set.clausulas).toEqual({ quinta: "X" })
    expect(clearClausulaOverride(set, "quinta").clausulas).toBeUndefined()
  })
  it("clear preserves other overrides", () => {
    let d = newContratoData()
    d = setClausulaOverride(d, "quinta", "A")
    d = setClausulaOverride(d, "sexta", "B")
    d = clearClausulaOverride(d, "quinta")
    expect(d.clausulas).toEqual({ sexta: "B" })
  })
})

describe("buildContratoHonorarios clause override", () => {
  it("renders the overridden clause text instead of the default", () => {
    const novo = "Os honorários contratados limitam-se à primeira instância (1º grau de jurisdição)."
    const text = allText(setClausulaOverride(newContratoData(), "quinta", novo))
    expect(text).toContain(novo)
    expect(text).not.toContain("até a última instância superior")
  })
  it("keeps the default clause text when not overridden", () => {
    expect(allText(newContratoData())).toContain("até a última instância superior")
  })
})
