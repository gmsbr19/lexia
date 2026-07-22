import { describe, expect, it } from "vitest"
import { evalFilters } from "@/components/ui/datagrid/filter-logic"
import type { FilterState, GridColumn } from "@/components/ui/datagrid/types"

interface Row { id: number; nome: string; etapa: string; valor: number | null; data: string | null }
const rows: Row[] = [
  { id: 1, nome: "João Silva", etapa: "novo", valor: 1000, data: "2026-06-01" },
  { id: 2, nome: "Maria Souza", etapa: "contato", valor: 2000, data: "2026-06-10" },
  { id: 3, nome: "Pedro Costa", etapa: "novo", valor: null, data: null },
]
const columns: GridColumn<Row>[] = [
  { key: "nome", label: "Nome", type: "text", accessor: (r) => r.nome },
  { key: "etapa", label: "Etapa", type: "select", accessor: (r) => r.etapa },
  { key: "valor", label: "Valor", type: "money", accessor: (r) => r.valor },
  { key: "data", label: "Data", type: "date", accessor: (r) => r.data },
]

const filterRows = (rowsIn: Row[], state: FilterState) => rowsIn.filter((r) => evalFilters(r, state, columns))

describe("evalFilters", () => {
  it("passes everything when there are no rules", () => {
    expect(filterRows(rows, { combinator: "AND", rules: [] })).toHaveLength(3)
  })

  it("text contains is accent/case-insensitive", () => {
    const state: FilterState = { combinator: "AND", rules: [{ id: "1", columnKey: "nome", operator: "contains", value: "joao" }] }
    expect(filterRows(rows, state).map((r) => r.id)).toEqual([1])
  })

  it("select 'in' matches any of the chosen values", () => {
    const state: FilterState = { combinator: "AND", rules: [{ id: "1", columnKey: "etapa", operator: "in", value: ["novo"] }] }
    expect(filterRows(rows, state).map((r) => r.id)).toEqual([1, 3])
  })

  it("an unconfigured 'in' rule (nothing picked yet) passes everything instead of zeroing out the grid", () => {
    const state: FilterState = { combinator: "AND", rules: [{ id: "1", columnKey: "etapa", operator: "in", value: [] }] }
    expect(filterRows(rows, state)).toHaveLength(3)
    const noValueYet: FilterState = { combinator: "AND", rules: [{ id: "1", columnKey: "etapa", operator: "in", value: null }] }
    expect(filterRows(rows, noValueYet)).toHaveLength(3)
  })

  it("number gte/lte and money comparisons", () => {
    const gte: FilterState = { combinator: "AND", rules: [{ id: "1", columnKey: "valor", operator: "gte", value: 2000 }] }
    expect(filterRows(rows, gte).map((r) => r.id)).toEqual([2])
  })

  it("isEmpty / isNotEmpty treat null and missing dates as empty", () => {
    const empty: FilterState = { combinator: "AND", rules: [{ id: "1", columnKey: "valor", operator: "isEmpty", value: null }] }
    expect(filterRows(rows, empty).map((r) => r.id)).toEqual([3])
    const notEmpty: FilterState = { combinator: "AND", rules: [{ id: "1", columnKey: "data", operator: "isNotEmpty", value: null }] }
    expect(filterRows(rows, notEmpty).map((r) => r.id)).toEqual([1, 2])
  })

  it("date between is inclusive", () => {
    const state: FilterState = {
      combinator: "AND",
      rules: [{ id: "1", columnKey: "data", operator: "between", value: ["2026-06-01", "2026-06-05"] }],
    }
    expect(filterRows(rows, state).map((r) => r.id)).toEqual([1])
  })

  it("AND requires every rule; OR requires any", () => {
    const and: FilterState = {
      combinator: "AND",
      rules: [
        { id: "1", columnKey: "etapa", operator: "eq", value: "novo" },
        { id: "2", columnKey: "valor", operator: "gte", value: 1000 },
      ],
    }
    expect(filterRows(rows, and).map((r) => r.id)).toEqual([1]) // #3 fails because valor is null

    const or: FilterState = {
      combinator: "OR",
      rules: [
        { id: "1", columnKey: "etapa", operator: "eq", value: "contato" },
        { id: "2", columnKey: "valor", operator: "isEmpty", value: null },
      ],
    }
    expect(filterRows(rows, or).map((r) => r.id)).toEqual([2, 3])
  })

  it("a rule referencing a column that no longer exists never hides a row", () => {
    const state: FilterState = { combinator: "AND", rules: [{ id: "1", columnKey: "removida", operator: "eq", value: "x" }] }
    expect(filterRows(rows, state)).toHaveLength(3)
  })
})
