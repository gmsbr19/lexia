"use client"

// Generic "Notion-style" data grid — the composition root. Owns sort/filter/
// group/selection/edit-popover state; the caller owns network I/O (see
// CLAUDE.md §11 Fase 2 for the full design rationale). No pagination — this
// app's established convention is "load everything, filter client-side"
// (~253 clientes / low-hundreds leads today); revisit if row counts reach
// the thousands (see src/lib/list.ts for the app's paginated-listing escape
// hatch, unused here on purpose).
import { Fragment, useEffect, useMemo, useState } from "react"
import { Menu, MenuItem } from "@/components/tarefas/tf-kit"
import { Icon } from "@/components/tarefas/tf-icons"
import * as c from "./datagrid.css"
import { FilterBuilder } from "./FilterBuilder"
import { BulkBar } from "./BulkBar"
import { DateCellEditor, MoneyCellEditor, NumberCellEditor, OptionCellEditor, TextCellEditor } from "./CellEditors"
import { evalFilters } from "./filter-logic"
import { sortRows } from "./sort-logic"
import { groupRows } from "./group-logic"
import { downloadCsv, rowsToCsv } from "./csv"
import { normalizar } from "@/lib/text"
import { EMPTY_FILTER, type DataGridProps, type FilterState, type GridColumn, type GridViewState, type SortState } from "./types"

function formatCentsBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function formatDateBR(iso: string): string {
  const d = iso.slice(0, 10).split("-")
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso
}

function defaultRender<T>(row: T, column: GridColumn<T>) {
  const v = column.accessor(row)
  if (v == null || v === "") return <span style={{ color: "var(--text-subtle)" }}>—</span>
  switch (column.type) {
    case "money":
      return <span style={{ fontFeatureSettings: '"tnum"' }}>{formatCentsBRL(v as number)}</span>
    case "date":
      return <span style={{ fontFeatureSettings: '"tnum"' }}>{formatDateBR(v as string)}</span>
    case "select":
    case "user":
    case "relation": {
      const opt = column.options?.find((o) => o.value === String(v))
      if (!opt) return String(v)
      if (column.optionRender) return column.optionRender(opt)
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {opt.color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />}
          {opt.label}
        </span>
      )
    }
    default:
      return String(v)
  }
}

function isEditable<T>(column: GridColumn<T>, row: T): boolean {
  return typeof column.editable === "function" ? column.editable(row) : !!column.editable
}

export function DataGrid<T>({
  gridId,
  rows,
  getId,
  columns,
  onCellCommit,
  bulkFields,
  onBulkApply,
  onBulkDelete,
  onRowClick,
  rowActions,
  searchAccessor,
  toolbarExtra,
  csvFilename,
  emptyState,
  savedView,
}: DataGridProps<T>) {
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<FilterState>(savedView?.initial?.filters ?? EMPTY_FILTER)
  const [sort, setSort] = useState<SortState | null>(savedView?.initial?.sort ?? null)
  const [groupBy, setGroupBy] = useState<string | null>(savedView?.initial?.groupBy ?? null)
  const [visibleColumns, setVisibleColumns] = useState<string[] | null>(savedView?.initial?.visibleColumns ?? null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<{ id: number; key: string } | null>(null)

  const onChangeRef = savedView?.onChange
  useEffect(() => {
    onChangeRef?.({ visibleColumns, filters, sort, groupBy })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns, filters, sort, groupBy])

  const shownColumns = useMemo(
    () => (visibleColumns ? columns.filter((col) => visibleColumns.includes(col.key)) : columns),
    [columns, visibleColumns],
  )

  const searched = useMemo(() => {
    const q = normalizar(search)
    if (!q) return rows
    return rows.filter((row) => {
      if (searchAccessor) return normalizar(searchAccessor(row)).includes(q)
      return columns
        .filter((col) => col.type === "text" || col.type === "select")
        .some((col) => normalizar(String(col.accessor(row) ?? "")).includes(q))
    })
  }, [rows, search, searchAccessor, columns])

  const filtered = useMemo(() => searched.filter((row) => evalFilters(row, filters, columns)), [searched, filters, columns])
  const grouped = useMemo(() => groupRows(filtered, groupBy, columns), [filtered, groupBy, columns])
  const flatSorted = useMemo(() => (grouped ? null : sortRows(filtered, sort, columns)), [grouped, filtered, sort, columns])

  const allIds = filtered.map(getId)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0 && !allSelected
  const anySelected = selected.size > 0
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds))
  const toggleOne = (id: number) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const colCount = shownColumns.length + 1 + (rowActions ? 1 : 0)

  const groupableColumns = columns.filter((col) => col.groupable)

  const exportCsv = () => {
    const exportRows = grouped ? grouped.flatMap((g) => sortRows(g.items, sort, columns)) : (flatSorted ?? filtered)
    downloadCsv(csvFilename(), rowsToCsv(exportRows, shownColumns))
  }

  const renderCell = (row: T, column: GridColumn<T>) => {
    const editableHere = isEditable(column, row)
    const id = getId(row)
    const commit = (value: unknown) => { onCellCommit?.(row, column.key, value); setEditing(null) }

    if (editableHere && (column.type === "select" || column.type === "user" || column.type === "relation")) {
      // Accessor values can be numbers (FK ids) while ColumnOption.value is
      // always a string — stringify so the current option is actually found.
      const raw = column.accessor(row)
      return <OptionCellEditor value={raw == null ? null : String(raw)} options={column.options ?? []} onCommit={(v) => onCellCommit?.(row, column.key, v)} renderOption={column.optionRender} />
    }

    const isEditingThis = editableHere && editing?.id === id && editing.key === column.key
    if (isEditingThis) {
      const value = column.accessor(row)
      const cancel = () => setEditing(null)
      if (column.type === "number") return <NumberCellEditor value={value as number | null} onCommit={commit} onCancel={cancel} />
      if (column.type === "money") return <MoneyCellEditor value={value as number | null} onCommit={commit} onCancel={cancel} />
      if (column.type === "date") return <DateCellEditor value={value as string | null} onCommit={commit} onCancel={cancel} />
      return <TextCellEditor value={String(value ?? "")} onCommit={commit} onCancel={cancel} />
    }

    const display = column.render ? column.render(row) : defaultRender(row, column)
    if (!editableHere) return display
    return (
      <span
        className={c.cellEditable}
        style={{ display: "inline-block", width: "100%", padding: "2px 4px", margin: "-2px -4px" }}
        onClick={(e) => { e.stopPropagation(); setEditing({ id, key: column.key }) }}
      >
        {display}
      </span>
    )
  }

  const renderRow = (row: T) => {
    const id = getId(row)
    const isSel = selected.has(id)
    return (
      <tr
        key={id}
        className={`${c.row} ${isSel ? c.rowSelected : ""} ${onRowClick ? c.rowClickable : ""}`}
        onClick={() => onRowClick?.(row)}
      >
        <td className={`${c.cell} ${c.cellTight}`} onClick={(e) => e.stopPropagation()}>
          <button className={`${c.check({ on: isSel })} ${c.selReveal({ shown: anySelected })}`} onClick={() => toggleOne(id)}>
            {isSel && <Icon name="check" size={11} />}
          </button>
        </td>
        {shownColumns.map((column) => (
          <td
            key={column.key}
            className={c.cell}
            // Cells never wrap (see datagrid.css `cell`); a column with a set
            // width truncates with ellipsis instead of stretching the row.
            style={{ textAlign: column.align === "right" ? "right" : "left", maxWidth: column.width, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {renderCell(row, column)}
          </td>
        ))}
        {rowActions && (
          <td className={c.cell} style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
            {rowActions(row)}
          </td>
        )}
      </tr>
    )
  }

  return (
    <div data-grid-id={gridId} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div className={c.toolbar}>
        <div className={c.toolbarLeft}>
          <div className={c.searchWrap}>
            <div className={c.searchIcon}>
              <Icon name="search" size={14} />
            </div>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ paddingLeft: 36, height: 34, fontSize: 13 }} />
          </div>
          <FilterBuilder columns={columns} state={filters} onChange={setFilters} />
          {groupableColumns.length > 0 && (
            <Menu
              align="left"
              width={200}
              trigger={
                <span className={c.facetBtn({ active: !!groupBy })}>
                  <Icon name="layoutGrid" size={13} />
                  {groupBy ? `Agrupado por ${columns.find((col) => col.key === groupBy)?.label ?? groupBy}` : "Agrupar"}
                </span>
              }
            >
              {(close) => (
                <>
                  <MenuItem label="Nenhum" active={!groupBy} onClick={() => { setGroupBy(null); close() }} />
                  {groupableColumns.map((col) => (
                    <MenuItem key={col.key} label={col.label} active={groupBy === col.key} onClick={() => { setGroupBy(col.key); close() }} />
                  ))}
                </>
              )}
            </Menu>
          )}
          <Menu
            align="left"
            width={200}
            trigger={
              <span className={c.facetBtn({ active: !!visibleColumns })}>
                <Icon name="sliders" size={13} />
                Colunas
              </span>
            }
          >
            {() =>
              columns.map((col) => {
                const on = !visibleColumns || visibleColumns.includes(col.key)
                return (
                  <button
                    key={col.key}
                    className={c.facetMenuItem}
                    onClick={() => {
                      const currentList = visibleColumns ?? columns.map((cc) => cc.key)
                      const next = currentList.includes(col.key) ? currentList.filter((k) => k !== col.key) : [...currentList, col.key]
                      setVisibleColumns(next.length === columns.length ? null : next)
                    }}
                  >
                    {col.label}
                    {on && (
                      <span className={c.facetCheck}>
                        <Icon name="check" size={13} />
                      </span>
                    )}
                  </button>
                )
              })
            }
          </Menu>
        </div>
        <div className={c.toolbarRight}>
          {toolbarExtra}
          <button className="btn btn-secondary" onClick={exportCsv} style={{ height: 34, fontSize: 12 }}>
            Exportar CSV
          </button>
        </div>
      </div>

      <div className={c.tableScroll}>
        <div className={c.tableCard}>
          <table className={c.table}>
            <thead>
              <tr className={c.theadRow}>
                <th className={`${c.th({})} ${c.cellTight}`}>
                  <button className={`${c.check({ on: allSelected })} ${c.selRevealHead({ shown: anySelected })}`} onClick={toggleAll}>
                    {allSelected && <Icon name="check" size={11} />}
                    {someSelected && <span className={c.checkDash} />}
                  </button>
                </th>
                {shownColumns.map((column) => {
                  const sortable = column.sortable !== false
                  const isSorted = sort?.key === column.key
                  return (
                    <th key={column.key} className={c.th({ align: column.align, sortable })} style={{ width: column.width }}>
                      {sortable ? (
                        <button
                          className={c.thBtn}
                          onClick={() => setSort(isSorted ? { key: column.key, dir: sort!.dir === "asc" ? "desc" : "asc" } : { key: column.key, dir: "desc" })}
                        >
                          {column.label}
                          {isSorted && <Icon name={sort!.dir === "asc" ? "chevronUp" : "chevronDown"} size={12} />}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  )
                })}
                {rowActions && <th className={c.th({})} />}
              </tr>
            </thead>
            <tbody>
              {grouped
                ? grouped.map((group) => (
                    <Fragment key={group.key}>
                      <tr className={c.groupHeaderRow}>
                        <td
                          colSpan={colCount}
                          className={c.groupHeaderCell}
                          onClick={() =>
                            setCollapsed((s) => {
                              const n = new Set(s)
                              if (n.has(group.key)) n.delete(group.key)
                              else n.add(group.key)
                              return n
                            })
                          }
                        >
                          <Icon name={collapsed.has(group.key) ? "chevronRight" : "chevronDown"} size={13} />
                          {group.header.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: group.header.dot, flexShrink: 0 }} />}
                          {group.header.label}
                          <span className={c.groupCount}>{group.items.length}</span>
                        </td>
                      </tr>
                      {!collapsed.has(group.key) && sortRows(group.items, sort, columns).map(renderRow)}
                    </Fragment>
                  ))
                : (flatSorted ?? filtered).map(renderRow)}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount} className={c.emptyRow}>
                    {emptyState?.title ?? "Nada encontrado"}
                    {emptyState?.desc && <div style={{ marginTop: 4, fontSize: 12 }}>{emptyState.desc}</div>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected.size > 0 && bulkFields && bulkFields.length > 0 && (
        <BulkBar
          count={selected.size}
          fields={bulkFields}
          onClear={() => setSelected(new Set())}
          onApply={(field, value) => { onBulkApply?.([...selected], field, value); setSelected(new Set()) }}
          onDelete={onBulkDelete ? () => { onBulkDelete([...selected]); setSelected(new Set()) } : undefined}
        />
      )}
    </div>
  )
}

export type { GridViewState }

/** Loading placeholder matching the grid's shell (toolbar + table card).
 *  Shown while the saved view / dataset is still resolving. */
export function GridSkeleton({ rows = 8, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div className={c.toolbar}>
        <div className={c.toolbarLeft}>
          <div className={c.skelBar} style={{ width: 220, height: 34, borderRadius: 10 }} />
          <div className={c.skelBar} style={{ width: 90, height: 34, borderRadius: 10 }} />
          <div className={c.skelBar} style={{ width: 90, height: 34, borderRadius: 10 }} />
        </div>
        <div className={c.toolbarRight}>
          <div className={c.skelBar} style={{ width: 110, height: 34, borderRadius: 10 }} />
        </div>
      </div>
      <div className={c.tableScroll}>
        <div className={c.tableCard}>
          <table className={c.table}>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className={c.row}>
                  {Array.from({ length: cols }).map((_, i) => (
                    <td key={i} className={c.cell}>
                      <div className={c.skelBar} style={{ width: i === 0 ? "70%" : `${45 + ((r + i) % 4) * 12}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
