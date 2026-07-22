// CSV export of the grid's CURRENT (post filter/sort/group) row order — PURE
// serialization + a small download side-effect. Generalizes cmLeadsCSV/
// cmDownload (src/components/comercial/cm-meta.ts). Neutralizes a leading
// =/+/-/@ (Excel/Sheets formula injection) — cmLeadsCSV's esc() does NOT do
// this today (only doubles quotes); this module is the fixed version.
import type { GridColumn } from "./types"

function escCsv(s: string): string {
  const guarded = /^[=+\-@]/.test(s) ? `'${s}` : s
  return `"${guarded.replace(/"/g, '""')}"`
}

function formatForCsv<T>(row: T, column: GridColumn<T>): string {
  const raw = column.accessor(row)
  if (raw == null || raw === "") return ""
  switch (column.type) {
    case "money":
      return (Number(raw) / 100).toFixed(2).replace(".", ",")
    case "select":
    case "user":
    case "relation": {
      const opt = column.options?.find((o) => o.value === String(raw))
      return opt?.label ?? String(raw)
    }
    default:
      return String(raw)
  }
}

export function rowsToCsv<T>(rows: T[], columns: GridColumn<T>[]): string {
  const head = columns.map((c) => escCsv(c.label))
  const body = rows.map((row) => columns.map((c) => escCsv(formatForCsv(row, c))))
  return [head, ...body].map((cells) => cells.join(";")).join("\r\n")
}

/** BOM-prefixed download so Excel opens the file as UTF-8 (matches the
 *  existing cmDownload/exportCSV convention app-wide). */
export function downloadCsv(filename: string, text: string): void {
  const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
