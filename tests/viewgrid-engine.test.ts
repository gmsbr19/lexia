import { describe, expect, it } from "vitest"
import { vgFmtDate, vgToCSV } from "@/components/ui/viewgrid/vg-engine"
import type { VgColumn, VgRow, VgSchema } from "@/components/ui/viewgrid/vg-types"

const HOJE = "2026-08-25"

describe("vgFmtDate", () => {
  it("formats a plain 'YYYY-MM-DD'", () => {
    expect(vgFmtDate("2026-08-25", HOJE)).toBe("hoje")
    expect(vgFmtDate("2026-08-26", HOJE)).toBe("amanhã")
    expect(vgFmtDate("2026-01-10", HOJE)).toBe("10/01/26")
  })

  // regressão: a fila da Captação entrega um ISO COMPLETO (Date.toISOString) —
  // a concatenação crua com "T12:00:00" produzia Invalid Date na tela.
  it("accepts a full ISO timestamp without producing Invalid Date", () => {
    expect(vgFmtDate("2026-08-25T12:00:00.000Z", HOJE)).toBe("hoje")
    expect(vgFmtDate("2026-01-10T03:04:05.000Z", HOJE)).toBe("10/01/26")
  })

  it("returns the em-dash for empty or unparseable input", () => {
    expect(vgFmtDate(null, HOJE)).toBe("—")
    expect(vgFmtDate("", HOJE)).toBe("—")
    expect(vgFmtDate("qualquer coisa", HOJE)).toBe("—")
  })
})

const schema = (cols: VgColumn[]): VgSchema => ({
  id: "t", label: "T", primaryLabel: "Linha", cols,
  enums: {}, enumOrder: {}, people: [], peopleMap: {}, today: HOJE,
})

describe("vgToCSV", () => {
  it("exports the raw row value when the column declares csvKey", () => {
    const cols: VgColumn[] = [
      { key: "lead", label: "Lead", type: "text", w: 100 },
      { key: "temGclid", label: "gclid", type: "enum", enum: "g", w: 90, csvKey: "gclid" },
    ]
    const rows: VgRow[] = [
      { id: 1, lead: "Ana", temGclid: "Sim", gclid: "Cj0KCQ_abc123" },
      { id: 2, lead: "Bruno", temGclid: "Não", gclid: "" },
    ]
    const linhas = vgToCSV(rows, cols, schema(cols)).split("\n")
    expect(linhas[0]).toBe('"Lead";"gclid"')
    expect(linhas[1]).toBe('"Ana";"Cj0KCQ_abc123"')
    expect(linhas[2]).toBe('"Bruno";""')
  })

  it("keeps the on-screen value when csvKey is absent", () => {
    const cols: VgColumn[] = [{ key: "temGclid", label: "gclid", type: "enum", enum: "g", w: 90 }]
    const rows: VgRow[] = [{ id: 1, temGclid: "Sim", gclid: "abc" }]
    expect(vgToCSV(rows, cols, schema(cols)).split("\n")[1]).toBe('"Sim"')
  })

  it("still neutralizes formula injection in a csvKey value", () => {
    const cols: VgColumn[] = [{ key: "x", label: "X", type: "text", w: 90, csvKey: "raw" }]
    const rows: VgRow[] = [{ id: 1, x: "ok", raw: "=1+1" }]
    expect(vgToCSV(rows, cols, schema(cols)).split("\n")[1]).toBe(`"'=1+1"`)
  })
})
