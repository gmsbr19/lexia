import { describe, expect, it } from "vitest"
import { computeAcertoSocios, repartirCotaCompartilhada, type AcertoSocioConta } from "@/lib/finance/acerto"

const A: AcertoSocioConta = { id: 1, nome: "Leandro", titular: "Leandro" }
const B: AcertoSocioConta = { id: 2, nome: "Leonardo", titular: "Leonardo" }
const socios = [A, B]

const split5050 = [
  { contaId: 1, percentual: 50 },
  { contaId: 2, percentual: 50 },
]

describe("computeAcertoSocios — honorários (direito vs recebido)", () => {
  it("50/50 split received entirely by A → A owes B half", () => {
    const r = computeAcertoSocios(socios, [{ valorCents: 100_000, contaId: 1, responsaveis: split5050 }], [], [])
    expect(r.socios[0].direitoCents).toBe(50_000)
    expect(r.socios[1].direitoCents).toBe(50_000)
    expect(r.socios[0].recebidoCents).toBe(100_000)
    expect(r.devedorNome).toBe("Leandro")
    expect(r.credorNome).toBe("Leonardo")
    expect(r.valorCents).toBe(50_000)
    expect(r.quitado).toBe(false)
  })

  it("uneven 70/30 split received by B → B owes A its excess", () => {
    const r = computeAcertoSocios(
      socios,
      [
        {
          valorCents: 100_000,
          contaId: 2,
          responsaveis: [
            { contaId: 1, percentual: 70 },
            { contaId: 2, percentual: 30 },
          ],
        },
      ],
      [],
      [],
    )
    expect(r.socios[0].direitoCents).toBe(70_000)
    expect(r.socios[1].direitoCents).toBe(30_000)
    expect(r.devedorId).toBe(B.id)
    expect(r.credorId).toBe(A.id)
    expect(r.valorCents).toBe(70_000)
  })

  it("ignores honorários on casos without a defined split", () => {
    const r = computeAcertoSocios(socios, [{ valorCents: 100_000, contaId: 1, responsaveis: [] }], [], [])
    expect(r.quitado).toBe(true)
    expect(r.valorCents).toBe(0)
  })

  it("balanced receipts settle to zero", () => {
    const r = computeAcertoSocios(
      socios,
      [
        { valorCents: 100_000, contaId: 1, responsaveis: split5050 },
        { valorCents: 100_000, contaId: 2, responsaveis: split5050 },
      ],
      [],
      [],
    )
    expect(r.quitado).toBe(true)
  })
})

describe("computeAcertoSocios — despesas 50/50 (cota vs pago)", () => {
  it("A paid all shared expenses → B owes A half", () => {
    const r = computeAcertoSocios(socios, [], [{ valorCents: -40_000, contaId: 1 }], [])
    expect(r.socios[0].pagoSaidaCents).toBe(40_000)
    expect(r.socios[0].cotaSaidaCents).toBe(20_000)
    expect(r.socios[1].cotaSaidaCents).toBe(20_000)
    expect(r.devedorId).toBe(B.id)
    expect(r.valorCents).toBe(20_000)
  })

  it("odd totals split without losing a centavo", () => {
    const r = computeAcertoSocios(socios, [], [{ valorCents: -33_333, contaId: 2 }], [])
    expect(r.socios[0].cotaSaidaCents + r.socios[1].cotaSaidaCents).toBe(33_333)
  })
})

describe("computeAcertoSocios — transfer netting", () => {
  it("a settling transfer quits the debt", () => {
    const r = computeAcertoSocios(
      socios,
      [],
      [{ valorCents: -40_000, contaId: 1 }],
      [{ valorCents: 20_000, contaOrigemId: B.id }], // B → A pays its half back
    )
    expect(r.transferidoCents).toBe(20_000)
    expect(r.quitado).toBe(true)
    expect(r.valorCents).toBe(0)
    expect(r.devedorId).toBeNull()
  })

  it("a partial transfer reduces the debt", () => {
    const r = computeAcertoSocios(
      socios,
      [{ valorCents: 100_000, contaId: 2, responsaveis: split5050 }], // B owes A 50k
      [],
      [{ valorCents: 30_000, contaOrigemId: B.id }],
    )
    expect(r.brutoCents).toBe(50_000)
    expect(r.transferidoCents).toBe(30_000)
    expect(r.valorCents).toBe(20_000)
    expect(r.devedorId).toBe(B.id)
  })

  it("transfers in the opposite direction increase the debt", () => {
    const r = computeAcertoSocios(
      socios,
      [{ valorCents: 100_000, contaId: 2, responsaveis: split5050 }], // B owes A 50k
      [],
      [{ valorCents: 10_000, contaOrigemId: A.id }], // and A also sent B 10k
    )
    expect(r.valorCents).toBe(60_000)
    expect(r.devedorId).toBe(B.id)
  })
})

describe("computeAcertoSocios — guard rails", () => {
  it("returns quitado/empty unless there are exactly 2 sócios", () => {
    expect(computeAcertoSocios([A], [], [], []).quitado).toBe(true)
    expect(computeAcertoSocios([], [], [], []).quitado).toBe(true)
    expect(computeAcertoSocios([A], [], [], []).devedorId).toBeNull()
  })
})

describe("computeAcertoSocios — despesa com sócio responsável (fora do rateio 50/50)", () => {
  it("pró-labore: quem paga é o próprio responsável → a despesa sai do acerto", () => {
    // A tira 10k de pró-labore da própria conta: cota 10k e pago 10k, net zero.
    const r = computeAcertoSocios(socios, [], [{ valorCents: -10_000, contaId: 1, socioResponsavelId: 1 }], [])
    expect(r.socios[0].cotaSaidaCents).toBe(10_000)
    expect(r.socios[0].pagoSaidaCents).toBe(10_000)
    expect(r.socios[1].cotaSaidaCents).toBe(0)
    expect(r.quitado).toBe(true)
  })

  it("A paga uma despesa 100% de B → B deve o VALOR INTEIRO, não a metade", () => {
    const r = computeAcertoSocios(socios, [], [{ valorCents: -8_000, contaId: 1, socioResponsavelId: 2 }], [])
    expect(r.socios[1].cotaSaidaCents).toBe(8_000)
    expect(r.socios[0].cotaSaidaCents).toBe(0)
    expect(r.devedorId).toBe(B.id)
    expect(r.valorCents).toBe(8_000)
  })

  it("responsável que não é sócio ativo volta ao rateio 50/50 (nada desaparece)", () => {
    const r = computeAcertoSocios(socios, [], [{ valorCents: -40_000, contaId: 1, socioResponsavelId: 99 }], [])
    expect(r.socios[0].cotaSaidaCents).toBe(20_000)
    expect(r.socios[1].cotaSaidaCents).toBe(20_000)
  })

  it("mistura: a compartilhada divide, a do responsável não", () => {
    const r = computeAcertoSocios(
      socios,
      [],
      [
        { valorCents: -40_000, contaId: 1 }, // escritório: 20k/20k
        { valorCents: -10_000, contaId: 1, socioResponsavelId: 2 }, // 100% de B
      ],
      [],
    )
    expect(r.socios[0].cotaSaidaCents).toBe(20_000)
    expect(r.socios[1].cotaSaidaCents).toBe(30_000)
    expect(r.socios[0].pagoSaidaCents).toBe(50_000)
    expect(r.valorCents).toBe(30_000) // B deve sua metade (20k) + sua despesa (10k)
    expect(r.devedorId).toBe(B.id)
  })

  it("null/ausente é indistinguível do comportamento antigo", () => {
    const comNull = computeAcertoSocios(socios, [], [{ valorCents: -33_333, contaId: 1, socioResponsavelId: null }], [])
    const semCampo = computeAcertoSocios(socios, [], [{ valorCents: -33_333, contaId: 1 }], [])
    expect(comNull).toEqual(semCampo)
  })
})

describe("repartirCotaCompartilhada", () => {
  it("a soma das cotas por linha fecha EXATAMENTE no total agregado", () => {
    const valores = [33_333, 1, 999, 10_000, 7]
    const total = Math.round(valores.reduce((a, b) => a + b, 0) / 2)
    const cotas = repartirCotaCompartilhada(valores, total)
    expect(cotas.reduce((a, b) => a + b, 0)).toBe(total)
  })

  it("o troco do arredondamento vai para as linhas de valor ímpar", () => {
    // 3 linhas de 1 centavo: o total arredonda para 2, então 2 das 3 recebem 1.
    const cotas = repartirCotaCompartilhada([1, 1, 1], 2)
    expect(cotas.reduce((a, b) => a + b, 0)).toBe(2)
    expect(cotas).toEqual([1, 1, 0])
  })

  it("valores pares são metade exata, sem troco", () => {
    expect(repartirCotaCompartilhada([40_000, 10_000], 25_000)).toEqual([20_000, 5_000])
  })

  it("lista vazia não quebra", () => {
    expect(repartirCotaCompartilhada([], 0)).toEqual([])
  })
})
