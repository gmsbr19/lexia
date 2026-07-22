// Generic "Notion-style" data grid — types. CLIENT-SAFE, no I/O. The grid owns
// sort/filter/group/selection/edit-popover UI state; the caller owns the
// actual network calls (onCellCommit/onBulkApply/onBulkDelete never touch
// apiSend directly — see src/lib/client/useOptimisticRows.ts for the piece
// that does). Fase 2 of the Comercial→CRM plan; consumed by both
// Oportunidades (Comercial) and Contatos — see CLAUDE.md §11.
import type { ReactNode } from "react"

export type ColumnType = "text" | "number" | "money" | "date" | "select" | "user" | "relation"

export interface ColumnOption {
  value: string
  label: string
  color?: string | null
}

export interface GridColumn<T> {
  key: string
  label: string
  type: ColumnType
  accessor: (row: T) => unknown
  render?: (row: T) => ReactNode
  align?: "left" | "right"
  width?: number | string
  /** Default true. */
  sortable?: boolean
  /** Default true. */
  filterable?: boolean
  /** Default false — group-by only offers columns that opt in. */
  groupable?: boolean
  /** Default false. A function lets a column be conditionally read-only per
   *  row (e.g. etapa can't be inline-edited once a lead is ganho/perdido). */
  editable?: boolean | ((row: T) => boolean)
  /** select/user/relation: choices for both the filter builder and the cell editor. */
  options?: ColumnOption[]
  /** select/user/relation: richer rendering of an option (e.g. avatar +
   *  initials for user columns) — used in both the cell display and the
   *  picker dropdown. Falls back to dot + label. */
  optionRender?: (option: ColumnOption) => ReactNode
  /** Overrides accessor-as-group-key when the group header needs a richer
   *  shape (dot/avatar) than a bare string — mirrors Tarefas' GroupHeader. */
  groupValue?: (row: T) => { key: string; label: string; dot?: string | null }
}

export type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "notContains"
  | "isEmpty"
  | "isNotEmpty"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"

export interface FilterRule {
  id: string
  columnKey: string
  operator: FilterOperator
  value: unknown
}

export interface FilterState {
  combinator: "AND" | "OR"
  rules: FilterRule[]
}

export const EMPTY_FILTER: FilterState = { combinator: "AND", rules: [] }

export interface SortState {
  key: string
  dir: "asc" | "desc"
}

export interface GridViewState {
  visibleColumns: string[] | null
  filters: FilterState
  sort: SortState | null
  groupBy: string | null
}

export interface GridGroup<T> {
  key: string
  header: { dot?: string | null; label: string }
  items: T[]
}

export interface BulkFieldConfig {
  field: string
  label: string
  icon: string
  render: (apply: (value: unknown) => void, close: () => void) => ReactNode
}

export interface DataGridProps<T> {
  gridId: "oportunidades" | "contatos"
  rows: T[]
  getId: (row: T) => number
  columns: GridColumn<T>[]
  onCellCommit?: (row: T, columnKey: string, value: unknown) => void
  bulkFields?: BulkFieldConfig[]
  onBulkApply?: (ids: number[], field: string, value: unknown) => void
  onBulkDelete?: (ids: number[]) => void
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => ReactNode
  searchAccessor?: (row: T) => string
  toolbarExtra?: ReactNode
  csvFilename: () => string
  emptyState?: { title: string; desc?: string }
  savedView?: { initial: GridViewState | null; onChange: (v: GridViewState) => void }
}
