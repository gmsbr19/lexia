import { describe, expect, it } from "vitest"
import { ROLES_FINANCEIRO, verFinanceiro } from "@/lib/users/types"

describe("verFinanceiro — quem enxerga o financeiro", () => {
  it("libera apenas Sócio, Admin e Financeiro", () => {
    expect(verFinanceiro("admin")).toBe(true)
    expect(verFinanceiro("socio")).toBe(true)
    expect(verFinanceiro("financeiro")).toBe(true)
  })

  it("bloqueia a 'Equipe' (advogado, estagiário, staff)", () => {
    expect(verFinanceiro("advogado")).toBe(false)
    expect(verFinanceiro("estagiario")).toBe(false)
    expect(verFinanceiro("staff")).toBe(false)
  })

  it("trata papéis desconhecidos como Equipe (sem acesso)", () => {
    expect(verFinanceiro("")).toBe(false)
    expect(verFinanceiro("qualquer")).toBe(false)
  })

  it("o gate de mutation cobre socio+financeiro (admin passa implícito no assertRole)", () => {
    expect(ROLES_FINANCEIRO).toEqual(["socio", "financeiro"])
  })
})
