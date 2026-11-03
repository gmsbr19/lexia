import { describe, expect, it } from "vitest"
import {
  anoCompleto,
  detectPreset,
  diasNaFaixa,
  faixaAnterior,
  faixaLabel,
  faixaRange,
  faixaSlug,
  isValidISODate,
  mesCompleto,
  mesesDaFaixa,
  mesesNaFaixa,
  naFaixa,
  normalizeFaixa,
  presetFaixa,
  shiftFaixa,
  trimestreCompleto,
} from "@/lib/finance/relatorio-periodo"

// 15/06/2026 — referência fixa para os presets (nunca lê o relógio ambiente).
const NOW = new Date(2026, 5, 15, 10, 0, 0)

describe("relatorio-periodo · validação", () => {
  it("rejeita data de calendário inexistente", () => {
    expect(isValidISODate("2026-02-30")).toBe(false)
    expect(isValidISODate("2026-13-01")).toBe(false)
    expect(isValidISODate("2026-06-31")).toBe(false)
    expect(isValidISODate("06/2026")).toBe(false)
    expect(isValidISODate(undefined)).toBe(false)
  })
  it("aceita datas válidas, incluindo 29/02 em ano bissexto", () => {
    expect(isValidISODate("2026-02-28")).toBe(true)
    expect(isValidISODate("2028-02-29")).toBe(true)
    expect(isValidISODate("2026-02-29")).toBe(false)
  })
})

describe("relatorio-periodo · normalizeFaixa", () => {
  it("sem parâmetros cai no mês corrente", () => {
    expect(normalizeFaixa(undefined, undefined, NOW)).toEqual({ de: "2026-06-01", ate: "2026-06-30" })
  })
  it("parâmetros inválidos caem no mês corrente", () => {
    expect(normalizeFaixa("ontem", "2026-02-31", NOW)).toEqual({ de: "2026-06-01", ate: "2026-06-30" })
  })
  it("inverte em vez de rejeitar quando de > ate", () => {
    expect(normalizeFaixa("2026-06-30", "2026-06-01", NOW)).toEqual({ de: "2026-06-01", ate: "2026-06-30" })
  })
  it("só um lado informado vira um relatório de um dia", () => {
    expect(normalizeFaixa("2026-03-10", undefined, NOW)).toEqual({ de: "2026-03-10", ate: "2026-03-10" })
    expect(normalizeFaixa(undefined, "2026-03-10", NOW)).toEqual({ de: "2026-03-10", ate: "2026-03-10" })
  })
  it("aceita array (searchParams repetido) usando o primeiro valor", () => {
    expect(normalizeFaixa(["2026-01-01", "x"], ["2026-01-31"], NOW)).toEqual({ de: "2026-01-01", ate: "2026-01-31" })
  })
})

describe("relatorio-periodo · intervalo", () => {
  it("faixaRange devolve end EXCLUSIVO (dia seguinte ao ate)", () => {
    const { start, end } = faixaRange({ de: "2026-06-01", ate: "2026-06-30" })
    expect(start).toEqual(new Date(2026, 5, 1))
    expect(end).toEqual(new Date(2026, 6, 1))
  })
  it("conta os dias inclusive nos dois extremos", () => {
    expect(diasNaFaixa({ de: "2026-06-01", ate: "2026-06-30" })).toBe(30)
    expect(diasNaFaixa({ de: "2026-06-10", ate: "2026-06-10" })).toBe(1)
    expect(diasNaFaixa({ de: "2026-01-01", ate: "2026-12-31" })).toBe(365)
  })
  it("naFaixa compara por string ISO (TZ-safe) e aceita timestamp completo", () => {
    const f = { de: "2026-06-01", ate: "2026-06-30" }
    expect(naFaixa("2026-06-30T23:59:00.000Z", f)).toBe(true)
    expect(naFaixa("2026-07-01", f)).toBe(false)
    expect(naFaixa(null, f)).toBe(false)
  })
})

describe("relatorio-periodo · alinhamento com o calendário", () => {
  it("reconhece mês, trimestre e ano completos", () => {
    expect(mesCompleto({ de: "2026-02-01", ate: "2026-02-28" })).toEqual({ ano: 2026, mi: 1 })
    expect(mesCompleto({ de: "2026-02-01", ate: "2026-02-27" })).toBeNull()
    expect(trimestreCompleto({ de: "2026-04-01", ate: "2026-06-30" })).toEqual({ ano: 2026, tri: 1 })
    expect(trimestreCompleto({ de: "2026-05-01", ate: "2026-07-31" })).toBeNull()
    expect(anoCompleto({ de: "2026-01-01", ate: "2026-12-31" })).toBe(2026)
    expect(anoCompleto({ de: "2026-01-01", ate: "2026-12-30" })).toBeNull()
  })
})

describe("relatorio-periodo · presets", () => {
  it("resolve cada preset na faixa certa", () => {
    expect(presetFaixa("mes", NOW)).toEqual({ de: "2026-06-01", ate: "2026-06-30" })
    expect(presetFaixa("mes-anterior", NOW)).toEqual({ de: "2026-05-01", ate: "2026-05-31" })
    expect(presetFaixa("trimestre", NOW)).toEqual({ de: "2026-04-01", ate: "2026-06-30" })
    expect(presetFaixa("ytd", NOW)).toEqual({ de: "2026-01-01", ate: "2026-06-15" })
    expect(presetFaixa("ano", NOW)).toEqual({ de: "2026-01-01", ate: "2026-12-31" })
    expect(presetFaixa("ultimos-12", NOW)).toEqual({ de: "2025-07-01", ate: "2026-06-30" })
  })
  it("mês anterior cruza o ano corretamente", () => {
    expect(presetFaixa("mes-anterior", new Date(2026, 0, 10))).toEqual({ de: "2025-12-01", ate: "2025-12-31" })
  })
  it("detecta qual preset a faixa representa", () => {
    expect(detectPreset({ de: "2026-06-01", ate: "2026-06-30" }, NOW)).toBe("mes")
    expect(detectPreset({ de: "2026-04-01", ate: "2026-06-30" }, NOW)).toBe("trimestre")
    expect(detectPreset({ de: "2026-06-03", ate: "2026-06-09" }, NOW)).toBe("custom")
  })
})

describe("relatorio-periodo · shiftFaixa", () => {
  it("mês alinhado anda em meses, com clamp de fim de mês", () => {
    expect(shiftFaixa({ de: "2026-01-01", ate: "2026-01-31" }, 1)).toEqual({ de: "2026-02-01", ate: "2026-02-28" })
    expect(shiftFaixa({ de: "2026-03-01", ate: "2026-03-31" }, -1)).toEqual({ de: "2026-02-01", ate: "2026-02-28" })
    expect(shiftFaixa({ de: "2026-01-01", ate: "2026-01-31" }, -1)).toEqual({ de: "2025-12-01", ate: "2025-12-31" })
  })
  it("trimestre e ano alinhados preservam o alinhamento", () => {
    expect(shiftFaixa({ de: "2026-04-01", ate: "2026-06-30" }, 1)).toEqual({ de: "2026-07-01", ate: "2026-09-30" })
    expect(shiftFaixa({ de: "2026-01-01", ate: "2026-12-31" }, -1)).toEqual({ de: "2025-01-01", ate: "2025-12-31" })
  })
  it("faixa arbitrária anda pelo próprio comprimento", () => {
    // 7 dias → o anterior são os 7 dias imediatamente antes.
    expect(shiftFaixa({ de: "2026-06-08", ate: "2026-06-14" }, -1)).toEqual({ de: "2026-06-01", ate: "2026-06-07" })
    expect(shiftFaixa({ de: "2026-06-08", ate: "2026-06-14" }, 1)).toEqual({ de: "2026-06-15", ate: "2026-06-21" })
  })
  it("faixaAnterior é o deslocamento de −1", () => {
    expect(faixaAnterior({ de: "2026-06-01", ate: "2026-06-30" })).toEqual({ de: "2026-05-01", ate: "2026-05-31" })
  })
})

describe("relatorio-periodo · rótulos", () => {
  it("nomeia mês, trimestre, ano e período livre", () => {
    expect(faixaLabel({ de: "2026-06-01", ate: "2026-06-30" }).titulo).toBe("Junho de 2026")
    expect(faixaLabel({ de: "2026-07-01", ate: "2026-09-30" }).titulo).toBe("3º trimestre de 2026")
    expect(faixaLabel({ de: "2026-01-01", ate: "2026-12-31" }).titulo).toBe("Ano de 2026")
    expect(faixaLabel({ de: "2026-01-05", ate: "2026-03-10" }).titulo).toBe("Período personalizado")
  })
  it("o subtítulo traz sempre as datas e o nº de dias", () => {
    expect(faixaLabel({ de: "2026-06-01", ate: "2026-06-30" }).sub).toBe("01/06/2026 a 30/06/2026 · 30 dias")
    expect(faixaLabel({ de: "2026-06-01", ate: "2026-06-01" }).sub).toBe("01/06/2026 a 01/06/2026 · 1 dia")
  })
  it("slug curto para nome de arquivo", () => {
    expect(faixaSlug({ de: "2026-06-01", ate: "2026-06-30" })).toBe("2026-06")
    expect(faixaSlug({ de: "2026-01-01", ate: "2026-12-31" })).toBe("2026")
    expect(faixaSlug({ de: "2026-01-05", ate: "2026-03-10" })).toBe("2026-01-05_2026-03-10")
  })
})

describe("relatorio-periodo · meses cobertos", () => {
  it("lista os meses tocados, cruzando o ano", () => {
    expect(mesesDaFaixa({ de: "2026-06-15", ate: "2026-06-20" })).toEqual(["2026-06"])
    expect(mesesDaFaixa({ de: "2025-11-20", ate: "2026-02-03" })).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"])
  })
  it("mesesNaFaixa é inteiro em período fechado e fracionário em período livre", () => {
    expect(mesesNaFaixa({ de: "2026-06-01", ate: "2026-06-30" })).toBeCloseTo(1, 6)
    expect(mesesNaFaixa({ de: "2026-01-01", ate: "2026-03-31" })).toBeCloseTo(3, 6)
    expect(mesesNaFaixa({ de: "2026-01-01", ate: "2026-12-31" })).toBeCloseTo(12, 6)
    // 16 dias de junho (de 30) + 14 de julho (de 31)
    expect(mesesNaFaixa({ de: "2026-06-15", ate: "2026-07-14" })).toBeCloseTo(16 / 30 + 14 / 31, 6)
  })
})
