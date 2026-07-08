import { describe, expect, it } from "vitest"
import { aggFeeTotals, lancamentoToHonorarioRow, type FeeLancamento } from "@/lib/finance/honorario-map"

// A honorário is a Lancamento entrada (subTipo='honorario'); these pure helpers
// project the ledger onto the legacy HonorarioRow / contrato-totals view-models.
const fee = (over: Partial<FeeLancamento> = {}): FeeLancamento => ({
  id: 42,
  descricao: "Honorários · assessoria",
  valorCents: 300000,
  status: "aberto",
  tipoHonorario: "recorrente",
  dataVencimento: new Date("2026-07-08T12:00:00.000Z"),
  dataPagamento: null,
  contaId: 3,
  clienteId: 7,
  casoId: 9,
  clienteNome: "Cliente X",
  casoTitulo: "Caso Y",
  contaNome: "Conta Z",
  ...over,
})

describe("lancamentoToHonorarioRow", () => {
  it("maps status feito→recebido / aberto→lancado, id = lançamento id, valor = abs", () => {
    const aberto = lancamentoToHonorarioRow(fee({ status: "aberto" }))
    expect(aberto.status).toBe("lancado")
    expect(aberto.id).toBe(42)
    expect(aberto.lancamentoId).toBe(42)

    const pago = lancamentoToHonorarioRow(fee({ status: "feito", valorCents: -500 }))
    expect(pago.status).toBe("recebido")
    expect(pago.valorCents).toBe(500) // magnitude
  })

  it("carries tipoHonorario as the composição bucket, null for unknown", () => {
    expect(lancamentoToHonorarioRow(fee({ tipoHonorario: "exito" })).tipo).toBe("exito")
    expect(lancamentoToHonorarioRow(fee({ tipoHonorario: null })).tipo).toBeNull()
    expect(lancamentoToHonorarioRow(fee({ tipoHonorario: "xpto" })).tipo).toBeNull()
  })

  it("denormalizes names + ISO dates; falls back to 'Honorário' when no descrição", () => {
    const r = lancamentoToHonorarioRow(fee({ descricao: null }))
    expect(r.descricao).toBe("Honorário")
    expect(r.cliente).toBe("Cliente X")
    expect(r.caso).toBe("Caso Y")
    expect(r.conta).toBe("Conta Z")
    expect(r.vencimento).toBe("2026-07-08T12:00:00.000Z")
    expect(r.dataPagamento).toBeNull()
  })
})

describe("aggFeeTotals (contrato = derived view over fee-lançamentos)", () => {
  it("sums contratado (abs) and recebido (status feito) with a count", () => {
    const r = aggFeeTotals([
      { valorCents: 90000, status: "feito" },
      { valorCents: 90000, status: "aberto" },
      { valorCents: 20000, status: "feito" },
    ])
    expect(r.contratadoCents).toBe(200000)
    expect(r.recebidoCents).toBe(110000)
    expect(r.count).toBe(3)
  })

  it("empty → zeros", () => {
    expect(aggFeeTotals([])).toEqual({ contratadoCents: 0, recebidoCents: 0, count: 0 })
  })
})
