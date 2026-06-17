import { describe, expect, it } from "vitest"
import { computeAcertoSocios, type AcertoSocioConta } from "@/lib/finance/acerto"

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
