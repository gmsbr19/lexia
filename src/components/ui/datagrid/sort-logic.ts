// Single-column sort comparator — PURE. Nulls sort last regardless of
// direction (matches the existing convention in CrmContratosPage's
// `(a.dataFechamento ?? "")` fallback-to-empty-string idiom).
import type { GridColumn, SortState } from "./types"

function toSortable(v: unknown): { isNull: boolean; num: number; str: string } {
  if (v == null || v === "") return { isNull: true, num: 0, str: "" }
  if (typeof v === "number") return { isNull: false, num: v, str: String(v) }
  if (typeof v === "string") {
    const d = Date.parse(v)
    return { isNull: false, num: Number.isNaN(d) ? NaN : d, str: v }
  }
  return { isNull: true, num: 0, str: "" }
}

export function compareByColumn<T>(a: T, b: T, sort: SortState, columns: GridColumn<T>[]): number {
  const column = columns.find((c) => c.key === sort.key)
  if (!column) return 0
  const dir = sort.dir === "asc" ? 1 : -1
  const va = toSortable(column.accessor(a))
  const vb = toSortable(column.accessor(b))
  if (va.isNull && vb.isNull) return 0
  if (va.isNull) return 1 // nulls last regardless of direction
  if (vb.isNull) return -1
  const cmp = !Number.isNaN(va.num) && !Number.isNaN(vb.num) ? va.num - vb.num : va.str.localeCompare(vb.str, "pt-BR")
  return cmp * dir
}

export function sortRows<T>(rows: T[], sort: SortState | null, columns: GridColumn<T>[]): T[] {
  if (!sort) return rows
  return [...rows].sort((a, b) => compareByColumn(a, b, sort, columns))
}
