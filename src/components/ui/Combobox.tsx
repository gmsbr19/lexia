"use client"

// Shared searchable-select ("combobox") primitive, built on top of the
// Popover foundation (./Popover.tsx). Replaces native <select> entity pickers
// app-wide where typing to filter genuinely helps (clientes, casos, leads,
// campanhas, contas, categorias, fornecedores, ...) — small static enums stay
// on their existing dropdowns (Menu/CxSelect etc.), this is only for large or
// dynamic option lists.
//
// Filtering is accent/case-insensitive via the app's canonical `normalizar`/
// `contemNormalizado` helpers (src/lib/text.ts) — NOT a hand-rolled
// `.toLowerCase()` — because imported client/case data mixes accented and
// unaccented spellings of the same name (see CmMergeModal in CmModals.tsx for
// the exact bug this avoids: it filters with `.toLowerCase().includes()` and
// so misses "Jose" when the stored name is "José").
//
// WIDTH: the trigger fills its container via plain CSS `width:100%` — Popover
// is opened with `fill`, which makes its trigger wrapper a full-width block box
// (not the default shrink-to-fit inline-flex), so the percentage resolves
// against the real container. Popover's own `width="trigger"` then sizes the
// panel to match. (No JS width measurement needed — an earlier version measured
// the wrapper to work around the inline-flex wrap, now obviated by `fill`.)
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Popover } from "./Popover"
import { Icon } from "@/components/tarefas/tf-icons"
import { normalizar, contemNormalizado } from "@/lib/text"
import * as s from "./combobox.css"

export interface ComboboxOption {
  /** Stable id, as a string (numeric ids should be String(id) by the caller). */
  value: string
  label: string
  /** Optional secondary text shown faded next to the label (e.g. a role, a
   *  city, a status). Also included in the search match. */
  hint?: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  /** Default "Selecionar…" — shown on the trigger when value is null, and as
   *  the search input's placeholder once open. */
  placeholder?: string
  /** Default true — shows a small × on the trigger when a value is selected. */
  allowClear?: boolean
  disabled?: boolean
  /** When true, the open panel shows a "Carregando…" state instead of the
   *  option list — for callers that lazy-fetch options on first open. Swaps
   *  live to the real list on the next render (no need to reopen). */
  loading?: boolean
  /** Default "Nenhum resultado". */
  emptyLabel?: string
  /** Extra class on the trigger. */
  className?: string
  /** Optional fixed width for the trigger; otherwise it fills its container. */
  triggerWidth?: number
  /** "trigger" (default): the open panel matches the trigger's width. "content":
   *  the panel sizes to its own content (useful when the trigger is narrow but the
   *  option labels are long, e.g. case titles) so names aren't clipped. */
  panelWidth?: "trigger" | "content"
  /** When set, an extra "criar …" row appears at the end of the list whenever the
   *  typed query doesn't match an existing option — clicking it calls onCreate with
   *  the trimmed text (the caller creates the entity and selects it). */
  onCreate?: (label: string) => void | Promise<void>
  /** Label for the create row (default: `Criar "<query>"`). */
  createLabel?: (query: string) => string
}

// Cap rendering even over an already-filtered list, to stay fast — the
// caller is responsible for not handing this a genuinely huge unfiltered
// list to begin with, but this caps defensively regardless.
const MAX_VISIBLE = 50

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecionar…",
  allowClear = true,
  disabled = false,
  loading = false,
  emptyLabel = "Nenhum resultado",
  className,
  triggerWidth,
  panelWidth = "trigger",
  onCreate,
  createLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const listRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

  const filtered = useMemo(() => {
    const nq = normalizar(query)
    // contemNormalizado returns false for an empty needle (by design — see
    // its doc comment), so an empty query must bypass it entirely rather
    // than filter everything out.
    const list = nq ? options.filter((o) => contemNormalizado(nq, o.label, o.hint)) : options
    return list.slice(0, MAX_VISIBLE)
  }, [options, query])

  // Highlighted index, derived DURING render rather than reset via a
  // useEffect-on-query-change — the house workaround for the
  // react-hooks/set-state-in-effect rule (compare a "last signal" value
  // during render and setState conditionally in the render body itself; see
  // CmLeads.tsx's resetSig/lastResetSig and injectFilter/lastNonce for the
  // established pattern this mirrors).
  const [highlight, setHighlight] = useState(0)
  const highlightSig: readonly [boolean, string] = [open, query]
  const [lastHighlightSig, setLastHighlightSig] = useState(highlightSig)
  if (highlightSig[0] !== lastHighlightSig[0] || highlightSig[1] !== lastHighlightSig[1]) {
    setLastHighlightSig(highlightSig)
    setHighlight(0)
  }
  // "Criar …" row: shown at the end when a create handler is set and the typed
  // query doesn't already match an existing option (accent/case-insensitive).
  const trimmedQuery = query.trim()
  const showCreate =
    !!onCreate && trimmedQuery.length > 0 && !options.some((o) => normalizar(o.label) === normalizar(trimmedQuery))
  const createIdx = filtered.length // the create row's index when shown
  const total = filtered.length + (showCreate ? 1 : 0)

  // Defensive clamp (pure derivation, not stored state) in case `options`
  // changes out from under an open panel (e.g. loading finishes) and the
  // stored highlight index no longer fits the new list (options + create row).
  const safeHighlight = total === 0 ? -1 : Math.min(highlight, total - 1)

  // Scroll the keyboard-highlighted row into view.
  useEffect(() => {
    if (!open || safeHighlight < 0) return
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${safeHighlight}"]`)?.scrollIntoView({ block: "nearest" })
  }, [open, safeHighlight])

  const handleOpenChange = (next: boolean) => {
    if (disabled) return
    setOpen(next)
    if (!next) setQuery("")
  }

  const selectOption = (opt: ComboboxOption) => {
    onChange(opt.value)
    handleOpenChange(false)
  }

  const doCreate = () => {
    if (!onCreate || !trimmedQuery) return
    void onCreate(trimmedQuery)
    handleOpenChange(false)
  }

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (total === 0) return
      setHighlight(Math.min(safeHighlight + 1, total - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (total === 0) return
      setHighlight(Math.max(safeHighlight - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (showCreate && safeHighlight === createIdx) doCreate()
      else {
        const opt = filtered[safeHighlight]
        if (opt) selectOption(opt)
      }
    }
    // Escape is handled by Popover itself (document-level keydown listener
    // that closes on Escape whenever open).
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      align="start"
      width={panelWidth === "content" ? undefined : "trigger"}
      fill
      trigger={
        <div
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          className={[s.trigger, disabled ? s.triggerDisabled : "", className].filter(Boolean).join(" ")}
          style={triggerWidth != null ? { width: triggerWidth } : undefined}
          onKeyDown={(e) => {
            if (disabled) return
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault()
              handleOpenChange(true)
            }
          }}
        >
          <span className={selected ? s.triggerLabel : s.triggerPlaceholder}>
            {selected ? selected.label : placeholder}
          </span>
          <span className={s.triggerIcons}>
            {allowClear && selected && !disabled && (
              <button
                type="button"
                className={s.clearBtn}
                aria-label="Limpar seleção"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
              >
                <Icon name="x" size={13} />
              </button>
            )}
            <Icon name="chevronDown" size={15} className={[s.chevron, open ? s.chevronOpen : ""].filter(Boolean).join(" ")} />
          </span>
        </div>
      }
    >
      {loading ? (
        <div className={s.loadingRow}>Carregando…</div>
      ) : (
        <div className={s.panelInner}>
          <div className={s.searchWrap}>
            <Icon name="search" size={14} className={s.searchIcon} />
            <input
              autoFocus
              className={s.searchInput}
              value={query}
              placeholder={placeholder}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
          </div>
          <div ref={listRef} role="listbox" id={listboxId} className={s.list}>
            {filtered.length === 0 && !showCreate && <div className={s.emptyRow}>{emptyLabel}</div>}
            {filtered.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                data-idx={i}
                className={[s.option, i === safeHighlight ? s.optionHighlighted : "", opt.value === value ? s.optionSelected : ""]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => selectOption(opt)}
              >
                <span className={s.optionLabel}>{opt.label}</span>
                {opt.hint && <span className={s.optionHint}>{opt.hint}</span>}
                {opt.value === value && <Icon name="check" size={14} className={s.optionCheck} />}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                role="option"
                aria-selected={false}
                data-idx={createIdx}
                className={[s.createRow, safeHighlight === createIdx ? s.optionHighlighted : ""].filter(Boolean).join(" ")}
                style={filtered.length === 0 ? { borderTop: "none", marginTop: 0 } : undefined}
                onMouseEnter={() => setHighlight(createIdx)}
                onClick={doCreate}
              >
                <Icon name="plus" size={14} className={s.createIcon} />
                <span className={s.optionLabel}>{(createLabel ?? ((q) => `Criar "${q}"`))(trimmedQuery)}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </Popover>
  )
}
