import { describe, expect, it } from "vitest"
import { groupRows } from "@/components/ui/datagrid/group-logic"
import type { GridColumn } from "@/components/ui/datagrid/types"

interface Row { id: number; etapa: string | null }
const rows: Row[] = [
  { id: 1, etapa: "proposta" },
  { id: 2, etapa: "novo" },
  { id: 3, etapa: "novo" },
  { id: 4, etapa: null },
]
const columns: GridColumn<Row>[] = [
  {
    key: "etapa",
    label: "Etapa",
    type: "select",
    accessor: (r) => r.etapa,
    groupable: true,
    options: [
      { value: "novo", label: "Novo", color: "#7C8AA5" },
      { value: "contato", label: "Contato", color: "#4A78C0" },
      { value: "proposta", label: "Proposta", color: "#9A6FB0" },
    ],
  },
]

describe("groupRows", () => {
  it("returns null when groupBy is null", () => {
    expect(groupRows(rows, null, columns)).toBeNull()
  })

  it("returns null for a non-groupable or unknown column", () => {
    const notGroupable: GridColumn<Row>[] = [{ key: "etapa", label: "Etapa", type: "select", accessor: (r) => r.etapa }]
    expect(groupRows(rows, "etapa", notGroupable)).toBeNull()
    expect(groupRows(rows, "inexistente", columns)).toBeNull()
  })

  it("groups by value, follows column.options order, and pushes 'Sem valor' last", () => {
    const groups = groupRows(rows, "etapa", columns)
    expect(groups?.map((g) => g.header.label)).toEqual(["Novo", "Proposta", "Sem valor"])
    expect(groups?.map((g) => g.items.length)).toEqual([2, 1, 1])
    expect(groups?.[0].header.dot).toBe("#7C8AA5")
  })

  it("every row appears in exactly one group", () => {
    const groups = groupRows(rows, "etapa", columns)!
    const allIds = groups.flatMap((g) => g.items.map((r) => r.id)).sort()
    expect(allIds).toEqual([1, 2, 3, 4])
  })
})
