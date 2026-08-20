import { describe, expect, it } from "vitest"
import { inicioDaSemana, ultimasSemanas } from "@/lib/captacao/reconciliacao-core"

describe("inicioDaSemana", () => {
  it("uma quarta-feira volta para a segunda-feira da mesma semana", () => {
    // 2026-08-19 é uma quarta-feira
    expect(inicioDaSemana(new Date("2026-08-19T12:00:00.000Z"))).toBe("2026-08-17")
  })

  it("a própria segunda-feira fica em si mesma", () => {
    expect(inicioDaSemana(new Date("2026-08-17T00:00:00.000Z"))).toBe("2026-08-17")
  })

  it("domingo volta para a segunda-feira ANTERIOR (não a próxima)", () => {
    // 2026-08-23 é um domingo — segunda anterior é 2026-08-17
    expect(inicioDaSemana(new Date("2026-08-23T12:00:00.000Z"))).toBe("2026-08-17")
  })

  it("sábado volta para a segunda-feira da mesma semana", () => {
    expect(inicioDaSemana(new Date("2026-08-22T12:00:00.000Z"))).toBe("2026-08-17")
  })

  it("é estável através de virada de mês", () => {
    // 2026-09-01 é uma terça-feira → segunda é 2026-08-31
    expect(inicioDaSemana(new Date("2026-09-01T12:00:00.000Z"))).toBe("2026-08-31")
  })
})

describe("ultimasSemanas", () => {
  it("devolve N semanas, mais recente primeiro, sem repetir", () => {
    const semanas = ultimasSemanas(new Date("2026-08-19T12:00:00.000Z"), 4)
    expect(semanas).toEqual(["2026-08-17", "2026-08-10", "2026-08-03", "2026-07-27"])
  })

  it("n=1 devolve só a semana atual", () => {
    expect(ultimasSemanas(new Date("2026-08-19T12:00:00.000Z"), 1)).toEqual(["2026-08-17"])
  })
})
