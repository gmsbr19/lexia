import { describe, expect, it } from "vitest"
import { parseDataNatural } from "@/lib/datas/nl"

// hojeISO anchored on 2026-07-22, a QUARTA-feira (weekday 3).
const HOJE = "2026-07-22"

describe("parseDataNatural — vocabulary", () => {
  it("hoje", () => {
    const r = parseDataNatural("Fazer isso hoje", HOJE)
    expect(r).toEqual({ iso: "2026-07-22", hora: null, matched: "hoje" })
  })

  it("depois de amanhã — checked BEFORE amanhã (prefix collision)", () => {
    const r = parseDataNatural("Entregar depois de amanhã", HOJE)
    expect(r?.iso).toBe("2026-07-24")
    expect(r?.matched).toBe("depois de amanhã")
  })

  it("amanhã (accented)", () => {
    expect(parseDataNatural("Reunião amanhã", HOJE)?.iso).toBe("2026-07-23")
  })

  it("amanha (accent-stripped variant)", () => {
    expect(parseDataNatural("Reuniao amanha", HOJE)?.iso).toBe("2026-07-23")
  })

  it("este fim de semana / esse fim de semana", () => {
    expect(parseDataNatural("Viajar este fim de semana", HOJE)?.iso).toBe("2026-07-25")
    expect(parseDataNatural("Viajar esse fim de semana", HOJE)?.iso).toBe("2026-07-25")
  })

  it("próxima semana / proxima semana (accent-stripped variant)", () => {
    expect(parseDataNatural("Protocolar próxima semana", HOJE)?.iso).toBe("2026-07-27")
    expect(parseDataNatural("Protocolar proxima semana", HOJE)?.iso).toBe("2026-07-27")
  })

  it("em N dias / em N semanas / em N meses", () => {
    expect(parseDataNatural("Retornar em 5 dias", HOJE)?.iso).toBe("2026-07-27")
    expect(parseDataNatural("Retornar em 2 semanas", HOJE)?.iso).toBe("2026-08-05")
    expect(parseDataNatural("Retornar em 3 meses", HOJE)?.iso).toBe("2026-10-22")
  })

  it("weekday keyword said on a DIFFERENT weekday resolves to the coming occurrence", () => {
    // hoje é quarta; "terça" -> a próxima terça (+6d), não a de ontem.
    expect(parseDataNatural("Audiência terça", HOJE)?.iso).toBe("2026-07-28")
  })

  it("weekday keyword said ON that same weekday jumps +7, not +0", () => {
    // hoje é quarta; dizer "quarta" não pode devolver hoje.
    expect(parseDataNatural("Retornar quarta", HOJE)?.iso).toBe("2026-07-29")
  })

  it("weekday accent-stripped variant (sabado)", () => {
    const r = parseDataNatural("Evento sabado", HOJE)
    expect(r?.iso).toBe("2026-07-25") // sábado desta semana
  })

  it("'dia N' stays in the current month when the day hasn't passed yet", () => {
    expect(parseDataNatural("Pagar dia 25", HOJE)?.iso).toBe("2026-07-25")
  })

  it("'dia N' rolls into next month once the day has already passed", () => {
    // hoje é dia 22; "dia 5" (já passou este mês) -> agosto
    expect(parseDataNatural("Pagar dia 5", HOJE)?.iso).toBe("2026-08-05")
  })

  it("absolute DD/MM without a year infers the current year", () => {
    expect(parseDataNatural("Prazo 24/12", HOJE)?.iso).toBe("2026-12-24")
  })

  it("absolute DD/MM rolls to next year once it has already passed this year", () => {
    expect(parseDataNatural("Prazo 10/01", HOJE)?.iso).toBe("2027-01-10")
  })

  it("absolute DD/MM/YYYY takes the explicit year as-is (no rolling)", () => {
    expect(parseDataNatural("Prazo 05/03/2025", HOJE)?.iso).toBe("2025-03-05")
  })

  it("'DD de <mês>' this year when still ahead", () => {
    expect(parseDataNatural("Audiência 15 de agosto", HOJE)?.iso).toBe("2026-08-15")
  })

  it("'DD de <mês>' rolls to next year once it has already passed", () => {
    expect(parseDataNatural("Audiência 10 de janeiro", HOJE)?.iso).toBe("2027-01-10")
  })

  it("sem vencimento / sem data / sem prazo — explicit clear", () => {
    expect(parseDataNatural("Tarefa sem vencimento", HOJE)).toEqual({
      iso: null,
      hora: null,
      matched: "sem vencimento",
    })
    expect(parseDataNatural("Tarefa sem data", HOJE)?.iso).toBeNull()
    expect(parseDataNatural("Tarefa sem prazo", HOJE)?.iso).toBeNull()
  })

  // Deliberate choice: a calendar-invalid absolute date (Feb never has 31 days,
  // in ANY year) is treated as unrecognized rather than clamped/rolled to the
  // nearest valid date — see the comment in nl.ts's absolute-date branch.
  it("an invalid absolute date (31/02) is not understood at all", () => {
    expect(parseDataNatural("Prazo 31/02", HOJE)).toBeNull()
  })

  it("combines an independent date phrase with a time phrase", () => {
    const r = parseDataNatural("Reunião sexta 14h", HOJE)
    expect(r?.iso).toBe("2026-07-24") // sexta desta semana
    expect(r?.hora).toBe("14:00")
    expect(r?.matched).toContain("sexta")
    expect(r?.matched).toContain("14h")
  })

  it("a bare time phrase alone still resolves hora with no iso", () => {
    const r = parseDataNatural("Ligar 9h30", HOJE)
    expect(r?.iso).toBeNull()
    expect(r?.hora).toBe("09:30")
  })

  it("returns null for plain text with no recognizable date/time phrase", () => {
    expect(parseDataNatural("Revisar minuta do contrato social", HOJE)).toBeNull()
  })
})
