import { describe, expect, it } from "vitest"
import { parseRecur, proximaOcorrencia, recorrenciaOptions } from "@/lib/datas/recorrencia"
import { weekdayOf } from "@/lib/datas/util"

describe("parseRecur", () => {
  it("null/undefined/'Não repete' -> null", () => {
    expect(parseRecur(null)).toBeNull()
    expect(parseRecur(undefined)).toBeNull()
    expect(parseRecur("Não repete")).toBeNull()
  })

  it("the fixed labels", () => {
    expect(parseRecur("Diariamente")).toEqual({ tipo: "diaria" })
    expect(parseRecur("Toda semana")).toEqual({ tipo: "semanal" })
    expect(parseRecur("Mensalmente")).toEqual({ tipo: "mensal" })
  })

  it("'Toda <dia da semana>' for ANY weekday, short or long, with or without '-feira'", () => {
    expect(parseRecur("Toda terça")).toEqual({ tipo: "dia-semana", diaSemana: 2 })
    expect(parseRecur("Toda sexta-feira")).toEqual({ tipo: "dia-semana", diaSemana: 5 })
    expect(parseRecur("Toda dom")).toEqual({ tipo: "dia-semana", diaSemana: 0 })
    expect(parseRecur("Toda segunda")).toEqual({ tipo: "dia-semana", diaSemana: 1 })
  })

  it("'A cada N dias'", () => {
    expect(parseRecur("A cada 15 dias")).toEqual({ tipo: "intervalo-dias", intervaloDias: 15 })
    expect(parseRecur("A cada 3 dias")).toEqual({ tipo: "intervalo-dias", intervaloDias: 3 })
  })

  it("'Todo dia N'", () => {
    expect(parseRecur("Todo dia 15")).toEqual({ tipo: "dia-do-mes", diaDoMes: 15 })
    expect(parseRecur("Todo dia 31")).toEqual({ tipo: "dia-do-mes", diaDoMes: 31 })
  })

  it("returns null for an unparseable label, never throws", () => {
    expect(parseRecur("Toda lua cheia")).toBeNull()
    expect(parseRecur("qualquer coisa")).toBeNull()
    expect(parseRecur("")).toBeNull()
  })
})

describe("recorrenciaOptions", () => {
  it("computes the two date-dependent entries from baseISO's own weekday/day-of-month", () => {
    // 2026-07-24 é uma sexta-feira, dia 24
    expect(recorrenciaOptions("2026-07-24")).toEqual([
      "Não repete",
      "Diariamente",
      "Toda sexta",
      "Toda semana",
      "A cada 15 dias",
      "Todo dia 24",
      "Mensalmente",
    ])
  })
})

describe("proximaOcorrencia", () => {
  // baseISO = 2026-07-24 (sexta-feira). "Completed exactly on the due date"
  // scenario — hojeISO === baseISO — so every tipo takes exactly ONE step.
  const BASE = "2026-07-24"

  it("diaria", () => {
    expect(proximaOcorrencia("Diariamente", BASE, BASE)).toBe("2026-07-25")
  })
  it("semanal", () => {
    expect(proximaOcorrencia("Toda semana", BASE, BASE)).toBe("2026-07-31")
  })
  it("dia-semana (base já cai no dia-alvo -> pula uma semana inteira, nunca +0)", () => {
    expect(proximaOcorrencia("Toda sexta", BASE, BASE)).toBe("2026-07-31")
  })
  it("intervalo-dias", () => {
    expect(proximaOcorrencia("A cada 15 dias", BASE, BASE)).toBe("2026-08-08")
  })
  it("mensal — mantém o dia-do-mês do baseISO, clampado", () => {
    expect(proximaOcorrencia("Mensalmente", BASE, BASE)).toBe("2026-08-24")
  })
  it("dia-do-mes — usa o dia fixo do rótulo, não o do baseISO", () => {
    expect(proximaOcorrencia("Todo dia 15", BASE, BASE)).toBe("2026-08-15")
  })

  it("never returns baseISO itself, even when baseISO is already ahead of hojeISO", () => {
    // completar uma tarefa ANTES do prazo: a próxima ocorrência ainda avança
    // um ciclo, nunca repete a mesma data.
    const r = proximaOcorrencia("Diariamente", "2026-08-01", "2026-07-22")
    expect(r).toBe("2026-08-02")
  })

  it("month-end clamp: 'Todo dia 31' starting from a 31-day month lands correctly in fevereiro", () => {
    expect(proximaOcorrencia("Todo dia 31", "2026-01-31", "2026-01-31")).toBe("2026-02-28")
  })

  it("a task completed LATE (baseISO far in the past) still advances to a FUTURE date, never a past one", () => {
    const hoje = "2026-07-22"
    const r = proximaOcorrencia("Toda segunda", "2020-01-01", hoje)
    expect(r).not.toBeNull()
    expect(r! > hoje).toBe(true)
    expect(weekdayOf(r!)).toBe(1) // segunda-feira

    const rDiaria = proximaOcorrencia("Diariamente", "2026-01-01", hoje)
    expect(rDiaria).toBe("2026-07-23") // avança dia a dia até passar de hoje
  })

  it("an unparseable label returns null", () => {
    expect(proximaOcorrencia("Toda lua cheia", BASE, BASE)).toBeNull()
    expect(proximaOcorrencia(null, BASE, BASE)).toBeNull()
    expect(proximaOcorrencia("Não repete", BASE, BASE)).toBeNull()
  })
})
