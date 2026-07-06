import { describe, expect, it } from "vitest"
import { cmDefaultDateFor, cmDeltaPct, cmKpis, cmRefToday, cmScope, type CmRef } from "@/components/comercial/cm-meta"
import { cmRedactLeads, initials } from "@/lib/comercial/lgpd"
import type { CmDatasetGasto, CmDatasetLead } from "@/lib/comercial/types"

const REF: CmRef = { y: 2026, m: 5 } // June 2026

function lead(over: Partial<CmDatasetLead>): CmDatasetLead {
  return {
    id: 1,
    nome: "Lead Teste",
    contato: "11 99999-0000",
    origem: "google_ads",
    campanhaId: null,
    etapa: "novo",
    valorEstimadoCents: 0,
    valorContratadoCents: null,
    dataEntrada: "2026-06-10",
    dataConv: null,
    cliente: null,
    caso: null,
    motivoPerda: null,
    area: null,
    ...over,
  }
}

function gasto(over: Partial<CmDatasetGasto>): CmDatasetGasto {
  return { id: 1, campanhaId: null, valorCents: 0, data: "2026-06-05", conta: null, descricao: null, ...over }
}

describe("cmKpis — zero denominators", () => {
  it("is all-null/zero with no data (no division by zero)", () => {
    const k = cmKpis([], [], REF, "mes")
    expect(k.leads).toBe(0)
    expect(k.taxaConv).toBe(0)
    expect(k.roas).toBeNull()
    expect(k.roi).toBeNull()
    expect(k.cac).toBeNull()
    expect(k.cpl).toBeNull()
    expect(k.ticket).toBeNull()
  })

  it("zero investment → ROAS/ROI null even with conversions", () => {
    const k = cmKpis([lead({ etapa: "ganho", valorContratadoCents: 300_000 })], [], REF, "mes")
    expect(k.conversoes).toBe(1)
    expect(k.roas).toBeNull()
    expect(k.roi).toBeNull()
    expect(k.cac).toBe(0) // spent nothing per conversion
    expect(k.ticket).toBe(300_000)
  })

  it("investment but zero conversions → CAC/ticket null, CPL computed", () => {
    const k = cmKpis([lead({})], [gasto({ valorCents: 100_000 })], REF, "mes")
    expect(k.cac).toBeNull()
    expect(k.ticket).toBeNull()
    expect(k.cpl).toBe(100_000)
  })
})

describe("cmKpis — happy path", () => {
  it("computes ROAS/ROI/CAC/CPL/ticket/taxa", () => {
    const leads = [lead({ id: 1 }), lead({ id: 2, etapa: "ganho", valorContratadoCents: 300_000 })]
    const gastos = [gasto({ valorCents: 100_000 })]
    const k = cmKpis(leads, gastos, REF, "mes")
    expect(k.leads).toBe(2)
    expect(k.conversoes).toBe(1)
    expect(k.taxaConv).toBe(50)
    expect(k.investimento).toBe(100_000)
    expect(k.valorContratado).toBe(300_000)
    expect(k.roas).toBe(3)
    expect(k.roi).toBe(200)
    expect(k.cac).toBe(100_000)
    expect(k.cpl).toBe(50_000)
    expect(k.ticket).toBe(300_000)
  })

  it("scopes by period (month vs quarter)", () => {
    const leads = [lead({ id: 1, dataEntrada: "2026-04-10" }), lead({ id: 2, dataEntrada: "2026-06-10" })]
    expect(cmKpis(leads, [], REF, "mes").leads).toBe(1)
    expect(cmKpis(leads, [], REF, "trimestre").leads).toBe(2)
    expect(cmKpis(leads, [], { y: 2025, m: 5 }, "ano").leads).toBe(0)
  })
})

describe("cmKpis — conversões atribuídas pelo mês de ENTRADA (contato)", () => {
  it("um lead que ENTROU no mês conta no mês mesmo fechando meses depois", () => {
    // June's spend/strategy brought it in → it's June's win, whenever it closes.
    const leads = [lead({ id: 1, etapa: "ganho", dataEntrada: "2026-06-10", dataConv: "2026-08-15", valorContratadoCents: 700_000 })]
    const k = cmKpis(leads, [], REF, "mes")
    expect(k.leads).toBe(1)
    expect(k.conversoes).toBe(1)
    expect(k.valorContratado).toBe(700_000)
  })

  it("um lead que entrou no mês anterior NÃO conta neste mês, mesmo fechando agora", () => {
    const leads = [lead({ id: 1, etapa: "ganho", dataEntrada: "2026-05-20", dataConv: "2026-06-03", valorContratadoCents: 500_000 })]
    const k = cmKpis(leads, [], REF, "mes")
    expect(k.leads).toBe(0) // entrou em maio → é resultado de maio
    expect(k.conversoes).toBe(0)
    expect(k.valorContratado).toBe(0)
  })
})

describe("cmDefaultDateFor", () => {
  it("devolve o último dia de um mês passado em visão", () => {
    expect(cmDefaultDateFor({ y: 2020, m: 2 }, "mes")).toBe("2020-03-31")
    expect(cmDefaultDateFor({ y: 2021, m: 1 }, "mes")).toBe("2021-02-28") // fev não-bissexto
  })
  it("devolve o último dia de um trimestre / ano passado", () => {
    expect(cmDefaultDateFor({ y: 2020, m: 0 }, "trimestre")).toBe("2020-03-31") // Q1
    expect(cmDefaultDateFor({ y: 2020, m: 7 }, "ano")).toBe("2020-12-31")
  })
  it("usa hoje quando o período atual está em visão", () => {
    const ref = cmRefToday()
    expect(cmScope(ref, "mes").test(cmDefaultDateFor(ref, "mes"))).toBe(true)
  })
})

describe("cmDeltaPct", () => {
  it("handles zero/null previous values", () => {
    expect(cmDeltaPct(0, 0)).toBe(0)
    expect(cmDeltaPct(5, 0)).toBeNull()
    expect(cmDeltaPct(null, 10)).toBeNull()
    expect(cmDeltaPct(10, null)).toBeNull()
  })

  it("computes percentage deltas (incl. negative base)", () => {
    expect(cmDeltaPct(150, 100)).toBe(50)
    expect(cmDeltaPct(50, 100)).toBe(-50)
    expect(cmDeltaPct(-50, -100)).toBe(50)
  })
})

describe("LGPD redaction", () => {
  it("turns names into initials", () => {
    expect(initials("Maria da Silva")).toBe("M. S.")
    expect(initials("João")).toBe("J.")
    expect(initials("Ana de Souza Pereira")).toBe("A. P.")
    expect(initials("")).toBe("")
    expect(initials(null)).toBe("")
  })

  it("strips lead PII for export", () => {
    const [r] = cmRedactLeads([lead({ nome: "Maria da Silva", contato: "11 9999", cliente: "Maria da Silva" })])
    expect(r.nome).toBe("M. S.")
    expect(r.contato).toBeNull()
    expect(r.cliente).toBe("M. S.")
  })
})
