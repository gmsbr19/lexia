import { describe, expect, it } from "vitest"
import { datePresets } from "@/lib/datas/presets"

describe("datePresets", () => {
  it("returns the 5 presets in order, with hoje/amanhã resolved", () => {
    const p = datePresets("2026-07-22") // quarta-feira
    expect(p.map((x) => x.key)).toEqual(["hoje", "amanha", "fim-de-semana", "proxima-semana", "sem-vencimento"])
    expect(p[0]).toMatchObject({ label: "Hoje", iso: "2026-07-22" })
    expect(p[1]).toMatchObject({ label: "Amanhã", iso: "2026-07-23" })
    expect(p[4]).toMatchObject({ label: "Sem vencimento", iso: null })
    expect(p[4].hint).toBeUndefined()
  })

  it("'Este fim de semana' jumps to the coming Saturday from a weekday", () => {
    const p = datePresets("2026-07-22") // quarta-feira
    const fds = p.find((x) => x.key === "fim-de-semana")
    expect(fds?.iso).toBe("2026-07-25") // sábado
    expect(fds?.hint).toBe("sáb")
  })

  it("'Este fim de semana' stays on hojeISO when today IS a Saturday", () => {
    const p = datePresets("2026-07-25") // sábado
    const fds = p.find((x) => x.key === "fim-de-semana")
    expect(fds?.iso).toBe("2026-07-25")
  })

  it("'Este fim de semana' stays on hojeISO when today IS a Sunday", () => {
    const p = datePresets("2026-07-19") // domingo
    const fds = p.find((x) => x.key === "fim-de-semana")
    expect(fds?.iso).toBe("2026-07-19")
  })

  it("'Próxima semana' is the next Monday strictly after hojeISO", () => {
    const p = datePresets("2026-07-22") // quarta-feira
    const ps = p.find((x) => x.key === "proxima-semana")
    expect(ps?.iso).toBe("2026-07-27") // segunda seguinte
  })

  it("'Próxima semana' when hojeISO is itself a domingo advances just to the next day", () => {
    const p = datePresets("2026-07-19") // domingo
    const ps = p.find((x) => x.key === "proxima-semana")
    expect(ps?.iso).toBe("2026-07-20") // segunda, amanhã
  })

  it("'Próxima semana' when hojeISO is itself a segunda jumps a full week", () => {
    const p = datePresets("2026-07-20") // segunda
    const ps = p.find((x) => x.key === "proxima-semana")
    expect(ps?.iso).toBe("2026-07-27")
  })
})
