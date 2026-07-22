import { describe, expect, it } from "vitest"
import { groupContratosByMonth } from "@/lib/finance/contrato-group"
import type { ContratoRow } from "@/lib/finance/types"

const row = (over: Partial<ContratoRow> = {}): ContratoRow => ({
  id: 1,
  titulo: "Contrato",
  cliente: "Cliente X",
  clienteId: 1,
  area: null,
  origem: null,
  tipo: null,
  statusCaso: null,
  dataFechamento: "2026-07-08T12:00:00.000Z",
  valorContratadoCents: 0,
  recebidoCents: 0,
  honorariosCount: 0,
  casosCount: 1,
  unicoCasoId: 1,
  ...over,
})

describe("groupContratosByMonth", () => {
  it("groups by YYYY-MM, most recent month first", () => {
    const groups = groupContratosByMonth([
      row({ id: 1, dataFechamento: "2026-05-01T12:00:00.000Z" }),
      row({ id: 2, dataFechamento: "2026-07-08T12:00:00.000Z" }),
      row({ id: 3, dataFechamento: "2026-07-20T12:00:00.000Z" }),
      row({ id: 4, dataFechamento: "2026-06-15T12:00:00.000Z" }),
    ])
    expect(groups.map((g) => g.key)).toEqual(["2026-07", "2026-06", "2026-05"])
    expect(groups[0].label).toBe("julho de 2026")
    expect(groups[0].rows.map((r) => r.id)).toEqual([2, 3])
  })

  it("preserves the input order within a month (caller's own sort)", () => {
    const groups = groupContratosByMonth([
      row({ id: 3, dataFechamento: "2026-07-01T12:00:00.000Z" }),
      row({ id: 1, dataFechamento: "2026-07-15T12:00:00.000Z" }),
      row({ id: 2, dataFechamento: "2026-07-10T12:00:00.000Z" }),
    ])
    expect(groups[0].rows.map((r) => r.id)).toEqual([3, 1, 2])
  })

  it("sinks contratos with no dataFechamento into a trailing 'Sem data' bucket", () => {
    const groups = groupContratosByMonth([
      row({ id: 1, dataFechamento: "2026-07-01T12:00:00.000Z" }),
      row({ id: 2, dataFechamento: null }),
    ])
    expect(groups.map((g) => g.key)).toEqual(["2026-07", "sem-data"])
    expect(groups[1].label).toBe("Sem data")
    expect(groups[1].rows.map((r) => r.id)).toEqual([2])
  })

  it("empty input → empty groups", () => {
    expect(groupContratosByMonth([])).toEqual([])
  })
})
