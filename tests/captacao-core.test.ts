import { describe, expect, it } from "vitest"
import {
  derivarCaptacaoKey,
  derivarOrigemCaptacao,
  escolherIdentificador,
  gerarProtocolo,
  normalizarE164,
} from "@/lib/captacao/core"

describe("gerarProtocolo", () => {
  it("gera 'NCM-' + 6 caracteres do alfabeto sem ambíguos", () => {
    const p = gerarProtocolo(() => 0)
    expect(p).toMatch(/^NCM-[ABCDEFGHJKMNPQRSTVWXYZ23456789]{6}$/)
  })

  it("varia com o rand injetado (determinístico, sem depender de Math.random)", () => {
    const seq = [0, 0.5, 0.99, 0.1, 0.2, 0.3]
    let i = 0
    const rand = () => seq[i++ % seq.length]
    const p1 = gerarProtocolo(rand)
    i = 0
    const p2 = gerarProtocolo(rand)
    expect(p1).toBe(p2) // mesma sequência → mesmo protocolo (puro)
  })
})

describe("normalizarE164", () => {
  it("normaliza um celular BR de 9 dígitos com DDD para +55", () => {
    expect(normalizarE164("(11) 90000-0000")).toBe("+5511900000000")
  })

  it("adiciona o 9 em celular legado de 8 dígitos", () => {
    expect(normalizarE164("11 8000-0000")).toBe("+5511980000000")
  })

  it("remove o 55 já presente antes de recanonicalizar", () => {
    expect(normalizarE164("+55 11 90000-0000")).toBe("+5511900000000")
  })

  it("string vazia para entrada vazia/nula", () => {
    expect(normalizarE164(null)).toBe("")
    expect(normalizarE164("")).toBe("")
  })
})

describe("derivarCaptacaoKey", () => {
  it("usa o header Idempotency-Key quando presente", () => {
    const k = derivarCaptacaoKey(3, "abc-123", { telefone: "11900000000", email: null, diaISO: "2026-08-19" })
    expect(k).toBe("lp:3:abc-123")
  })

  it("cai para telefone|email|dia sem o header", () => {
    const k = derivarCaptacaoKey(3, null, { telefone: "11 90000-0000", email: "a@b.com", diaISO: "2026-08-19" })
    expect(k).toBe("lp:3:fallback:+5511900000000:a@b.com:2026-08-19")
  })

  it("o mesmo submit (mesmo dia/contato) sem header produz a MESMA chave — dedupa duplo-clique", () => {
    const a = derivarCaptacaoKey(3, null, { telefone: "11900000000", email: null, diaISO: "2026-08-19" })
    const b = derivarCaptacaoKey(3, undefined, { telefone: "(11) 90000-0000", email: null, diaISO: "2026-08-19" })
    expect(a).toBe(b)
  })

  it("landing pages diferentes nunca colidem, mesmo com o mesmo contato/dia", () => {
    const a = derivarCaptacaoKey(1, null, { telefone: "11900000000", email: null, diaISO: "2026-08-19" })
    const b = derivarCaptacaoKey(2, null, { telefone: "11900000000", email: null, diaISO: "2026-08-19" })
    expect(a).not.toBe(b)
  })
})

describe("escolherIdentificador", () => {
  it("gclid tem precedência sobre wbraid/gbraid", () => {
    expect(escolherIdentificador({ gclid: "g1", wbraid: "w1", gbraid: "b1" })).toBe("gclid")
  })

  it("cai para wbraid, depois gbraid, na ausência do anterior", () => {
    expect(escolherIdentificador({ gclid: null, wbraid: "w1", gbraid: "b1" })).toBe("wbraid")
    expect(escolherIdentificador({ gclid: null, wbraid: null, gbraid: "b1" })).toBe("gbraid")
  })

  it("null quando nenhum identificador de clique está presente", () => {
    expect(escolherIdentificador({})).toBeNull()
  })
})

describe("derivarOrigemCaptacao", () => {
  it("gclid/gbraid → google_ads, mesmo sem utm", () => {
    expect(derivarOrigemCaptacao({ gclid: "g1" })).toBe("google_ads")
    expect(derivarOrigemCaptacao({ gbraid: "b1" })).toBe("google_ads")
  })

  it("wbraid sozinho também é google_ads (é um click id do Google)", () => {
    expect(derivarOrigemCaptacao({ wbraid: "w1" })).toBe("google_ads")
  })

  it("cai para o texto do utm_source quando não há click id do Google", () => {
    expect(derivarOrigemCaptacao({ utmSource: "Facebook Ads" })).toBe("meta_ads")
    expect(derivarOrigemCaptacao({ utmSource: "google" })).toBe("google_ads")
  })

  it("organico quando não há clique nem utm reconhecido", () => {
    expect(derivarOrigemCaptacao({})).toBe("organico")
    expect(derivarOrigemCaptacao({ utmSource: "newsletter" })).toBe("organico")
  })
})
