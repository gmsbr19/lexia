import { describe, expect, it } from "vitest"
import { fieldTypeMeta, FIELD_TYPE_OPTIONS } from "@/components/documents/editor2/field-types"
import type { PlaceholderType } from "@/lib/documents/model/types"

const ALL_TYPES: PlaceholderType[] = ["texto", "nome", "cpf", "cnpj", "rg", "oab", "data", "valor", "endereco", "email", "processo", "numero"]

describe("fieldTypeMeta", () => {
  it("maps known data types to a PT-BR label + icon", () => {
    expect(fieldTypeMeta("cpf").label).toBe("CPF")
    expect(fieldTypeMeta("endereco").label).toBe("Endereço")
    expect(fieldTypeMeta("email").label).toBe("E-mail")
    for (const t of ALL_TYPES) {
      const meta = fieldTypeMeta(t)
      expect(meta.label.length).toBeGreaterThan(0)
      expect(typeof meta.Icon).not.toBe("undefined")
    }
  })

  it("falls back to a generic field for unknown / missing types", () => {
    expect(fieldTypeMeta(undefined).label).toBe("Campo")
    expect(fieldTypeMeta(null).label).toBe("Campo")
  })

  it("exposes every data type as a pickable option (posicionar campo)", () => {
    expect(FIELD_TYPE_OPTIONS.map((o) => o.value).sort()).toEqual([...ALL_TYPES].sort())
  })
})
