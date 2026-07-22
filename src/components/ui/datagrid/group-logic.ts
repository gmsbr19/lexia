// Collapsible group-by — PURE. Generalizes the Group[]/GroupHeader shape from
// Tarefas' ListaView (src/components/tarefas/views.tsx). Caller order is
// filter → group → sort-within-group (see DataGrid.tsx) so group counts
// reflect the active filter.
import type { GridColumn, GridGroup } from "./types"

const EMPTY_KEY = "__vazio__"
const EMPTY_LABEL = "Sem valor"

export function groupRows<T>(rows: T[], groupBy: string | null, columns: GridColumn<T>[]): GridGroup<T>[] | null {
  if (!groupBy) return null
  const column = columns.find((c) => c.key === groupBy && c.groupable)
  if (!column) return null

  const byKey = new Map<string, GridGroup<T>>()
  for (const row of rows) {
    const derived = column.groupValue?.(row)
    const raw = derived?.key ?? column.accessor(row)
    const key = raw == null || raw === "" ? EMPTY_KEY : String(raw)
    const label = derived?.label ?? (key === EMPTY_KEY ? EMPTY_LABEL : optionLabel(column, key) ?? key)
    const dot = derived?.dot ?? optionColor(column, key) ?? null
    const group = byKey.get(key) ?? { key, header: { dot, label }, items: [] }
    group.items.push(row)
    byKey.set(key, group)
  }

  // Order: follow column.options (e.g. configured pipeline order) when given,
  // else first-appearance order — "Sem valor" always last either way.
  const ordered: GridGroup<T>[] = []
  if (column.options?.length) {
    for (const opt of column.options) {
      const g = byKey.get(opt.value)
      if (g) { ordered.push(g); byKey.delete(opt.value) }
    }
  }
  const empty = byKey.get(EMPTY_KEY)
  byKey.delete(EMPTY_KEY)
  ordered.push(...byKey.values())
  if (empty) ordered.push(empty)
  return ordered
}

function optionLabel<T>(column: GridColumn<T>, key: string): string | null {
  return column.options?.find((o) => o.value === key)?.label ?? null
}
function optionColor<T>(column: GridColumn<T>, key: string): string | null {
  return column.options?.find((o) => o.value === key)?.color ?? null
}
