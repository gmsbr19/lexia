import { describe, expect, it } from "vitest"
import type { AcertoSocioConta } from "@/lib/finance/acerto"
import {
  detalharAcertoSocios,
  MAX_LINHAS_ACERTO,
  type DetalharAcertoArgs,
  type DetalheEntradaFonte,
  type DetalheSaidaFonte,
} from "@/lib/finance/acerto-detalhe"

const A: AcertoSocioConta = { id: 1, nome: "Conta Leandro", titular: "Leandro" }
const B: AcertoSocioConta = { id: 2, nome: "Conta Leonardo", titular: "Leonardo" }
const socios = [A, B]
const ESCRITORIO = 9 // conta que não é de sócio

const meio = [
  { contaId: 1, percentual: 50 },
  { contaId: 2, percentual: 50 },
]

const ent = (o: Partial<DetalheEntradaFonte> = {}): DetalheEntradaFonte => ({
  id: 1,
  data: "2026-06-10",
  descricao: "Honorário contratual",
  valorCents: 100_000,
  contaId: A.id,
  conta: "Leandro",
  isAnomalia: false,
  casoId: 10,
  caso: "Caso X",
  cliente: "Cliente X",
  responsaveis: meio,
  ...o,
})

const sai = (o: Partial<DetalheSaidaFonte> = {}): DetalheSaidaFonte => ({
  id: 100,
  data: "2026-06-11",
  descricao: "Aluguel",
  valorCents: -40_000,
  contaId: A.id,
  conta: "Leandro",
  isAnomalia: false,
  categoria: "Escritório",
  socioResponsavelId: null,
  ...o,
})

const detalhar = (args: Partial<DetalharAcertoArgs> = {}) =>
  detalharAcertoSocios({
    socios,
    entradas: [],
    saidas: [],
    transferencias: [],
    faixa: { de: null, ate: null },
    ...args,
  })

describe("detalharAcertoSocios — entradas", () => {
  it("abre o honorário na parte de cada sócio", () => {
    const r = detalhar({ entradas: [ent()] })
    expect(r.entradas).toHaveLength(1)
    expect(r.ignorados).toHaveLength(0)
    expect(r.entradas[0].partes).toEqual([
      { contaId: 1, nome: "Leandro", percentual: 50, valorCents: 50_000 },
      { contaId: 2, nome: "Leonardo", percentual: 50, valorCents: 50_000 },
    ])
    expect(r.entradas[0].contaRecebeu).toBe("Leandro")
    expect(r.socios[0].recebidoCents).toBe(100_000)
  })

  it("as partes de cada linha somam o direito dos totais (70/30 e valor ímpar)", () => {
    const r = detalhar({
      entradas: [
        ent({ id: 1, valorCents: 33_333, responsaveis: [{ contaId: 1, percentual: 70 }, { contaId: 2, percentual: 30 }] }),
        ent({ id: 2, valorCents: 99_999, contaId: B.id, conta: "Leonardo" }),
      ],
    })
    for (const lado of r.socios) {
      const soma = r.entradas.reduce((a, e) => a + (e.partes.find((p) => p.contaId === lado.id)?.valorCents ?? 0), 0)
      expect(soma).toBe(lado.direitoCents)
    }
  })
})

describe("detalharAcertoSocios — o que fica de fora, e por quê", () => {
  it("entrada marcada como anomalia", () => {
    const r = detalhar({ entradas: [ent({ isAnomalia: true })] })
    expect(r.entradas).toHaveLength(0)
    expect(r.ignorados[0].motivo).toBe("anomalia")
    expect(r.ignorados[0].valorCents).toBe(100_000)
  })

  it("entrada sem conta", () => {
    const r = detalhar({ entradas: [ent({ contaId: null, conta: null })] })
    expect(r.ignorados[0].motivo).toBe("sem_conta")
  })

  it("entrada numa conta que não é de sócio", () => {
    const r = detalhar({ entradas: [ent({ contaId: ESCRITORIO, conta: "Itaú" })] })
    expect(r.ignorados[0].motivo).toBe("conta_nao_socio")
    expect(r.ignorados[0].detalhe).toContain("Itaú")
  })

  it("entrada sem caso", () => {
    const r = detalhar({ entradas: [ent({ casoId: null, caso: null, responsaveis: [] })] })
    expect(r.ignorados[0].motivo).toBe("sem_caso")
  })

  it("caso sem rateio definido aponta o caso e a ferramenta", () => {
    const r = detalhar({ entradas: [ent({ responsaveis: [] })] })
    expect(r.ignorados[0].motivo).toBe("sem_rateio")
    expect(r.ignorados[0].detalhe).toContain("Caso X")
    expect(r.ignorados[0].detalhe).toContain("definir_rateio")
  })

  it("despesa paga pela conta do escritório não entra no acerto", () => {
    const r = detalhar({ saidas: [sai({ contaId: ESCRITORIO, conta: "Itaú" })] })
    expect(r.despesas).toHaveLength(0)
    expect(r.ignorados[0]).toMatchObject({ tipo: "saida", motivo: "conta_nao_socio" })
  })

  it("os maiores problemas vêm primeiro", () => {
    const r = detalhar({
      entradas: [ent({ id: 1, valorCents: 1_000, responsaveis: [] }), ent({ id: 2, valorCents: 90_000, responsaveis: [] })],
    })
    expect(r.ignorados.map((i) => i.id)).toEqual([2, 1])
  })
})

describe("detalharAcertoSocios — despesas", () => {
  it("INVARIANTE: a cota de cada linha soma exatamente a cota dos totais", () => {
    const r = detalhar({
      saidas: [
        sai({ id: 1, valorCents: -33_333 }),
        sai({ id: 2, valorCents: -1 }),
        sai({ id: 3, valorCents: -999, contaId: B.id, conta: "Leonardo" }),
        sai({ id: 4, valorCents: -7 }),
        sai({ id: 5, valorCents: -10_000 }),
      ],
    })
    for (const lado of r.socios) {
      const soma = r.despesas.reduce((a, d) => a + (d.cotas.find((c) => c.contaId === lado.id)?.valorCents ?? 0), 0)
      expect(soma).toBe(lado.cotaSaidaCents)
    }
    // e a cota de cada linha fecha no valor da linha
    for (const d of r.despesas) {
      expect(d.cotas.reduce((a, c) => a + c.valorCents, 0)).toBe(d.valorCents)
    }
  })

  it("despesa com sócio responsável leva a cota inteira dele", () => {
    const r = detalhar({ saidas: [sai({ valorCents: -8_000, contaId: A.id, socioResponsavelId: B.id })] })
    const d = r.despesas[0]
    expect(d.responsavelId).toBe(B.id)
    expect(d.responsavel).toBe("Leonardo")
    expect(d.cotas).toEqual([
      { contaId: 1, nome: "Leandro", percentual: 0, valorCents: 0 },
      { contaId: 2, nome: "Leonardo", percentual: 100, valorCents: 8_000 },
    ])
    expect(r.valorCents).toBe(8_000)
    expect(r.devedorId).toBe(B.id)
  })

  it("o INVARIANTE continua valendo misturando compartilhada e com responsável", () => {
    const r = detalhar({
      saidas: [
        sai({ id: 1, valorCents: -33_333 }),
        sai({ id: 2, valorCents: -10_000, socioResponsavelId: A.id }),
        sai({ id: 3, valorCents: -555, socioResponsavelId: B.id }),
        sai({ id: 4, valorCents: -777, contaId: B.id }),
      ],
    })
    for (const lado of r.socios) {
      const soma = r.despesas.reduce((a, d) => a + (d.cotas.find((c) => c.contaId === lado.id)?.valorCents ?? 0), 0)
      expect(soma).toBe(lado.cotaSaidaCents)
    }
  })

  it("responsável que não é sócio ativo cai no 50/50", () => {
    const r = detalhar({ saidas: [sai({ valorCents: -40_000, socioResponsavelId: ESCRITORIO })] })
    expect(r.despesas[0].responsavelId).toBeNull()
    expect(r.despesas[0].cotas.map((c) => c.valorCents)).toEqual([20_000, 20_000])
  })
})

describe("detalharAcertoSocios — forma do resultado", () => {
  it("devolve os totais do acerto junto do detalhamento", () => {
    const r = detalhar({
      entradas: [ent()], // 100k recebidos por A, 50/50 → A deve 50k a B
      transferencias: [
        { id: 7, valorCents: 20_000, data: "2026-06-20", descricao: "Repasse", contaOrigemId: A.id, contaOrigem: "Leandro", contaDestino: "Leonardo" },
      ],
      faixa: { de: "2026-06-01", ate: "2026-06-30" },
    })
    expect(r.brutoCents).toBe(50_000)
    expect(r.transferidoCents).toBe(20_000)
    expect(r.valorCents).toBe(30_000)
    expect(r.devedorNome).toBe("Leandro")
    expect(r.faixa).toEqual({ de: "2026-06-01", ate: "2026-06-30" })
    expect(r.transferencias).toHaveLength(1)
    // a transferência sai sem o contaOrigemId interno
    expect(r.transferencias[0]).not.toHaveProperty("contaOrigemId")
  })

  it("mais recentes primeiro nas entradas e despesas", () => {
    const r = detalhar({
      entradas: [ent({ id: 1, data: "2026-01-05" }), ent({ id: 2, data: "2026-09-09" })],
      saidas: [sai({ id: 10, data: "2026-02-02" }), sai({ id: 11, data: "2026-08-08" })],
    })
    expect(r.entradas.map((e) => e.id)).toEqual([2, 1])
    expect(r.despesas.map((d) => d.id)).toEqual([11, 10])
  })

  it("corta as listas no teto mas conta o conjunto inteiro, e os totais ficam completos", () => {
    const n = MAX_LINHAS_ACERTO + 25
    const saidas = Array.from({ length: n }, (_, i) => sai({ id: i + 1, valorCents: -1_000 }))
    const r = detalhar({ saidas })
    expect(r.despesas).toHaveLength(MAX_LINHAS_ACERTO)
    expect(r.contagens.despesas).toBe(n)
    expect(r.truncado).toBe(true)
    expect(r.socios[0].pagoSaidaCents).toBe(n * 1_000) // total sobre TUDO, não sobre a amostra
  })

  it("sem exatamente 2 sócios devolve vazio e quitado", () => {
    const r = detalharAcertoSocios({
      socios: [A],
      entradas: [ent()],
      saidas: [sai()],
      transferencias: [],
      faixa: { de: null, ate: null },
    })
    expect(r.quitado).toBe(true)
    expect(r.entradas).toHaveLength(0)
    expect(r.despesas).toHaveLength(0)
    expect(r.ignorados).toHaveLength(0)
    expect(r.contagens).toEqual({ entradas: 0, despesas: 0, transferencias: 0, ignorados: 0 })
  })
})
