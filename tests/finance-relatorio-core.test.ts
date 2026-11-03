import { describe, expect, it } from "vitest"
import {
  comporAging,
  comporCategorias,
  comporDevedores,
  comporDre,
  comporEvolucao,
  comporExtratoContas,
  comporFatias,
  comporHonorarios,
  comporKpis,
  comporRateios,
  deltaPct,
  faixaAging,
  maxAbs,
  mediaDiaria,
  type ResumoBruto,
} from "@/lib/finance/relatorio-core"

const BRUTO: ResumoBruto = {
  recebidoCents: 100_000,
  recebidoCount: 4,
  pagoCents: 40_000,
  pagoCount: 6,
  aReceberCents: 25_000,
  aReceberCount: 3,
  vencidoPeriodoCents: 10_000,
  vencidoPeriodoCount: 1,
  aPagarCents: 5_000,
  aPagarCount: 2,
}

describe("relatorio-core · deltaPct", () => {
  it("devolve null quando não há base de comparação", () => {
    expect(deltaPct(1000, 0)).toBeNull()
  })
  it("calcula a variação sobre o módulo da base (base negativa não inverte o sinal)", () => {
    expect(deltaPct(150, 100)).toBeCloseTo(50)
    expect(deltaPct(50, 100)).toBeCloseTo(-50)
    expect(deltaPct(-50, -100)).toBeCloseTo(50)
  })
})

describe("relatorio-core · comporKpis", () => {
  it("deriva resultado, margem, ticket médio e deltas", () => {
    const k = comporKpis(BRUTO, { recebidoCents: 80_000, pagoCents: 50_000 })
    expect(k.resultadoCents).toBe(60_000)
    expect(k.resultadoAnteriorCents).toBe(30_000)
    expect(k.margemPct).toBeCloseTo(60)
    expect(k.ticketMedioCents).toBe(25_000)
    expect(k.recebidoDeltaPct).toBeCloseTo(25)
    expect(k.pagoDeltaPct).toBeCloseTo(-20)
    expect(k.resultadoDeltaPct).toBeCloseTo(100)
  })
  it("margem é null sem receita e ticket médio é 0 sem recebimentos", () => {
    const k = comporKpis({ ...BRUTO, recebidoCents: 0, recebidoCount: 0 }, { recebidoCents: 0, pagoCents: 0 })
    expect(k.margemPct).toBeNull()
    expect(k.ticketMedioCents).toBe(0)
    expect(k.recebidoDeltaPct).toBeNull()
  })
  it("preserva as contagens e os valores em aberto recebidos", () => {
    const k = comporKpis(BRUTO, { recebidoCents: 1, pagoCents: 1 })
    expect(k.aReceberCount).toBe(3)
    expect(k.vencidoPeriodoCents).toBe(10_000)
    expect(k.aPagarCents).toBe(5_000)
  })
})

describe("relatorio-core · comporDre", () => {
  it("sem pró-labore cadastrado para no resultado de caixa", () => {
    const d = comporDre(100_000, 40_000, 0, 1)
    expect(d.map((l) => l.kind)).toEqual(["receita", "custo", "subtotal"])
    expect(d[1].valorCents).toBe(-40_000)
    expect(d[2].valorCents).toBe(60_000)
  })
  it("escala o pró-labore pelos meses cobertos pela faixa", () => {
    const d = comporDre(300_000, 100_000, 10_000, 3)
    const pro = d.find((l) => l.label.includes("Pró-labore"))
    expect(pro?.valorCents).toBe(-30_000)
    expect(pro?.hint).toContain("3 meses")
    expect(d[d.length - 1].valorCents).toBe(170_000)
    expect(d[d.length - 1].kind).toBe("resultado")
  })
  it("arredonda o pró-labore de um período fracionário", () => {
    const d = comporDre(0, 0, 10_000, 0.5)
    expect(d.find((l) => l.label.includes("Pró-labore"))?.valorCents).toBe(-5_000)
  })
  it("resultado de caixa negativo é preservado", () => {
    expect(comporDre(10_000, 25_000, 0, 1)[2].valorCents).toBe(-15_000)
  })
})

describe("relatorio-core · composições", () => {
  it("comporFatias calcula % e ordena por valor desc", () => {
    const f = comporFatias([
      { chave: "a", label: "A", cor: "#1", valorCents: 2_500, count: 1 },
      { chave: "b", label: "B", cor: "#2", valorCents: 7_500, count: 3 },
    ])
    expect(f.map((x) => x.chave)).toEqual(["b", "a"])
    expect(f[0].pct).toBeCloseTo(75)
    expect(f.reduce((a, x) => a + x.pct, 0)).toBeCloseTo(100)
  })
  it("comporFatias com manterOrdem preserva a ordem recebida e tolera total 0", () => {
    const f = comporFatias(
      [
        { chave: "a", label: "A", cor: "#1", valorCents: 0, count: 0 },
        { chave: "b", label: "B", cor: "#2", valorCents: 0, count: 0 },
      ],
      true,
    )
    expect(f.map((x) => x.chave)).toEqual(["a", "b"])
    expect(f.every((x) => x.pct === 0)).toBe(true)
  })
  it("comporHonorarios usa a ordem canônica dos buckets e joga tipo desconhecido em à vista", () => {
    const f = comporHonorarios([
      { tipoHonorario: "exito", valorCents: 1_000 },
      { tipoHonorario: "recorrente", valorCents: 3_000 },
      { tipoHonorario: null, valorCents: 500 },
      { tipoHonorario: "coisa-nova", valorCents: 500 },
    ])
    expect(f.map((x) => x.chave)).toEqual(["recorrente", "exito", "avista"])
    expect(f.find((x) => x.chave === "avista")).toMatchObject({ valorCents: 1_000, count: 2 })
    expect(f.find((x) => x.chave === "recorrente")?.pct).toBeCloseTo(60)
  })
  it("comporCategorias agrupa, nomeia o vazio e dá cor de paleta quando o cadastro não tem", () => {
    const f = comporCategorias([
      { categoria: "Aluguel", cor: "#ABCDEF", valorCents: 5_000 },
      { categoria: "Aluguel", cor: null, valorCents: 1_000 },
      { categoria: null, cor: null, valorCents: 2_000 },
    ])
    expect(f.map((x) => x.label)).toEqual(["Aluguel", "Sem categoria"])
    expect(f[0]).toMatchObject({ valorCents: 6_000, count: 2, cor: "#ABCDEF" })
    expect(f[1].cor).toMatch(/^#/)
  })
  it("comporCategorias usa valor absoluto (saídas podem vir negativas)", () => {
    const f = comporCategorias([{ categoria: "Luz", cor: null, valorCents: -3_000 }])
    expect(f[0].valorCents).toBe(3_000)
  })
})

describe("relatorio-core · inadimplência", () => {
  it("faixaAging respeita os cortes 0 / 30 / 60", () => {
    expect(faixaAging(-5)).toBe("a_vencer")
    expect(faixaAging(0)).toBe("a_vencer")
    expect(faixaAging(1)).toBe("d1_30")
    expect(faixaAging(30)).toBe("d1_30")
    expect(faixaAging(31)).toBe("d31_60")
    expect(faixaAging(60)).toBe("d31_60")
    expect(faixaAging(61)).toBe("d60_plus")
  })
  it("comporAging devolve sempre as 4 faixas, na ordem", () => {
    const a = comporAging([
      { valorCents: 100, diasAtraso: -1, clienteId: 1, cliente: "A" },
      { valorCents: 200, diasAtraso: 10, clienteId: 1, cliente: "A" },
      { valorCents: 300, diasAtraso: 90, clienteId: 2, cliente: "B" },
    ])
    expect(a.map((x) => x.key)).toEqual(["a_vencer", "d1_30", "d31_60", "d60_plus"])
    expect(a[0]).toMatchObject({ valorCents: 100, count: 1 })
    expect(a[2]).toMatchObject({ valorCents: 0, count: 0 })
    expect(a[3]).toMatchObject({ valorCents: 300, count: 1 })
  })
  it("comporDevedores ignora o que ainda não venceu e agrupa por cliente", () => {
    const d = comporDevedores([
      { valorCents: 500, diasAtraso: -3, clienteId: 1, cliente: "A" },
      { valorCents: 1_000, diasAtraso: 15, clienteId: 1, cliente: "A" },
      { valorCents: 2_000, diasAtraso: 70, clienteId: 1, cliente: "A" },
      { valorCents: 900, diasAtraso: 5, clienteId: 2, cliente: "B" },
    ])
    expect(d).toHaveLength(2)
    expect(d[0]).toMatchObject({ clienteId: 1, totalCents: 3_000, count: 2, maiorAtrasoDias: 70 })
    expect(d[1]).toMatchObject({ clienteId: 2, totalCents: 900 })
  })
  it("comporDevedores agrupa os sem cliente por nome e respeita o limite", () => {
    const d = comporDevedores(
      [
        { valorCents: 100, diasAtraso: 2, clienteId: null, cliente: null },
        { valorCents: 100, diasAtraso: 2, clienteId: null, cliente: null },
        { valorCents: 999, diasAtraso: 2, clienteId: 7, cliente: "Z" },
      ],
      1,
    )
    expect(d).toHaveLength(1)
    expect(d[0]).toMatchObject({ clienteId: 7, totalCents: 999 })
    const todos = comporDevedores([
      { valorCents: 100, diasAtraso: 2, clienteId: null, cliente: null },
      { valorCents: 100, diasAtraso: 2, clienteId: null, cliente: null },
    ])
    expect(todos[0]).toMatchObject({ cliente: "Sem cliente", totalCents: 200, count: 2 })
  })
})

describe("relatorio-core · evolução", () => {
  it("preenche com zero os meses sem movimento e mantém a ordem pedida", () => {
    const e = comporEvolucao(
      [
        { mes: "2026-01", tipo: "entrada", valorCents: 1_000 },
        { mes: "2026-01", tipo: "saida", valorCents: -400 },
        { mes: "2026-03", tipo: "entrada", valorCents: 700 },
      ],
      ["2026-01", "2026-02", "2026-03"],
    )
    expect(e.map((p) => p.key)).toEqual(["2026-01", "2026-02", "2026-03"])
    expect(e[0]).toMatchObject({ entradasCents: 1_000, saidasCents: 400, saldoCents: 600 })
    expect(e[1]).toMatchObject({ entradasCents: 0, saidasCents: 0, saldoCents: 0 })
    expect(e[2].label).toBe("mar/26")
  })
})

describe("relatorio-core · extrato por conta", () => {
  const contas = [
    { id: 1, nome: "Leandro", titular: "Leandro", kind: "socio", valorInicialCents: 10_000 },
    { id: 2, nome: "Banco", titular: null, kind: "banco", valorInicialCents: 0 },
  ]
  it("saldo inicial = abertura + movimento anterior à faixa", () => {
    const l = comporExtratoContas(
      contas,
      [
        { contaId: 1, tipo: "entrada", valorCents: 5_000 },
        { contaId: 1, tipo: "saida", valorCents: -2_000 },
      ],
      [{ contaId: 1, tipo: "entrada", valorCents: 1_000 }],
    )
    expect(l[0]).toMatchObject({ saldoInicialCents: 13_000, entradasCents: 1_000, saidasCents: 0, saldoFinalCents: 14_000 })
    expect(l[1]).toMatchObject({ saldoInicialCents: 0, saldoFinalCents: 0 })
  })
  it("movimento sem conta é descartado (não entra em nenhum saldo)", () => {
    const l = comporExtratoContas(contas, [], [{ contaId: null, tipo: "entrada", valorCents: 9_999 }])
    expect(l.reduce((a, x) => a + x.saldoFinalCents, 0)).toBe(10_000)
  })
})

describe("relatorio-core · rateio por caso", () => {
  const nomes = new Map([
    [1, "Leandro"],
    [2, "Leonardo"],
  ])
  it("normaliza os percentuais e a soma das partes fecha com o recebido", () => {
    const r = comporRateios(
      [
        {
          casoId: 10,
          caso: "Condomínio",
          cliente: "Cond. X",
          valorCents: 1_001,
          responsaveis: [
            { contaId: 1, percentual: 1 },
            { contaId: 2, percentual: 1 },
          ],
        },
      ],
      nomes,
    )
    expect(r).toHaveLength(1)
    expect(r[0].partes.map((p) => p.percentual)).toEqual([50, 50])
    expect(r[0].partes.map((p) => p.nome)).toEqual(["Leandro", "Leonardo"])
    expect(r[0].partes.reduce((a, p) => a + p.valorCents, 0)).toBe(1_001)
  })
  it("soma várias parcelas do mesmo caso e ordena por recebido desc", () => {
    const r = comporRateios(
      [
        { casoId: 10, caso: "A", cliente: null, valorCents: 100, responsaveis: [{ contaId: 1, percentual: 100 }] },
        { casoId: 10, caso: "A", cliente: null, valorCents: 300, responsaveis: [{ contaId: 1, percentual: 100 }] },
        { casoId: 11, caso: "B", cliente: null, valorCents: 1_000, responsaveis: [{ contaId: 2, percentual: 100 }] },
      ],
      nomes,
    )
    expect(r.map((x) => x.casoId)).toEqual([11, 10])
    expect(r.find((x) => x.casoId === 10)?.recebidoCents).toBe(400)
    expect(r.find((x) => x.casoId === 10)?.partes[0].valorCents).toBe(400)
  })
  it("caso sem rateio definido fica fora (não há direito a apurar)", () => {
    expect(comporRateios([{ casoId: 1, caso: "X", cliente: null, valorCents: 500, responsaveis: [] }], nomes)).toEqual([])
    expect(
      comporRateios([{ casoId: 1, caso: "X", cliente: null, valorCents: 500, responsaveis: [{ contaId: 1, percentual: 0 }] }], nomes),
    ).toEqual([])
  })
  it("usa valor absoluto e um rótulo de fallback para conta desconhecida", () => {
    const r = comporRateios(
      [{ casoId: 1, caso: "X", cliente: null, valorCents: -200, responsaveis: [{ contaId: 99, percentual: 100 }] }],
      nomes,
    )
    expect(r[0].recebidoCents).toBe(200)
    expect(r[0].partes[0].nome).toBe("Conta 99")
  })
})

describe("relatorio-core · utilidades", () => {
  it("maxAbs nunca devolve 0 (é divisor de largura de barra)", () => {
    expect(maxAbs([])).toBe(1)
    expect(maxAbs([0, 0])).toBe(1)
    expect(maxAbs([-500, 200])).toBe(500)
  })
  it("mediaDiaria divide pelo nº de dias da faixa", () => {
    expect(mediaDiaria(30_000, { de: "2026-06-01", ate: "2026-06-30" })).toBe(1_000)
    expect(mediaDiaria(100, { de: "2026-06-01", ate: "2026-06-01" })).toBe(100)
  })
})
