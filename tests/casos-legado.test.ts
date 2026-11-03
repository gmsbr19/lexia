import { describe, expect, it } from "vitest"
import {
  descreverDadosLegados,
  planejarConversaoLegado,
  temDadosLegados,
  type CasoLegado,
  type ProcessoExistente,
} from "@/lib/casos/legado-core"
import { montarCnj } from "@/lib/processos/validacao"
import { casoStatusBucket, casoStatusCanonico, casoStatusLabel } from "@/lib/casos/status"

// CNJ válido (TJSP: segmento 8, tribunal 26) e o mesmo número só com dígitos.
const CNJ = montarCnj("1234567", "2023", "8", "26", "0100")
const CNJ_DIG = CNJ.replace(/\D/g, "")

const caso = (over: Partial<CasoLegado> = {}): CasoLegado => ({
  id: 1,
  tipo: "litigio",
  status: "Ativo",
  responsavelUserId: 7,
  numeroProcesso: null,
  tribunal: null,
  vara: null,
  instancia: null,
  tipoAcao: null,
  valorCausaCents: null,
  dataDistribuicao: null,
  ...over,
})

const proc = (over: Partial<ProcessoExistente> = {}): ProcessoExistente => ({
  id: 100,
  casoId: 1,
  numeroCnj: null,
  tribunal: null,
  vara: null,
  instancia: null,
  classe: null,
  valorCausaCents: 0,
  dataDistribuicao: null,
  ...over,
})

describe("planejarConversaoLegado", () => {
  it("caso sem campos legados → nada", () => {
    expect(temDadosLegados(caso())).toBe(false)
    expect(planejarConversaoLegado(caso(), [])).toEqual({ acao: "nada" })
  })

  it("consultivo só com valor/tipo de ação → mantém (não inventa processo)", () => {
    const c = caso({ tipo: "consultivo", valorCausaCents: 500000, tipoAcao: "Parecer" })
    expect(planejarConversaoLegado(c, [])).toEqual({ acao: "manter" })
  })

  it("CNJ válido sem processo → cria processo formatado, com tribunal/UF derivados do CNJ", () => {
    const c = caso({ numeroProcesso: CNJ_DIG, vara: "2ª Vara Cível", valorCausaCents: 1_000_00, tipoAcao: "Despejo" })
    const p = planejarConversaoLegado(c, [])
    expect(p.acao).toBe("criar")
    if (p.acao !== "criar") return
    expect(p.processo).toMatchObject({
      casoId: 1,
      numeroCnj: CNJ,
      tribunal: "TJSP",
      uf: "SP",
      vara: "2ª Vara Cível",
      classe: "Despejo",
      valorCausaCents: 100000,
      responsavelUserId: 7,
      status: "ativo",
    })
    expect(p.anotacaoProcesso).toBeNull()
  })

  it("tribunal informado no caso tem precedência sobre o derivado do CNJ", () => {
    const p = planejarConversaoLegado(caso({ numeroProcesso: CNJ, tribunal: "Foro Central" }), [])
    expect(p.acao === "criar" && p.processo.tribunal).toBe("Foro Central")
  })

  it("caso arquivado → processo nasce arquivado", () => {
    const p = planejarConversaoLegado(caso({ numeroProcesso: CNJ, status: "Encerrado" }), [])
    expect(p.acao === "criar" && p.processo.status).toBe("arquivado")
  })

  it("mesmo CNJ já num processo DESTE caso → completa só as lacunas", () => {
    const existente = proc({ numeroCnj: CNJ, tribunal: "TJSP", vara: null, valorCausaCents: 0 })
    const c = caso({ numeroProcesso: CNJ_DIG, tribunal: "Outro", vara: "3ª Vara", valorCausaCents: 9900 })
    const p = planejarConversaoLegado(c, [existente])
    expect(p).toEqual({ acao: "completar", processoId: 100, patch: { vara: "3ª Vara", valorCausaCents: 9900 } })
  })

  it("mesmo CNJ num processo de OUTRO caso → conflito (nada muda)", () => {
    const p = planejarConversaoLegado(caso({ numeroProcesso: CNJ }), [proc({ id: 55, casoId: 2, numeroCnj: CNJ })])
    expect(p).toEqual({ acao: "conflito", processoId: 55, casoIdDoProcesso: 2, numeroCnj: CNJ })
  })

  it("número fora do padrão CNJ, caso sem processo → cria SEM número e guarda o original em anotação", () => {
    const p = planejarConversaoLegado(caso({ numeroProcesso: "583.00.2008.123456-7", vara: "10ª Vara" }), [])
    expect(p.acao).toBe("criar")
    if (p.acao !== "criar") return
    expect(p.processo.numeroCnj).toBeNull()
    expect(p.processo.vara).toBe("10ª Vara")
    expect(p.anotacaoProcesso).toContain("583.00.2008.123456-7")
  })

  it("número fora do padrão e o caso JÁ tem processo → registra como anotação do caso (sem duplicar)", () => {
    const c = caso({ numeroProcesso: "123/2009", tribunal: "TJSP", valorCausaCents: 150000 })
    const p = planejarConversaoLegado(c, [proc({ numeroCnj: CNJ })])
    expect(p.acao).toBe("registrar")
    if (p.acao !== "registrar") return
    expect(p.anotacaoCaso).toContain("Nº 123/2009")
    expect(p.anotacaoCaso).toContain("Tribunal: TJSP")
    expect(p.anotacaoCaso).toContain("R$ 1.500,00")
  })

  it("litígio sem número mas com vara → cria processo sem número (sem anotação)", () => {
    const p = planejarConversaoLegado(caso({ vara: "1ª Vara do Trabalho" }), [])
    expect(p.acao === "criar" && p.processo.numeroCnj).toBeNull()
    expect(p.acao === "criar" && p.anotacaoProcesso).toBeNull()
  })

  it("descreverDadosLegados formata data de distribuição em dd/mm/aaaa", () => {
    const txt = descreverDadosLegados(caso({ dataDistribuicao: new Date("2021-03-05T12:00:00Z") }))
    expect(txt).toContain("Distribuição: 05/03/2021")
  })
})

describe("status do caso", () => {
  it("normaliza os textos livres do Astrea e do modal antigo", () => {
    expect(casoStatusBucket("Ativo")).toBe("ativo")
    expect(casoStatusBucket("ativo")).toBe("ativo")
    expect(casoStatusBucket(null)).toBe("ativo")
    expect(casoStatusBucket("Arquivado")).toBe("arquivado")
    expect(casoStatusBucket("Encerrado")).toBe("arquivado")
    expect(casoStatusBucket("Suspenso")).toBe("suspenso")
  })

  it("grava sempre o valor canônico", () => {
    expect(casoStatusCanonico("arquivado")).toBe("Arquivado")
    expect(casoStatusCanonico(undefined)).toBe("Ativo")
    expect(casoStatusLabel("encerrado")).toBe("Arquivado")
  })
})
