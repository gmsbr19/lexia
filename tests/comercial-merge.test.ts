import { describe, expect, it } from "vitest"
import { planejarBackfillCliente } from "@/lib/comercial/merge"

describe("planejarBackfillCliente", () => {
  it("backfills empty cliente fields from the lead", () => {
    const patch = planejarBackfillCliente(
      { email: "joao@ex.com", telefone: "11 90000-0000" },
      { emails: null, telefones: null },
    )
    expect(patch).toEqual({ emails: "joao@ex.com", telefones: "11 90000-0000" })
  })

  it("never overwrites a cliente field that already has a value", () => {
    const patch = planejarBackfillCliente(
      { email: "lead@ex.com", telefone: "11 91111-1111" },
      { emails: "existente@ex.com", telefones: "11 92222-2222" },
    )
    expect(patch).toEqual({})
  })

  it("only fills the empty side when one field is set and the other isn't", () => {
    const patch = planejarBackfillCliente(
      { email: "lead@ex.com", telefone: "11 91111-1111" },
      { emails: "existente@ex.com", telefones: null },
    )
    expect(patch).toEqual({ telefones: "11 91111-1111" })
  })

  it("ignores blank/whitespace-only fields on either side", () => {
    expect(planejarBackfillCliente({ email: "   ", telefone: null }, { emails: null, telefones: null })).toEqual({})
    expect(planejarBackfillCliente({ email: "x@ex.com", telefone: null }, { emails: "   ", telefones: null })).toEqual({ emails: "x@ex.com" })
  })

  it("produces no patch when the lead has no contact info", () => {
    expect(planejarBackfillCliente({ email: null, telefone: null }, { emails: null, telefones: null })).toEqual({})
  })
})
