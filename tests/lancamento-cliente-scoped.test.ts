import { describe, expect, it } from "vitest"
import { novoLancamentoSchema } from "@/lib/finance/schemas"

// The cliente-scoped ledger (Financeiro tab on the Cliente/Contato detail page)
// relies on `clienteId` surviving the mutation boundary: the client sends it so
// the new/edited lançamento is HARD-LINKED to the current cliente (independent of
// name resolution). If the schema drops the field, criarLancamentos/editarLancamento
// fall back to name matching and freshly-created rows silently vanish from the
// filtered list. These tests lock that contract.
describe("novoLancamentoSchema — clienteId (cliente-scoped ledger)", () => {
  const base = {
    dir: "in" as const,
    desc: "Honorários · mensal",
    valorCents: 240000,
    venc: "2026-07-08",
  }

  it("preserva o clienteId explícito no payload parseado", () => {
    const parsed = novoLancamentoSchema.parse({ ...base, clienteId: 512 })
    expect(parsed.clienteId).toBe(512)
  })

  it("aceita a ausência de clienteId (Financeiro geral não envia)", () => {
    const parsed = novoLancamentoSchema.parse(base)
    expect(parsed.clienteId ?? null).toBeNull()
  })

  it("aceita clienteId null (desvincular)", () => {
    const parsed = novoLancamentoSchema.parse({ ...base, clienteId: null })
    expect(parsed.clienteId).toBeNull()
  })

  it("rejeita clienteId inválido (não-positivo)", () => {
    expect(() => novoLancamentoSchema.parse({ ...base, clienteId: 0 })).toThrow()
    expect(() => novoLancamentoSchema.parse({ ...base, clienteId: -3 })).toThrow()
  })
})
