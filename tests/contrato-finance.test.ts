import { describe, expect, it } from "vitest"
import {
  contractDateToISO,
  contratanteToCadastro,
  honorariosToPlano,
} from "@/lib/documents/contrato-finance"
import type { Honorarios } from "@/lib/types/contrato-honorarios"

describe("contractDateToISO", () => {
  it("parses ISO, BR and extensa", () => {
    expect(contractDateToISO("2026-06-10")).toBe("2026-06-10")
    expect(contractDateToISO("10/06/2026")).toBe("2026-06-10")
    expect(contractDateToISO("10-6-26")).toBe("2026-06-10")
    expect(contractDateToISO("10 de junho de 2026")).toBe("2026-06-10")
    expect(contractDateToISO("")).toBeNull()
    expect(contractDateToISO("qualquer coisa")).toBeNull()
  })
})

describe("honorariosToPlano", () => {
  it("à vista → one installment", () => {
    const h: Honorarios = { tipo: "avista", valorTotal: "12.000,00", dataPagamento: "10/06/2026" }
    const p = honorariosToPlano(h)
    expect(p.parcelas).toEqual([{ valorCents: 1_200_000, vencISO: "2026-06-10", modo: "unica", vezes: 1 }])
    expect(p.totalCents).toBe(1_200_000)
    expect(p.exito).toBeNull()
  })

  it("parcelado → monthly recurrence with per-parcela value", () => {
    const h: Honorarios = { tipo: "parcelado", valorTotal: "102.000,00", qtParcelas: "12", valorParcelas: "8.500,00", dataPrimeiraParcela: "2026-04-01" }
    const p = honorariosToPlano(h)
    expect(p.parcelas).toHaveLength(1)
    expect(p.parcelas[0]).toEqual({ valorCents: 850_000, vencISO: "2026-04-01", modo: "mensal", vezes: 12 })
    expect(p.totalCents).toBe(12 * 850_000)
  })

  it("parcelas diferentes → one entry per parcela, zero-value dropped", () => {
    const h: Honorarios = {
      tipo: "parcelas_diferentes",
      parcelas: [
        { valor: "5.000,00", vencimento: "01/05/2026" },
        { valor: "3.000,00", vencimento: "01/06/2026" },
        { valor: "", vencimento: "01/07/2026" },
      ],
    }
    const p = honorariosToPlano(h)
    expect(p.parcelas).toHaveLength(2)
    expect(p.totalCents).toBe(800_000)
  })

  it("pure êxito → no fixed parcelas, success-fee note only", () => {
    const h: Honorarios = { tipo: "exito", percentual: "20", baseCalculo: "proveito econômico" }
    const p = honorariosToPlano(h)
    expect(p.parcelas).toHaveLength(0)
    expect(p.totalCents).toBe(0)
    expect(p.exito).toEqual({ percentual: "20", base: "proveito econômico" })
  })

  it("à vista + êxito → fixed installment AND success-fee note", () => {
    const h: Honorarios = { tipo: "avista_exito", valorTotal: "10.000,00", dataPagamento: "2026-06-10", percentualExito: "15", baseCalculoExito: "condenação" }
    const p = honorariosToPlano(h)
    expect(p.parcelas).toHaveLength(1)
    expect(p.totalCents).toBe(1_000_000)
    expect(p.exito).toEqual({ percentual: "15", base: "condenação" })
  })
})

describe("contratanteToCadastro", () => {
  it("maps a PF contratante", () => {
    const cad = contratanteToCadastro({
      tipo: "pf", nome: "Helena Vargas", genero: "feminino", nacionalidade: "brasileira",
      estadoCivil: "solteira", profissao: "empresária", rg: "1", cpf: "312.984.760-15",
      endereco: "Rua X, 1", email: "h@v.com",
    })
    expect(cad).toEqual({ nome: "Helena Vargas", tipo: "pf", cpfCnpj: "312.984.760-15", logradouro: "Rua X, 1", emails: ["h@v.com"] })
  })

  it("maps a PJ contratante", () => {
    const cad = contratanteToCadastro({
      tipo: "pj", razaoSocial: "Aurora S/A", cnpj: "00.000.000/0001-00", endereco: "Av Y, 2", email: "c@a.com", socios: [],
    })
    expect(cad).toEqual({ nome: "Aurora S/A", tipo: "pj", cpfCnpj: "00.000.000/0001-00", logradouro: "Av Y, 2", emails: ["c@a.com"] })
  })
})
