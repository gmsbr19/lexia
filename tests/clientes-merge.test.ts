import { describe, expect, it } from "vitest"
import { planejarMesclagemCliente, type MergeClienteFields } from "@/lib/clientes/merge"

const vazio: MergeClienteFields = {
  apelido: null,
  cpfCnpj: null,
  emails: null,
  telefones: null,
  origem: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  cep: null,
}

describe("planejarMesclagemCliente", () => {
  it("backfills the survivor's empty fields from the duplicate", () => {
    const alvo = { ...vazio, cpfCnpj: "111", cidade: "Campinas" }
    const dup = { ...vazio, cpfCnpj: "222", emails: "dup@ex.com", telefones: "119", origem: "indicacao", cidade: "SP" }
    const patch = planejarMesclagemCliente(alvo, dup)
    // cpfCnpj + cidade already set on alvo → kept; only the empties get filled
    expect(patch).toEqual({ emails: "dup@ex.com", telefones: "119", origem: "indicacao" })
  })

  it("never overwrites a field the survivor already has", () => {
    const alvo = { ...vazio, emails: "keep@ex.com", origem: "google_ads" }
    const dup = { ...vazio, emails: "other@ex.com", origem: "meta_ads" }
    expect(planejarMesclagemCliente(alvo, dup)).toEqual({})
  })

  it("ignores whitespace-only values on either side", () => {
    expect(planejarMesclagemCliente({ ...vazio, cidade: "  " }, { ...vazio, cidade: "  " })).toEqual({})
    expect(planejarMesclagemCliente({ ...vazio, cidade: "   " }, { ...vazio, cidade: "SP" })).toEqual({ cidade: "SP" })
  })

  it("returns an empty patch when the duplicate has nothing to give", () => {
    expect(planejarMesclagemCliente({ ...vazio, cpfCnpj: "1" }, vazio)).toEqual({})
  })
})
