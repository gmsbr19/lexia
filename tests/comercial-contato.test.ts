import { describe, expect, it } from "vitest"
import {
  acharClienteExistente,
  chaveTelefone,
  normalizarEmail,
  normalizarTelefone,
  planejarCriarCliente,
} from "@/lib/comercial/contato"

describe("normalizarTelefone", () => {
  it("keeps only digits", () => {
    expect(normalizarTelefone("(11) 90000-0000")).toBe("11900000000")
    expect(normalizarTelefone(null)).toBe("")
    expect(normalizarTelefone(undefined)).toBe("")
  })
})

describe("normalizarEmail", () => {
  it("lowercases and strips accents", () => {
    expect(normalizarEmail("  JOAO@Exemplo.com  ")).toBe("joao@exemplo.com")
    expect(normalizarEmail(null)).toBe("")
  })
})

describe("chaveTelefone", () => {
  it("strips the 55 country code (Genions/WhatsApp export format)", () => {
    expect(chaveTelefone("+55 11 98765-4321")).toBe(chaveTelefone("(11) 98765-4321"))
  })

  it("canonicalizes a legacy 8-digit mobile to the modern 9-digit form (same line)", () => {
    expect(chaveTelefone("11 8765-4321")).toBe(chaveTelefone("11 98765-4321"))
  })

  it("does not touch an 8-digit landline number (subscriber starts 2-5)", () => {
    expect(chaveTelefone("11 3456-7890")).toBe("1134567890")
  })

  it("combines country-code stripping and mobile canonicalization", () => {
    expect(chaveTelefone("+55 11 8765-4321")).toBe(chaveTelefone("(11) 98765-4321"))
  })
})

describe("acharClienteExistente", () => {
  const candidatos = [
    { id: 1, emails: "joao@ex.com;joao2@ex.com", telefones: "(11) 90000-0000", cpfCnpj: "111.222.333-44" },
    { id: 2, emails: null, telefones: "11 91111-1111", cpfCnpj: null },
  ]

  it("matches by cpfCnpj first (digits-only)", () => {
    expect(acharClienteExistente(candidatos, { cpfCnpj: "11122233344" })).toBe(1)
  })

  it("matches by e-mail (accent/case-insensitive) against the ';'-joined list", () => {
    expect(acharClienteExistente(candidatos, { email: "JOAO2@ex.com" })).toBe(1)
  })

  it("matches by telefone (digits-only) when e-mail doesn't match", () => {
    expect(acharClienteExistente(candidatos, { email: "nao-bate@ex.com", telefone: "(11) 91111-1111" })).toBe(2)
  })

  it("returns null when nothing matches", () => {
    expect(acharClienteExistente(candidatos, { email: "ninguem@ex.com", telefone: "11999999999" })).toBeNull()
  })

  it("returns null for an empty candidate list or no criteria", () => {
    expect(acharClienteExistente([], { email: "x@ex.com" })).toBeNull()
    expect(acharClienteExistente(candidatos, {})).toBeNull()
  })
})

describe("planejarCriarCliente", () => {
  it("builds a lead-classificacao Cliente with a unique synthetic astreaId", () => {
    const a = planejarCriarCliente({ nome: " Maria Silva ", email: "maria@ex.com", telefone: "119999", origem: "indicacao" })
    const b = planejarCriarCliente({ nome: "Maria Silva", email: "maria@ex.com", telefone: "119999", origem: "indicacao" })
    expect(a).toMatchObject({
      nome: "Maria Silva",
      tipo: "pf",
      classificacao: "lead",
      emails: "maria@ex.com",
      telefones: "119999",
      origem: "indicacao",
    })
    expect(a.astreaId).toMatch(/^app-cliente-lead-/)
    expect(a.astreaId).not.toBe(b.astreaId) // never collides across calls
  })

  it("nulls out blank optional fields", () => {
    const plan = planejarCriarCliente({ nome: "Sem Contato", email: null, telefone: "  ", origem: null })
    expect(plan.emails).toBeNull()
    expect(plan.telefones).toBeNull()
    expect(plan.origem).toBeNull()
  })
})
