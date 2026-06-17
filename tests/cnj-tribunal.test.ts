import { describe, expect, it } from "vitest"
import { aliasDataJud, dadosTribunalCnj, indiceDataJud, ufPorCodigoCnj } from "@/lib/processos/cnj-tribunal"
import { montarCnj } from "@/lib/processos/validacao"

// Helper: build a valid CNJ for a given segmento (J) + tribunal (TR) code.
const cnj = (segmento: string, tribunal: string) => montarCnj("1234567", "2024", segmento, tribunal, "0100")

describe("aliasDataJud — Justiça Estadual (J=8)", () => {
  it("mapeia o código de UF para tj<uf>", () => {
    expect(aliasDataJud(cnj("8", "26"))).toBe("tjsp")
    expect(aliasDataJud(cnj("8", "19"))).toBe("tjrj")
    expect(aliasDataJud(cnj("8", "13"))).toBe("tjmg")
    expect(aliasDataJud(cnj("8", "21"))).toBe("tjrs")
  })
  it("DF estadual é tjdft (não tjdf)", () => {
    expect(aliasDataJud(cnj("8", "07"))).toBe("tjdft")
  })
})

describe("aliasDataJud — Federal / Trabalho", () => {
  it("J=4 → trf<região>", () => {
    expect(aliasDataJud(cnj("4", "01"))).toBe("trf1")
    expect(aliasDataJud(cnj("4", "03"))).toBe("trf3")
    expect(aliasDataJud(cnj("4", "06"))).toBe("trf6")
  })
  it("J=5: TR=00 → tst, senão trt<região>", () => {
    expect(aliasDataJud(cnj("5", "00"))).toBe("tst")
    expect(aliasDataJud(cnj("5", "02"))).toBe("trt2")
    expect(aliasDataJud(cnj("5", "15"))).toBe("trt15")
  })
})

describe("aliasDataJud — Eleitoral / Superiores / Militar", () => {
  it("J=6: TR=00 → tse, senão tre-<uf> (com hífen; DF → tre-dft)", () => {
    expect(aliasDataJud(cnj("6", "00"))).toBe("tse")
    expect(aliasDataJud(cnj("6", "26"))).toBe("tre-sp")
    expect(aliasDataJud(cnj("6", "07"))).toBe("tre-dft")
  })
  it("J=3 → stj, J=7 → stm", () => {
    expect(aliasDataJud(cnj("3", "00"))).toBe("stj")
    expect(aliasDataJud(cnj("7", "00"))).toBe("stm")
  })
  it("J=9 (militar estadual) só MG/RS/SP", () => {
    expect(aliasDataJud(cnj("9", "13"))).toBe("tjmmg")
    expect(aliasDataJud(cnj("9", "21"))).toBe("tjmrs")
    expect(aliasDataJud(cnj("9", "26"))).toBe("tjmsp")
    expect(aliasDataJud(cnj("9", "19"))).toBeNull() // sem TJM
  })
})

describe("aliasDataJud — não expostos / inválidos", () => {
  it("STF (J=1) e CNJ (J=2) → null", () => {
    expect(aliasDataJud(cnj("1", "00"))).toBeNull()
    expect(aliasDataJud(cnj("2", "00"))).toBeNull()
  })
  it("número inválido (≠20 dígitos) → null", () => {
    expect(aliasDataJud("123")).toBeNull()
    expect(aliasDataJud("")).toBeNull()
  })
})

describe("indiceDataJud + ufPorCodigoCnj", () => {
  it("prefixa api_publica_", () => {
    expect(indiceDataJud(cnj("8", "26"))).toBe("api_publica_tjsp")
    expect(indiceDataJud(cnj("1", "00"))).toBeNull()
  })
  it("ufPorCodigoCnj traduz os códigos conhecidos", () => {
    expect(ufPorCodigoCnj("26")).toBe("sp")
    expect(ufPorCodigoCnj("07")).toBe("df")
    expect(ufPorCodigoCnj("99")).toBeNull()
  })
})

describe("dadosTribunalCnj (pré-preenchimento da vinculação)", () => {
  it("estadual → sigla + UF; federal/trabalho → sigla sem UF", () => {
    expect(dadosTribunalCnj(cnj("8", "26"))).toEqual({ tribunal: "TJSP", uf: "SP" })
    expect(dadosTribunalCnj(cnj("4", "03"))).toEqual({ tribunal: "TRF3", uf: null })
    expect(dadosTribunalCnj(cnj("5", "00"))).toEqual({ tribunal: "TST", uf: null })
    expect(dadosTribunalCnj(cnj("6", "26"))).toEqual({ tribunal: "TRE-SP", uf: "SP" })
  })
  it("CNJ inválido → tudo null", () => {
    expect(dadosTribunalCnj("123")).toEqual({ tribunal: null, uf: null })
  })
})
