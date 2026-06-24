import { describe, expect, it } from "vitest"
import {
  DEFAULT_INSTRUCOES,
  DEFAULT_PREFS,
  parseLexiaPrefs,
  personalizacaoPrompt,
  resolveLexiaPrefs,
} from "@/lib/lexia/preferencias-core"

describe("lexiaPrefs — parse (tolerante a null/lixo)", () => {
  it("retorna {} para null/undefined/lixo e o objeto para JSON válido", () => {
    expect(parseLexiaPrefs(null)).toEqual({})
    expect(parseLexiaPrefs(undefined)).toEqual({})
    expect(parseLexiaPrefs("not json")).toEqual({})
    expect(parseLexiaPrefs("[1,2]")).toEqual([1, 2]) // array é objeto (resolve normaliza depois)
    expect(parseLexiaPrefs('{"persona":"cordial"}')).toEqual({ persona: "cordial" })
  })
})

describe("lexiaPrefs — resolve (defaults)", () => {
  it("aplica os defaults sobre nada", () => {
    const r = resolveLexiaPrefs(undefined)
    expect(r).toEqual(DEFAULT_PREFS)
    expect(r.persona).toBe("senior")
    expect(r.agentMode).toBe("agente")
    expect(r.webAccess).toBe(true)
    expect(r.autoMode).toBe(false)
    expect(r.modelo).toBe("auto")
    expect(r.instrucoes).toEqual(DEFAULT_INSTRUCOES)
  })

  it("preserva overrides parciais e completa o resto", () => {
    const r = resolveLexiaPrefs({ persona: "analista", autoMode: true, modelo: "avancado", instrucoes: { identidade: "X" } })
    expect(r.persona).toBe("analista")
    expect(r.autoMode).toBe(true)
    expect(r.modelo).toBe("avancado")
    expect(r.instrucoes.identidade).toBe("X")
    // campos não informados caem no default
    expect(r.instrucoes.interacao).toBe(DEFAULT_INSTRUCOES.interacao)
    expect(r.webAccess).toBe(true)
  })

  it("memórias vazias caem no default (sempre há ao menos uma)", () => {
    expect(resolveLexiaPrefs({ instrucoes: { memorias: [] } }).instrucoes.memorias).toEqual(DEFAULT_INSTRUCOES.memorias)
    expect(resolveLexiaPrefs({ instrucoes: { memorias: ["dd/mm"] } }).instrucoes.memorias).toEqual(["dd/mm"])
  })
})

describe("lexiaPrefs — personalizacaoPrompt (contexto volátil)", () => {
  it("inclui tom da persona, identidade, interação, memórias e envelopa em <personalizacao>", () => {
    const p = personalizacaoPrompt(null)
    expect(p).toContain("<personalizacao>")
    expect(p).toContain("</personalizacao>")
    expect(p).toContain("advogado sênior") // persona default
    expect(p).toContain(DEFAULT_INSTRUCOES.identidade)
    expect(p).toContain("Preferências registradas")
    // sem diretriz de modo no padrão (agente)
    expect(p).not.toContain("MODO PERGUNTA")
    expect(p).not.toContain("MODO PLANEJAMENTO")
  })

  it("persona 'custom' não injeta linha de tom", () => {
    const p = personalizacaoPrompt({ persona: "custom" })
    expect(p).not.toContain("Tom de comunicação")
  })

  it("injeta a diretriz do modo do agente", () => {
    expect(personalizacaoPrompt({ agentMode: "pergunta" })).toContain("MODO PERGUNTA")
    expect(personalizacaoPrompt({ agentMode: "plano" })).toContain("MODO PLANEJAMENTO")
  })
})
