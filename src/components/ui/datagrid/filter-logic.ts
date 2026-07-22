// Column filter builder — PURE evaluation logic (no React, no I/O). A single
// top-level AND/OR combinator across all active rules (no nested groups) —
// covers "múltiplos filtros combinados (E/OU)" without a boolean-expression
// editor nobody asked for. See src/components/ui/datagrid/types.ts.
import { normalizar } from "@/lib/text"
import type { FilterRule, FilterState, GridColumn } from "./types"

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === "string") return v.trim() === ""
  if (Array.isArray(v)) return v.length === 0
  return false
}

function toComparable(v: unknown): number {
  if (v == null) return NaN
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const d = Date.parse(v)
    if (!Number.isNaN(d)) return d
    const n = Number(v)
    return Number.isNaN(n) ? NaN : n
  }
  return NaN
}

function evalRule<T>(row: T, rule: FilterRule, column: GridColumn<T> | undefined): boolean {
  if (!column) return true // unknown/removed column — never hide a row because of a stale rule
  const raw = column.accessor(row)

  switch (rule.operator) {
    case "isEmpty":
      return isEmptyValue(raw)
    case "isNotEmpty":
      return !isEmptyValue(raw)
    case "eq":
      return String(raw ?? "") === String(rule.value ?? "")
    case "neq":
      return String(raw ?? "") !== String(rule.value ?? "")
    case "contains":
      return normalizar(String(raw ?? "")).includes(normalizar(String(rule.value ?? "")))
    case "notContains":
      return !normalizar(String(raw ?? "")).includes(normalizar(String(rule.value ?? "")))
    case "in": {
      const set = Array.isArray(rule.value) ? (rule.value as unknown[]).map((v) => String(v)) : []
      // An "in" rule with nothing picked yet is UNCONFIGURED, not "match
      // nothing" — a freshly-added filter row shouldn't zero out the whole
      // grid before the user has selected an option.
      if (set.length === 0) return true
      return set.includes(String(raw ?? ""))
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = toComparable(raw)
      const b = toComparable(rule.value)
      if (Number.isNaN(a) || Number.isNaN(b)) return false
      if (rule.operator === "gt") return a > b
      if (rule.operator === "gte") return a >= b
      if (rule.operator === "lt") return a < b
      return a <= b
    }
    case "between": {
      const [lo, hi] = Array.isArray(rule.value) ? (rule.value as [unknown, unknown]) : [null, null]
      const a = toComparable(raw)
      const loN = toComparable(lo)
      const hiN = toComparable(hi)
      if (Number.isNaN(a)) return false
      if (!Number.isNaN(loN) && a < loN) return false
      if (!Number.isNaN(hiN) && a > hiN) return false
      return true
    }
    default:
      return true
  }
}

export function evalFilters<T>(row: T, state: FilterState, columns: GridColumn<T>[]): boolean {
  if (!state.rules.length) return true
  const results = state.rules.map((rule) => evalRule(row, rule, columns.find((c) => c.key === rule.columnKey)))
  return state.combinator === "OR" ? results.some(Boolean) : results.every(Boolean)
}

/** Operator set offered by the filter-builder UI, per column type. */
export const OPERATORS_BY_TYPE: Record<string, { value: FilterRule["operator"]; label: string }[]> = {
  text: [
    { value: "contains", label: "contém" },
    { value: "notContains", label: "não contém" },
    { value: "eq", label: "é" },
    { value: "isEmpty", label: "está vazio" },
    { value: "isNotEmpty", label: "não está vazio" },
  ],
  select: [
    { value: "in", label: "é qualquer de" },
    { value: "eq", label: "é" },
    { value: "isEmpty", label: "está vazio" },
    { value: "isNotEmpty", label: "não está vazio" },
  ],
  user: [
    { value: "in", label: "é qualquer de" },
    { value: "isEmpty", label: "está vazio" },
    { value: "isNotEmpty", label: "não está vazio" },
  ],
  relation: [
    { value: "in", label: "é qualquer de" },
    { value: "isEmpty", label: "está vazio" },
    { value: "isNotEmpty", label: "não está vazio" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "between", label: "entre" },
  ],
  money: [
    { value: "eq", label: "=" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "between", label: "entre" },
  ],
  date: [
    { value: "eq", label: "é" },
    { value: "gt", label: "depois de" },
    { value: "lt", label: "antes de" },
    { value: "between", label: "entre" },
    { value: "isEmpty", label: "está vazio" },
    { value: "isNotEmpty", label: "não está vazio" },
  ],
}
