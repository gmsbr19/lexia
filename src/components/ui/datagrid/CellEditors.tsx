"use client"

// Inline cell editors for DataGrid. Two families (see CLAUDE.md §11 Fase 2):
// text/number/money/date via input-swap (commit on blur/Enter, cancel on
// Escape); select/user/relation via a Menu-based popover (pick → immediate
// commit). Neither family calls the network directly — DataGrid wires
// onCommit to the caller's commit/liveEdit choice.
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Menu, MenuItem } from "@/components/tarefas/tf-kit"
import * as c from "./datagrid.css"
import type { ColumnOption } from "./types"

export function parseMoneyToCents(raw: string): number {
  const n = Number(raw.replace(/[^\d,.-]/g, "").replace(",", "."))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

function TextLikeEditor({
  initial,
  autoFocusSelect = true,
  onCommit,
  onCancel,
  toValue,
}: {
  initial: string
  autoFocusSelect?: boolean
  onCommit: (value: unknown) => void
  onCancel: () => void
  toValue: (raw: string) => unknown
}) {
  const [draft, setDraft] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    if (autoFocusSelect) ref.current?.select()
  }, [autoFocusSelect])
  const commit = () => onCommit(toValue(draft))
  return (
    <input
      ref={ref}
      className={c.input}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit() }
        else if (e.key === "Escape") { e.preventDefault(); onCancel() }
      }}
    />
  )
}

export function TextCellEditor(props: { value: string; onCommit: (v: unknown) => void; onCancel: () => void }) {
  return <TextLikeEditor initial={props.value} onCommit={props.onCommit} onCancel={props.onCancel} toValue={(s) => s} />
}

export function NumberCellEditor(props: { value: number | null; onCommit: (v: unknown) => void; onCancel: () => void }) {
  return (
    <TextLikeEditor
      initial={props.value == null ? "" : String(props.value)}
      onCommit={props.onCommit}
      onCancel={props.onCancel}
      toValue={(s) => (s.trim() === "" ? null : Number(s.replace(",", ".")))}
    />
  )
}

export function MoneyCellEditor(props: { value: number | null; onCommit: (v: unknown) => void; onCancel: () => void }) {
  return (
    <TextLikeEditor
      initial={props.value == null ? "" : (props.value / 100).toFixed(2).replace(".", ",")}
      onCommit={props.onCommit}
      onCancel={props.onCancel}
      toValue={(s) => (s.trim() === "" ? null : parseMoneyToCents(s))}
    />
  )
}

export function DateCellEditor(props: { value: string | null; onCommit: (v: unknown) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <input
      ref={ref}
      type="date"
      className={c.input}
      defaultValue={props.value ?? ""}
      onChange={(e) => props.onCommit(e.target.value || null)}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); props.onCancel() } }}
    />
  )
}

/** Shared editor for select/user/relation columns — a Menu-triggered picker.
 *  Rendered already-open (DataGrid mounts it in response to a cell click). */
export function OptionCellEditor({
  value,
  options,
  onCommit,
  renderOption,
}: {
  value: string | null
  options: ColumnOption[]
  onCommit: (v: unknown) => void
  renderOption?: (o: ColumnOption) => ReactNode
}) {
  const current = options.find((o) => o.value === value)
  return (
    <Menu
      align="left"
      width={220}
      trigger={
        <span tabIndex={0} className={c.thBtn} style={{ minHeight: 22, maxWidth: "100%", overflow: "hidden" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current ? (renderOption ? renderOption(current) : current.label) : "—"}
          </span>
        </span>
      }
    >
      {(close) => (
        <>
          <MenuItem
            label="— Nenhum —"
            active={!value}
            onClick={() => { onCommit(null); close() }}
          />
          {options.map((o) => (
            <MenuItem
              key={o.value}
              dot={renderOption ? undefined : (o.color ?? undefined)}
              label={renderOption ? renderOption(o) : o.label}
              active={o.value === value}
              onClick={() => { onCommit(o.value); close() }}
            />
          ))}
        </>
      )}
    </Menu>
  )
}
