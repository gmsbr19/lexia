import { describe, expect, it } from "vitest"
import { sortRows } from "@/components/ui/datagrid/sort-logic"
import type { GridColumn } from "@/components/ui/datagrid/types"

interface Row { id: number; nome: string; valor: number | null }
const rows: Row[] = [
  { id: 1, nome: "Carlos", valor: 300 },
  { id: 2, nome: "Ana", valor: null },
  { id: 3, nome: "Bruno", valor: 100 },
]
const columns: GridColumn<Row>[] = [
  { key: "nome", label: "Nome", type: "text", accessor: (r) => r.nome },
  { key: "valor", label: "Valor", type: "money", accessor: (r) => r.valor },
]

describe("sortRows", () => {
  it("returns the same array reference (no-op) when sort is null", () => {
    expect(sortRows(rows, null, columns)).toBe(rows)
  })

  it("sorts text asc/desc via pt-BR collation", () => {
    expect(sortRows(rows, { key: "nome", dir: "asc" }, columns).map((r) => r.id)).toEqual([2, 3, 1])
    expect(sortRows(rows, { key: "nome", dir: "desc" }, columns).map((r) => r.id)).toEqual([1, 3, 2])
  })

  it("sorts numbers and pushes nulls last regardless of direction", () => {
    expect(sortRows(rows, { key: "valor", dir: "asc" }, columns).map((r) => r.id)).toEqual([3, 1, 2])
    expect(sortRows(rows, { key: "valor", dir: "desc" }, columns).map((r) => r.id)).toEqual([1, 3, 2])
  })

  it("does not mutate the input array", () => {
    const copy = [...rows]
    sortRows(rows, { key: "nome", dir: "asc" }, columns)
    expect(rows).toEqual(copy)
  })

  it("is a no-op when the sort key doesn't match any column", () => {
    const result = sortRows(rows, { key: "inexistente", dir: "asc" }, columns)
    expect(result.map((r) => r.id)).toEqual([1, 2, 3])
  })
})
