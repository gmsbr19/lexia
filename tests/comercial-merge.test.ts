import { describe, expect, it } from "vitest"
import { planejarBackfillCliente } from "@/lib/comercial/merge"

describe("planejarBackfillCliente", () => {
  it("backfills empty cliente fields from the lead", () => {
    const patch = planejarBackfillCliente(
      { email: "joao@ex.com", telefone: "11 90000-0000", origem: "indicacao" },
      { emails: null, telefones: null, origem: null },
    )
    expect(patch).toEqual({ emails: "joao@ex.com", telefones: "11 90000-0000", origem: "indicacao" })
  })

  it("never overwrites a cliente field that already has a value", () => {
    const patch = planejarBackfillCliente(
      { email: "lead@ex.com", telefone: "11 91111-1111", origem: "google_ads" },
      { emails: "existente@ex.com", telefones: "11 92222-2222", origem: "meta_ads" },
    )
    expect(patch).toEqual({})
  })

  it("only fills the empty side when one field is set and the other isn't", () => {
    const patch = planejarBackfillCliente(
      { email: "lead@ex.com", telefone: "11 91111-1111", origem: "organico" },
      { emails: "existente@ex.com", telefones: null, origem: "outro" },
    )
    expect(patch).toEqual({ telefones: "11 91111-1111" })
  })

  it("backfills origem when the cliente has none", () => {
    const patch = planejarBackfillCliente(
      { email: null, telefone: null, origem: "google_ads" },
      { emails: "x@ex.com", telefones: "1", origem: null },
    )
    expect(patch).toEqual({ origem: "google_ads" })
  })

  it("ignores blank/whitespace-only fields on either side", () => {
    expect(planejarBackfillCliente({ email: "   ", telefone: null, origem: "  " }, { emails: null, telefones: null, origem: null })).toEqual({})
    expect(planejarBackfillCliente({ email: "x@ex.com", telefone: null, origem: null }, { emails: "   ", telefones: null, origem: null })).toEqual({ emails: "x@ex.com" })
  })

  it("produces no patch when the lead has no contact info", () => {
    expect(planejarBackfillCliente({ email: null, telefone: null, origem: null }, { emails: null, telefones: null, origem: null })).toEqual({})
  })
})
