import { describe, expect, it } from "vitest"
import { urgenciaDe } from "@/lib/processos/urgencia"

describe("urgenciaDe — semáforo derivado (nunca armazenado)", () => {
  it("prazo vencido → vermelho, dias negativos", () => {
    const u = urgenciaDe("2026-06-10", null, "2026-06-15")
    expect(u.estado).toBe("vencido")
    expect(u.faixa).toBe("vermelho")
    expect(u.diasRestantes).toBe(-5)
  })

  it("vence hoje → vermelho", () => {
    const u = urgenciaDe("2026-06-15", null, "2026-06-15")
    expect(u.estado).toBe("hoje")
    expect(u.faixa).toBe("vermelho")
    expect(u.diasRestantes).toBe(0)
  })

  it("dentro de 5 dias da fatal → âmbar", () => {
    const u = urgenciaDe("2026-06-18", null, "2026-06-15")
    expect(u.estado).toBe("futuro")
    expect(u.faixa).toBe("ambar")
    expect(u.diasRestantes).toBe(3)
  })

  it("longe da fatal e antes da data interna → verde", () => {
    const u = urgenciaDe("2026-06-30", "2026-06-25", "2026-06-15")
    expect(u.faixa).toBe("verde")
    expect(u.diasRestantes).toBe(15)
  })

  it("já atingiu a data interna → vermelho (a margem tem precedência sobre âmbar)", () => {
    const u = urgenciaDe("2026-06-30", "2026-06-25", "2026-06-26")
    expect(u.estado).toBe("futuro")
    expect(u.faixa).toBe("vermelho")
    expect(u.diasRestantes).toBe(4)
  })

  it("respeita o limiar de âmbar configurável", () => {
    expect(urgenciaDe("2026-06-25", null, "2026-06-15", { ambarDias: 12 }).faixa).toBe("ambar")
    expect(urgenciaDe("2026-06-25", null, "2026-06-15", { ambarDias: 3 }).faixa).toBe("verde")
  })
})
