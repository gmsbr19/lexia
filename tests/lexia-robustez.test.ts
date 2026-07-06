import { describe, expect, it } from "vitest"
import Anthropic from "@anthropic-ai/sdk"
import { mensagemErro } from "@/lib/lexia/agent/client"
import { acaoParaNotice, isNearBottom, NEAR_BOTTOM_PX } from "@/components/lexia/robustez"
import { UserError } from "@/lib/errors"

describe("mensagemErro — mapa código estruturado (Fase 4, D12)", () => {
  it("UserError → generico, preserva a mensagem original", () => {
    const r = mensagemErro(new UserError("Prazo já confirmado"))
    expect(r).toEqual({ mensagem: "Prazo já confirmado", codigo: "generico" })
  })

  it("AuthenticationError → sem-chave", () => {
    const e = new Anthropic.AuthenticationError(401, {}, "unauthorized", new Headers())
    expect(mensagemErro(e).codigo).toBe("sem-chave")
  })

  it("APIConnectionTimeoutError → timeout", () => {
    const e = new Anthropic.APIConnectionTimeoutError()
    expect(mensagemErro(e).codigo).toBe("timeout")
  })

  it("RateLimitError e InternalServerError → overloaded", () => {
    expect(mensagemErro(new Anthropic.RateLimitError(429, {}, "rate limited", new Headers())).codigo).toBe("overloaded")
    expect(mensagemErro(new Anthropic.InternalServerError(500, {}, "internal", new Headers())).codigo).toBe("overloaded")
  })

  it("APIConnectionError (sem timeout) → overloaded", () => {
    const e = new Anthropic.APIConnectionError({ message: "network down" })
    expect(mensagemErro(e).codigo).toBe("overloaded")
  })

  it("erro desconhecido → generico", () => {
    expect(mensagemErro(new Error("boom")).codigo).toBe("generico")
    expect(mensagemErro("string qualquer").codigo).toBe("generico")
  })
})

describe("isNearBottom — limiar de auto-stick do scroll (Fase 4, R1)", () => {
  it("exatamente no limiar não conta como perto (comparação estrita <)", () => {
    expect(isNearBottom(1000, 1000 - NEAR_BOTTOM_PX, 0)).toBe(false)
  })

  it("1px dentro do limiar → true", () => {
    expect(isNearBottom(1000, 1000 - (NEAR_BOTTOM_PX - 1), 0)).toBe(true)
  })

  it("longe do fim → false", () => {
    expect(isNearBottom(2000, 0, 500)).toBe(false)
  })

  it("limiar customizado é respeitado", () => {
    expect(isNearBottom(100, 50, 0, 60)).toBe(true)
    expect(isNearBottom(100, 50, 0, 40)).toBe(false)
  })
})

describe("acaoParaNotice — qual ação cada código de aviso oferece (Fase 4)", () => {
  it("offline/overloaded/timeout/generico → retry (nada útil foi dito ainda)", () => {
    expect(acaoParaNotice("offline")).toBe("retry")
    expect(acaoParaNotice("overloaded")).toBe("retry")
    expect(acaoParaNotice("timeout")).toBe("retry")
    expect(acaoParaNotice("generico")).toBe("retry")
  })

  it("stream → continuar (preserva o texto parcial já mostrado)", () => {
    expect(acaoParaNotice("stream")).toBe("continuar")
  })

  it("sessao/sem-chave/modo-economico → nenhuma ação genérica (sessao tem ação própria no SysCard)", () => {
    expect(acaoParaNotice("sessao")).toBeNull()
    expect(acaoParaNotice("sem-chave")).toBeNull()
    expect(acaoParaNotice("modo-economico")).toBeNull()
  })

  it("sem código → nenhuma ação", () => {
    expect(acaoParaNotice(undefined)).toBeNull()
  })
})
