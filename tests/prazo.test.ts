import { describe, expect, it } from "vitest"
import { addDiasISO, hojeISO, toISODate } from "@/lib/processos/datas"
import { montarFeriados } from "@/lib/processos/feriados"
import {
  calcularPrazo,
  dataInterna,
  emSuspensao,
  inicioPorDisponibilizacao,
  inicioPorPublicacao,
  isDiaUtil,
  proximoDiaUtil,
  type PrazoContexto,
} from "@/lib/processos/prazo"

// Full 2025+2026 holiday set (federal + forensic). No suspensions by default.
const ctx2026: PrazoContexto = { feriados: montarFeriados([2025, 2026]) }

describe("isDiaUtil / proximoDiaUtil", () => {
  it("treats weekends and holidays as non-business", () => {
    expect(isDiaUtil("2026-06-13", ctx2026)).toBe(false) // sábado
    expect(isDiaUtil("2026-06-14", ctx2026)).toBe(false) // domingo
    expect(isDiaUtil("2026-06-15", ctx2026)).toBe(true) // segunda
    expect(isDiaUtil("2026-04-21", ctx2026)).toBe(false) // Tiradentes
    expect(isDiaUtil("2026-06-04", ctx2026)).toBe(false) // Corpus Christi
  })

  it("rolls a weekend start forward to Monday", () => {
    expect(proximoDiaUtil("2026-06-13", ctx2026)).toBe("2026-06-15")
  })
})

describe("calcularPrazo — dias úteis", () => {
  it("início caindo no fim de semana é protraído ao 1º dia útil", () => {
    const r = calcularPrazo({ dataInicio: "2026-06-13", quantidadeDias: 15, ctx: ctx2026 })
    expect(r.dataInicioContagem).toBe("2026-06-15") // Saturday → Monday
    expect(r.dataFatal).toBe("2026-07-03") // 15 business days, no holiday in range
  })

  it("contestação de 15 dias úteis pulando feriado nacional e fins de semana", () => {
    // Start Mon 13/04; range crosses Tiradentes (21/04) and Dia do Trabalho (01/05).
    const r = calcularPrazo({ dataInicio: "2026-04-13", quantidadeDias: 15, ctx: ctx2026 })
    expect(r.dataInicioContagem).toBe("2026-04-13")
    expect(r.dataFatal).toBe("2026-05-05")
  })

  it("atravessa o período de suspensão 20/12–20/1 (CPC art. 220)", () => {
    const ctx: PrazoContexto = {
      feriados: montarFeriados([2025, 2026]),
      suspensoes: [{ de: "2025-12-20", ate: "2026-01-20" }],
    }
    const r = calcularPrazo({ dataInicio: "2025-12-17", quantidadeDias: 5, ctx })
    expect(r.dataInicioContagem).toBe("2025-12-17") // Wed, before the recess
    // Wed17(1) Thu18(2) Fri19(3) → recess → Wed 21/01(4) Thu 22/01(5)
    expect(r.dataFatal).toBe("2026-01-22")
  })

  it("respeita um feriado estadual específico passado como extra", () => {
    const semEstadual = calcularPrazo({ dataInicio: "2026-07-06", quantidadeDias: 5, ctx: ctx2026 })
    expect(semEstadual.dataFatal).toBe("2026-07-10")

    const comEstadual = calcularPrazo({
      dataInicio: "2026-07-06",
      quantidadeDias: 5,
      ctx: { feriados: montarFeriados([2026], ["2026-07-09"]) }, // Revolução Constitucionalista (SP)
    })
    expect(comEstadual.dataFatal).toBe("2026-07-13") // 09/07 skipped → rolls one business day
  })

  it("um prazo de 1 dia vence no próprio dia de início", () => {
    const r = calcularPrazo({ dataInicio: "2026-06-15", quantidadeDias: 1, ctx: ctx2026 })
    expect(r.dataFatal).toBe("2026-06-15")
  })

  it("rejeita quantidadeDias não-positiva", () => {
    expect(() => calcularPrazo({ dataInicio: "2026-06-15", quantidadeDias: 0, ctx: ctx2026 })).toThrow()
    expect(() => calcularPrazo({ dataInicio: "2026-06-15", quantidadeDias: -3, ctx: ctx2026 })).toThrow()
  })
})

describe("calcularPrazo — dias corridos", () => {
  it("conta dias corridos e protrai o vencimento p/ 1º dia útil", () => {
    // 6 corridos from Mon 15/06 → day 6 = Sat 20/06 → protraído p/ Mon 22/06.
    const r = calcularPrazo({ dataInicio: "2026-06-15", quantidadeDias: 6, tipoContagem: "corridos", ctx: ctx2026 })
    expect(r.dataFatal).toBe("2026-06-22")
  })

  it("vencimento em dia útil permanece", () => {
    const r = calcularPrazo({ dataInicio: "2026-06-15", quantidadeDias: 10, tipoContagem: "corridos", ctx: ctx2026 })
    expect(r.dataFatal).toBe("2026-06-24") // Wed, business day
  })

  it("pausa a contagem durante uma suspensão (não conta os dias suspensos)", () => {
    const ctx: PrazoContexto = {
      feriados: montarFeriados([2026]),
      suspensoes: [{ de: "2026-06-18", ate: "2026-06-22" }],
    }
    // 15(1)16(2)17(3) [18-22 suspenso] 23(4)24(5)25(6)
    const r = calcularPrazo({ dataInicio: "2026-06-15", quantidadeDias: 6, tipoContagem: "corridos", ctx })
    expect(r.dataFatal).toBe("2026-06-25")
  })
})

describe("dataInterna — margem de segurança", () => {
  it("recua N dias úteis a partir da data fatal", () => {
    expect(dataInterna("2026-07-03", 3, ctx2026)).toBe("2026-06-30")
  })
  it("margem 0 retorna a própria data fatal", () => {
    expect(dataInterna("2026-07-03", 0, ctx2026)).toBe("2026-07-03")
  })
})

describe("inicioPorDisponibilizacao — DJe (Lei 11.419)", () => {
  it("publicação no 1º dia útil seguinte; contagem inicia no 1º dia útil seguinte ao da publicação", () => {
    const r = inicioPorDisponibilizacao("2026-06-10", ctx2026) // qua
    expect(r.publicacao).toBe("2026-06-11") // qui
    expect(r.inicio).toBe("2026-06-12") // sex
  })
  it("disponibilização na sexta empurra publicação e início para a semana seguinte", () => {
    const r = inicioPorDisponibilizacao("2026-06-12", ctx2026) // sex
    expect(r.publicacao).toBe("2026-06-15") // seg
    expect(r.inicio).toBe("2026-06-16") // ter
  })
})

describe("inicioPorPublicacao — data de publicação conhecida (1 hop só)", () => {
  it("início = 1º dia útil seguinte à publicação, SEM o hop extra de disponibilização", () => {
    // Disponibilização qua 06-10 → publicação qui 06-11 → início sex 06-12 (2 hops).
    // Sabendo a publicação (qui 06-11) diretamente, aplica-se UM hop → mesmo 06-12.
    const r = inicioPorPublicacao("2026-06-11", ctx2026)
    expect(r.publicacao).toBe("2026-06-11")
    expect(r.inicio).toBe("2026-06-12")
  })
  it("publicação na sexta → início na segunda (não pula uma semana a mais)", () => {
    const r = inicioPorPublicacao("2026-06-12", ctx2026) // sex
    expect(r.inicio).toBe("2026-06-15") // seg — vs disponibilização-sex que iria p/ ter 06-16
  })
})

describe("casos de borda nomeados (prompt CNJ)", () => {
  it("publicação que cairia em feriado é empurrada (disponibilização véspera de Tiradentes)", () => {
    // Disponibilização seg 20/04. Publicação = 1º dia útil após = ter 21/04 (Tiradentes,
    // feriado) → empurra p/ qua 22/04. Início = 1º dia útil após = qui 23/04.
    const r = inicioPorDisponibilizacao("2026-04-20", ctx2026)
    expect(r.publicacao).toBe("2026-04-22")
    expect(r.inicio).toBe("2026-04-23")
  })

  it("prazo de 30 dias úteis pulando apenas fins de semana", () => {
    const r = calcularPrazo({ dataInicio: "2026-06-15", quantidadeDias: 30, ctx: ctx2026 })
    expect(r.dataInicioContagem).toBe("2026-06-15") // segunda
    expect(r.dataFatal).toBe("2026-07-24") // 30º dia útil
  })

  it("emenda de feriado prolongado: a ponte configurada é descontada", () => {
    // Corpus Christi cai numa quinta (04/06/2026); a sexta 05/06 vira "emenda" forense.
    const ctxEmenda: PrazoContexto = { feriados: montarFeriados([2026], ["2026-06-05"]) }
    const comEmenda = calcularPrazo({ dataInicio: "2026-06-01", quantidadeDias: 5, ctx: ctxEmenda })
    expect(comEmenda.dataFatal).toBe("2026-06-09") // seg(1) ter(2) qua(3) [qui CC] [sex emenda] seg(4) ter(5)
    const semEmenda = calcularPrazo({ dataInicio: "2026-06-01", quantidadeDias: 5, ctx: ctx2026 })
    expect(semEmenda.dataFatal).toBe("2026-06-08") // sem a emenda, a sexta 05/06 conta
  })
})

describe("emSuspensao", () => {
  it("é inclusivo nas bordas", () => {
    const ctx: PrazoContexto = { feriados: new Set(), suspensoes: [{ de: "2025-12-20", ate: "2026-01-20" }] }
    expect(emSuspensao("2025-12-20", ctx)).toBe(true)
    expect(emSuspensao("2026-01-20", ctx)).toBe(true)
    expect(emSuspensao("2026-01-21", ctx)).toBe(false)
    expect(emSuspensao("2025-12-19", ctx)).toBe(false)
  })
})

describe("datas — timezone immunity (São Paulo)", () => {
  it("23:30 em São Paulo continua sendo 'hoje', não rola para o dia seguinte em UTC", () => {
    // 2026-06-13T23:30-03:00 == 2026-06-14T02:30Z; the SP wall-clock day is the 13th.
    expect(hojeISO(new Date("2026-06-13T23:30:00-03:00"))).toBe("2026-06-13")
    expect(toISODate(new Date("2026-06-14T01:00:00Z"))).toBe("2026-06-13")
  })
  it("addDiasISO faz aritmética exata através da virada de mês/ano", () => {
    expect(addDiasISO("2025-12-31", 1)).toBe("2026-01-01")
    expect(addDiasISO("2026-03-01", -1)).toBe("2026-02-28")
    expect(addDiasISO("2024-02-28", 1)).toBe("2024-02-29") // leap year
  })
})
