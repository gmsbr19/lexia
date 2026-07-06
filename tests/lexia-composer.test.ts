import { describe, expect, it } from "vitest"
import { detectarToken, substituirToken } from "@/components/lexia/composer-token"
import { filtrarComandos } from "@/components/lexia/comandos-data"
import { mencoesLinha } from "@/lib/lexia/agent/prompt"

describe("detectarToken — token @/ ativo no fim do valor do composer (Fase 7, D10)", () => {
  it("detecta @ no início do valor", () => {
    expect(detectarToken("@aur")).toEqual({ trigger: "@", query: "aur", from: 0 })
  })

  it("detecta @ depois de um espaço", () => {
    const t = detectarToken("oi @jo")
    expect(t).toEqual({ trigger: "@", query: "jo", from: 3 })
  })

  it("detecta / no início do valor", () => {
    expect(detectarToken("/min")).toEqual({ trigger: "/", query: "min", from: 0 })
  })

  it("query vazia (acabou de digitar o gatilho)", () => {
    expect(detectarToken("oi @")).toEqual({ trigger: "@", query: "", from: 3 })
  })

  it("sem gatilho ativo → null", () => {
    expect(detectarToken("mensagem qualquer")).toBeNull()
  })

  it("@ no meio de uma palavra (e-mail) não conta como gatilho", () => {
    expect(detectarToken("fulano@dominio.com")).toBeNull()
  })

  it("gatilho fechado por um espaço (usuário seguiu digitando) não conta mais", () => {
    expect(detectarToken("oi @joao depois disso")).toBeNull()
  })
})

describe("substituirToken — recorta/substitui o token ativo pelo fim do valor", () => {
  it("menção resolvida: remove o token (texto vazio)", () => {
    const t = detectarToken("oi @jo")!
    expect(substituirToken("oi @jo", t)).toBe("oi ")
  })

  it("comando: substitui pelo template", () => {
    const t = detectarToken("/min")!
    expect(substituirToken("/min", t, "Minute um contrato de honorários para ")).toBe("Minute um contrato de honorários para ")
  })

  it("preserva o texto ANTES do token", () => {
    const t = detectarToken("Preciso falar com @aur")!
    expect(substituirToken("Preciso falar com @aur", t)).toBe("Preciso falar com ")
  })
})

describe("filtrarComandos — busca dos comandos '/' (Fase 7)", () => {
  it("query vazia devolve todos os comandos", () => {
    expect(filtrarComandos("").length).toBeGreaterThanOrEqual(5)
  })

  it("filtra por id ou por rótulo, sem diferenciar maiúsculas", () => {
    expect(filtrarComandos("min").some((c) => c.id === "minutar")).toBe(true)
    expect(filtrarComandos("Buscar").some((c) => c.id === "buscar")).toBe(true)
  })

  it("query sem match → lista vazia", () => {
    expect(filtrarComandos("xyz123")).toEqual([])
  })
})

describe("mencoesLinha — bloco volátil das menções '@' (Fase 7, D10)", () => {
  it("sem entidades → string vazia", () => {
    expect(mencoesLinha(undefined)).toBe("")
    expect(mencoesLinha([])).toBe("")
  })

  it("lista uma linha por entidade com tipo/id/nome", () => {
    const s = mencoesLinha([{ tipo: "cliente", id: 42, nome: "Construtora Aurora" }])
    expect(s).toContain("<mencoes>")
    expect(s).toContain("cliente #42: Construtora Aurora")
  })

  it("várias entidades — uma linha cada", () => {
    const s = mencoesLinha([
      { tipo: "cliente", id: 1, nome: "Aurora" },
      { tipo: "processo", id: 2, nome: "5009876-45.2023" },
    ])
    expect(s.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(2)
  })
})
