import { describe, expect, it } from "vitest"
import fixture from "@/lib/processos/cnj/__fixtures__/datajud.sample.json"
import { capaParaPatch, movimentosParaAndamentos } from "@/lib/processos/cnj/datajud/map"
import type { DataJudSource } from "@/lib/processos/cnj/datajud/types"

const source = fixture.hits.hits[0]._source as DataJudSource

describe("movimentosParaAndamentos (contra fixture real)", () => {
  const ands = movimentosParaAndamentos(source)

  it("mapeia cada movimento → AndamentoExterno", () => {
    expect(ands).toHaveLength(2)
    const dist = ands.find((a) => a.descricao === "Distribuição")!
    const sent = ands.find((a) => a.descricao === "Sentença")!
    expect(dist.data).toBe("2018-10-30") // ISO-Z → dia
    expect(sent.data).toBe("2019-03-12")
    expect(dist.fonte).toBe("datajud")
    expect(dist.numeroCnj).toBe("00008323520184013202")
  })

  it("marca relevante por heurística (sentença sim, distribuição não)", () => {
    expect(ands.find((a) => a.descricao === "Sentença")!.relevante).toBe(true)
    expect(ands.find((a) => a.descricao === "Distribuição")!.relevante).toBe(false)
  })

  it("externalId é determinístico e único por movimento (índice evita colisão de codigo+dataHora)", () => {
    const a = movimentosParaAndamentos(source)
    expect(a[0].externalId).toBe(ands[0].externalId) // estável entre rodadas
    expect(ands[0].externalId).toContain("-mov-0-")
    expect(ands[1].externalId).toContain("-mov-1-")
    expect(ands[0].externalId).not.toBe(ands[1].externalId)
  })
})

describe("capaParaPatch", () => {
  it("extrai classe/assunto/órgão (campos não-vazios)", () => {
    const patch = capaParaPatch(source)
    expect(patch.classe).toBe("Procedimento do Juizado Especial Cível")
    expect(patch.assunto).toBe("Concessão")
    expect(patch.vara).toBe("JEF Adj - Tefé")
  })
})
