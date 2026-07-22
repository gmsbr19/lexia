import { describe, expect, it } from "vitest"
import {
  invertMapping,
  parseDataMapeada,
  parseOrigemMapeada,
  parseTemperaturaMapeada,
  parseValorCents,
  resolveEtapaMapeada,
  rowToMappedLead,
  suggestMapping,
} from "@/lib/comercial/import/mapeado-core"

const STAGES = [
  { key: "novo", nome: "Novo" },
  { key: "contato", nome: "Contato" },
  { key: "qualificado", nome: "Qualificado" },
  { key: "proposta", nome: "Proposta" },
]

describe("suggestMapping", () => {
  it("maps headers by keyword, first-wins per field", () => {
    const m = suggestMapping(["Nome completo", "Telefone", "E-mail", "Origem", "Campanha", "Etapa", "Valor", "Data", "Extra"])
    expect(m["Nome completo"]).toBe("nome")
    expect(m["Telefone"]).toBe("telefone")
    expect(m["E-mail"]).toBe("email")
    expect(m["Origem"]).toBe("origem")
    expect(m["Campanha"]).toBe("campanha")
    expect(m["Etapa"]).toBe("etapa")
    expect(m["Valor"]).toBe("valorEstimado")
    expect(m["Data"]).toBe("dataEntrada")
    expect(m["Extra"]).toBe("")
  })

  it("does not claim the same field twice", () => {
    const m = suggestMapping(["Nome", "Cliente"])
    expect(m["Nome"]).toBe("nome")
    expect(m["Cliente"]).toBe("") // nome already claimed
  })

  it("is accent-insensitive", () => {
    const m = suggestMapping(["Situação", "Observações"])
    expect(m["Situação"]).toBe("etapa")
    expect(m["Observações"]).toBe("observacoes")
  })
})

describe("parseOrigemMapeada", () => {
  it("classifies common sources", () => {
    expect(parseOrigemMapeada("Google Ads")).toBe("google_ads")
    expect(parseOrigemMapeada("Instagram")).toBe("meta_ads")
    expect(parseOrigemMapeada("META")).toBe("meta_ads")
    expect(parseOrigemMapeada("Indicação")).toBe("indicacao")
    expect(parseOrigemMapeada("Orgânico")).toBe("organico")
    expect(parseOrigemMapeada("qualquer coisa")).toBe("outro")
    expect(parseOrigemMapeada("")).toBe("outro")
  })
})

describe("parseTemperaturaMapeada", () => {
  it("maps to the 3 buckets or null", () => {
    expect(parseTemperaturaMapeada("Quente")).toBe("quente")
    expect(parseTemperaturaMapeada("warm")).toBe("morno")
    expect(parseTemperaturaMapeada("cold")).toBe("frio")
    expect(parseTemperaturaMapeada("xyz")).toBeNull()
  })
})

describe("resolveEtapaMapeada", () => {
  it("prioritizes terminals", () => {
    expect(resolveEtapaMapeada("Ganho", STAGES)).toBe("ganho")
    expect(resolveEtapaMapeada("Won", STAGES)).toBe("ganho")
    expect(resolveEtapaMapeada("Perdido", STAGES)).toBe("perdido")
  })
  it("matches configured stage by key or name", () => {
    expect(resolveEtapaMapeada("qualificado", STAGES)).toBe("qualificado")
    expect(resolveEtapaMapeada("Proposta", STAGES)).toBe("proposta")
  })
  it("falls back to the first open stage", () => {
    expect(resolveEtapaMapeada("algo desconhecido", STAGES)).toBe("novo")
    expect(resolveEtapaMapeada("", STAGES)).toBe("novo")
  })
})

describe("parseValorCents", () => {
  it("parses BR and international formats", () => {
    expect(parseValorCents("R$ 1.234,56")).toBe(123456)
    expect(parseValorCents("1234.56")).toBe(123456)
    expect(parseValorCents("1,234.56")).toBe(123456)
    expect(parseValorCents("2400")).toBe(240000)
    expect(parseValorCents("")).toBeNull()
    expect(parseValorCents("-")).toBeNull()
    expect(parseValorCents("abc")).toBeNull()
  })
})

describe("parseDataMapeada", () => {
  it("parses ISO and BR dates, null otherwise", () => {
    expect(parseDataMapeada("2026-06-15")?.getFullYear()).toBe(2026)
    expect(parseDataMapeada("15/06/2026")?.getMonth()).toBe(5)
    expect(parseDataMapeada("15/06/26")?.getFullYear()).toBe(2026)
    expect(parseDataMapeada("")).toBeNull()
    expect(parseDataMapeada("not a date")).toBeNull()
  })
})

describe("rowToMappedLead", () => {
  const mapping = { Nome: "nome", Fone: "telefone", Fonte: "origem", Fase: "etapa", Preço: "valorEstimado" } as const
  const f2h = invertMapping(mapping)

  it("builds a normalized lead payload", () => {
    const lead = rowToMappedLead(
      { Nome: "João Silva", Fone: "(19) 99999-1234", Fonte: "Google", Fase: "Proposta", Preço: "R$ 2.400,00" },
      f2h,
      STAGES,
    )
    expect(lead).not.toBeNull()
    expect(lead!.nome).toBe("João Silva")
    expect(lead!.telefone).toBe("(19) 99999-1234")
    expect(lead!.origem).toBe("google_ads")
    expect(lead!.etapa).toBe("proposta")
    expect(lead!.valorEstimadoCents).toBe(240000)
  })

  it("returns null when the required nome column is empty", () => {
    expect(rowToMappedLead({ Nome: "", Fone: "123" }, f2h, STAGES)).toBeNull()
  })

  it("defaults etapa to the first open stage and origem to outro", () => {
    const lead = rowToMappedLead({ Nome: "Maria" }, f2h, STAGES)
    expect(lead!.etapa).toBe("novo")
    expect(lead!.origem).toBe("outro")
    expect(lead!.dataEntrada).toBeNull()
  })
})

describe("invertMapping", () => {
  it("keeps the first header per field and drops blanks", () => {
    const inv = invertMapping({ A: "nome", B: "nome", C: "", D: "telefone" })
    expect(inv.nome).toBe("A")
    expect(inv.telefone).toBe("D")
  })
})
