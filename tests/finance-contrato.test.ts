import { describe, expect, it } from "vitest"
import { montarContratoRow, type ContratoAggInput } from "@/lib/finance/contrato"

const input = (over: Partial<ContratoAggInput>): ContratoAggInput => ({
  id: 1,
  titulo: "Contrato",
  tipo: "consultivo",
  status: "ativo",
  area: "soc",
  origem: null,
  dataFechamento: null,
  clienteId: null,
  clienteNome: null,
  clienteOrigem: null,
  honorarios: [],
  casosIds: [],
  leads: [],
  ...over,
})

describe("montarContratoRow", () => {
  it("sums the contract's honorários as valor contratado, with recebido as the paid subset", () => {
    const r = montarContratoRow(
      input({
        honorarios: [
          { valorCents: 90000, status: "recebido" },
          { valorCents: 90000, status: "lancado" },
          { valorCents: 20000, status: "recebido" },
        ],
      }),
    )
    expect(r.valorContratadoCents).toBe(200000)
    expect(r.recebidoCents).toBe(110000)
    expect(r.honorariosCount).toBe(3)
  })

  it("with a single caso, exposes unicoCasoId for navigation (casosCount 1)", () => {
    const r = montarContratoRow(input({ casosIds: [137] }))
    expect(r.casosCount).toBe(1)
    expect(r.unicoCasoId).toBe(137)
  })

  it("sums honorários across MULTIPLE casos under one contrato (Phase 2 readiness); no único caso", () => {
    // Ex.: "assessoria global" (caso 137) + "ação de obrigação de fazer" (caso 140),
    // both feeding one contract — the fees add up and navigation opens the contract.
    const r = montarContratoRow(
      input({
        casosIds: [137, 140],
        honorarios: [
          { valorCents: 90000, status: "recebido" },
          { valorCents: 500000, status: "lancado" },
        ],
      }),
    )
    expect(r.valorContratadoCents).toBe(590000)
    expect(r.casosCount).toBe(2)
    expect(r.unicoCasoId).toBeNull()
  })

  it("origem precedence: contract snapshot beats cliente and lead", () => {
    const r = montarContratoRow(
      input({ origem: "google_ads", clienteOrigem: "indicacao", leads: [{ origem: "meta_ads", dataConversao: new Date() }] }),
    )
    expect(r.origem).toBe("google_ads")
  })

  it("origem falls back to the cliente, then to the most-recent won-lead", () => {
    expect(montarContratoRow(input({ clienteOrigem: "indicacao" })).origem).toBe("indicacao")
    const r = montarContratoRow(
      input({
        leads: [
          { origem: "google_ads", dataConversao: new Date("2026-01-01") },
          { origem: "meta_ads", dataConversao: new Date("2026-06-01") },
        ],
      }),
    )
    expect(r.origem).toBe("meta_ads") // latest conversion
  })

  it("origem is null (Direto) when there is no contract/cliente/lead origem", () => {
    expect(montarContratoRow(input({})).origem).toBeNull()
  })

  it("emits dataFechamento as ISO (or null)", () => {
    expect(montarContratoRow(input({ dataFechamento: new Date("2026-06-08T12:00:00.000Z") })).dataFechamento).toBe(
      "2026-06-08T12:00:00.000Z",
    )
    expect(montarContratoRow(input({ dataFechamento: null })).dataFechamento).toBeNull()
  })
})
