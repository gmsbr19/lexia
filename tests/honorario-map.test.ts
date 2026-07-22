import { describe, expect, it } from "vitest"
import { aggFeeTotals, contratoToRow, lancamentoToHonorarioRow, type ContratoInput, type FeeLancamento } from "@/lib/finance/honorario-map"

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

describe("contratoToRow", () => {
  const caso = (over: Partial<ContratoInput["casos"][number]> = {}): ContratoInput["casos"][number] => ({
    id: 10,
    titulo: "Caso A",
    tipo: "consultivo",
    status: "Ativo",
    area: "trab",
    lancamentos: [{ valorCents: 100000, status: "feito" }],
    leads: [],
    ...over,
  })
  const contrato = (over: Partial<ContratoInput> = {}): ContratoInput => ({
    id: 1,
    titulo: null,
    dataFechamento: new Date("2026-07-08T12:00:00.000Z"),
    clienteId: 5,
    clienteNome: "Cliente X",
    clienteOrigem: null,
    casos: [caso()],
    ...over,
  })

  it("sums fee-lançamentos across ALL linked casos (not just one)", () => {
    const r = contratoToRow(
      contrato({
        casos: [
          caso({ id: 1, lancamentos: [{ valorCents: 100000, status: "feito" }] }),
          caso({ id: 2, lancamentos: [{ valorCents: 50000, status: "aberto" }] }),
        ],
      }),
    )
    expect(r.valorContratadoCents).toBe(150000)
    expect(r.recebidoCents).toBe(100000)
    expect(r.honorariosCount).toBe(2)
    expect(r.casosCount).toBe(2)
    expect(r.unicoCasoId).toBeNull() // multi-caso → no single navigation target
  })

  it("titulo falls back: contrato.titulo → único caso.titulo → cliente.nome → '#id'", () => {
    expect(contratoToRow(contrato({ titulo: "Contrato NCM" })).titulo).toBe("Contrato NCM")
    expect(contratoToRow(contrato({ titulo: null, casos: [caso({ titulo: "Caso Único" })] })).titulo).toBe(
      "Caso Único",
    )
    expect(
      contratoToRow(contrato({ titulo: null, casos: [caso(), caso({ id: 2 })], clienteNome: "Cliente Y" })).titulo,
    ).toBe("Cliente Y")
    expect(contratoToRow(contrato({ titulo: null, casos: [], clienteNome: null, id: 9 })).titulo).toBe(
      "Contrato #9",
    )
  })

  it("origem: cliente.origem vence; senão o lead ganho mais recente entre os casos", () => {
    expect(contratoToRow(contrato({ clienteOrigem: "indicacao" })).origem).toBe("indicacao")
    const r = contratoToRow(
      contrato({
        clienteOrigem: null,
        casos: [
          caso({
            leads: [
              { origem: "google_ads", dataConversao: new Date("2026-01-01") },
              { origem: "meta_ads", dataConversao: new Date("2026-06-01") },
            ],
          }),
        ],
      }),
    )
    expect(r.origem).toBe("meta_ads")
  })

  it("área/tipo/status só aparecem com exatamente 1 caso (ambíguo com vários)", () => {
    const single = contratoToRow(contrato({ casos: [caso({ area: "trib", tipo: "litigio", status: "Ativo" })] }))
    expect(single.area).toBe("trib")
    expect(single.tipo).toBe("litigio")
    expect(single.unicoCasoId).toBe(10)

    const multi = contratoToRow(contrato({ casos: [caso(), caso({ id: 2 })] }))
    expect(multi.area).toBeNull()
    expect(multi.tipo).toBeNull()
    expect(multi.statusCaso).toBeNull()
  })
})
