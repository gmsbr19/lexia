"use client"

// Todoist-style due-date picker built on the generic Popover primitive +
// the pure src/lib/datas/* date engine. Two exports:
//   - DatePickerPanel: the popover CONTENT, usable standalone (e.g. inlined
//     in a modal without its own trigger/popover chrome).
//   - DateField: the everyday import — a bordered trigger button + a
//     Popover wired to DatePickerPanel, owning its own open state.
import { useMemo, useState } from "react"
import { Popover } from "./Popover"
import { Icon, type TfIconName } from "@/components/tarefas/tf-icons"
import { TODAY, dataLabel } from "@/components/tarefas/tf-meta"
import { addDays, parseISO } from "@/lib/datas/util"
import { WD, MONTHS_LONG, buildMonthGrid, addMonthIndex, type MonthCell } from "@/lib/datas/mes"
import { datePresets } from "@/lib/datas/presets"
import { parseDataNatural } from "@/lib/datas/nl"
import { recorrenciaOptions } from "@/lib/datas/recorrencia"
import * as s from "./date-picker.css"

// Icon per preset key — "calendarRange"/similar covers the two open-ended
// presets ("Este fim de semana" / "Próxima semana"), `x` reads as the
// "clear" affordance for "Sem vencimento".
const PRESET_ICON: Record<string, TfIconName> = {
  hoje: "sun",
  amanha: "sunrise",
  "fim-de-semana": "calendarRange",
  "proxima-semana": "calendarDay",
  "sem-vencimento": "x",
}

// ── DatePickerPanel ─────────────────────────────────────────────────────────

export interface DatePickerPanelProps {
  value: string | null
  onChange: (iso: string | null) => void
  time?: string | null
  onTimeChange?: (hora: string | null) => void
  /** Default false — shows the "Hora" toggle row + a native time input once revealed. */
  withTime?: boolean
  /** Default true — shows the free-text NL input at the top. */
  nlParse?: boolean
  /** Default false — when true AND value is non-null, shows a recurrence section below the calendar. */
  recurEnabled?: boolean
  recur?: string | null
  onRecurChange?: (label: string | null) => void
  /** Default false — when true AND value is non-null, shows the "Adiar 1 dia"
   *  quick row. Task-centric (postponing a due date); off elsewhere so
   *  contract/campaign/etc. date fields don't surface a meaningless action. */
  allowAdiar?: boolean
  /** Called after a value is committed via a preset/grid-cell/NL-enter pick,
   *  so the caller's Popover can close itself — this component does not own
   *  its own open state. */
  onRequestClose?: () => void
}

export function DatePickerPanel({
  value,
  onChange,
  time = null,
  onTimeChange,
  withTime = false,
  nlParse = true,
  recurEnabled = false,
  recur = null,
  onRecurChange,
  allowAdiar = false,
  onRequestClose,
}: DatePickerPanelProps) {
  const hojeISO = useMemo(() => TODAY(), [])
  const presets = useMemo(() => datePresets(hojeISO), [hojeISO])

  // Displayed month is local browse state, seeded once from value/hojeISO —
  // deliberately NOT re-derived from `value` on every render, so navigating
  // away from the selected month (without picking anything) doesn't get
  // stomped. A fresh open of the panel (Popover unmounts children on close)
  // re-seeds it naturally on next mount.
  const [view, setView] = useState(() => {
    const d = parseISO(value ?? hojeISO)
    return { ano: d.getFullYear(), mes0: d.getMonth() }
  })
  const cells = useMemo(() => buildMonthGrid(view.ano, view.mes0, hojeISO), [view.ano, view.mes0, hojeISO])

  const [nlText, setNlText] = useState("")
  const parsed = nlParse && nlText.trim() ? parseDataNatural(nlText, hojeISO) : null

  const [horaOpen, setHoraOpen] = useState(() => time != null)

  function pick(iso: string | null) {
    onChange(iso)
    onRequestClose?.()
  }

  function pickCell(cell: MonthCell) {
    if (cell.foraDoMes) {
      const d = parseISO(cell.iso)
      setView({ ano: d.getFullYear(), mes0: d.getMonth() })
    }
    pick(cell.iso)
  }

  function commitNl() {
    if (!parsed) return
    // The preview line always shows exactly what this commits — including
    // "sem vencimento" whenever parsed.iso is null (parseDataNatural can't
    // distinguish "explicitly cleared" from "no date phrase found, only a
    // time" at the type level; committing what's previewed keeps behavior
    // predictable rather than guessing at that ambiguity).
    onChange(parsed.iso)
    if (parsed.hora != null) onTimeChange?.(parsed.hora)
    setNlText("")
    onRequestClose?.()
  }

  return (
    <div className={s.panelRoot}>
      {nlParse && (
        <div className={s.section}>
          <input
            type="text"
            className={s.nlInput}
            placeholder="Digite uma data — ex: sexta, dia 15, em 3 dias"
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitNl()
              }
            }}
          />
          {parsed && (
            <div className={s.nlPreview}>
              → {parsed.iso ? dataLabel(parsed.iso) : "sem vencimento"}
              {parsed.hora ? ` às ${parsed.hora}` : ""}
            </div>
          )}
        </div>
      )}

      <div className={s.section}>
        {allowAdiar && value != null && (
          <button type="button" className={s.presetRow} onClick={() => pick(addDays(value, 1))}>
            <Icon name="calendarClock" size={15} strokeWidth={1.8} className={s.presetIcon} />
            <span className={s.presetLabel}>Adiar 1 dia</span>
          </button>
        )}
        {presets.map((p) => (
          <button key={p.key} type="button" className={s.presetRow} onClick={() => pick(p.iso)}>
            <Icon name={PRESET_ICON[p.key] ?? "calendar"} size={15} strokeWidth={1.8} className={s.presetIcon} />
            <span className={s.presetLabel}>{p.label}</span>
            {p.hint && <span className={s.presetHint}>{p.hint}</span>}
          </button>
        ))}
      </div>

      <div className={s.sectionDivider}>
        <div className={s.calHeader}>
          <button
            type="button"
            className={s.calNavBtn}
            aria-label="Mês anterior"
            onClick={() => setView((v) => addMonthIndex(v.ano, v.mes0, -1))}
          >
            <Icon name="chevronLeft" size={16} strokeWidth={1.8} />
          </button>
          <span className={s.calMonthLabel}>
            {MONTHS_LONG[view.mes0]} {view.ano}
          </span>
          <button
            type="button"
            className={s.calNavBtn}
            aria-label="Próximo mês"
            onClick={() => setView((v) => addMonthIndex(v.ano, v.mes0, 1))}
          >
            <Icon name="chevronRight" size={16} strokeWidth={1.8} />
          </button>
        </div>
        <div className={s.calGrid}>
          {WD.map((w) => (
            <div key={w} className={s.calWeekday}>
              {w}
            </div>
          ))}
          {cells.map((cell) => {
            const selected = value != null && cell.iso === value
            const cls = [
              s.calCell,
              cell.foraDoMes && !selected ? s.calCellOut : "",
              cell.hoje && !selected ? s.calCellToday : "",
              selected ? s.calCellSelected : "",
            ]
              .filter(Boolean)
              .join(" ")
            return (
              <button key={cell.iso} type="button" className={cls} onClick={() => pickCell(cell)}>
                {cell.dia}
              </button>
            )
          })}
        </div>
      </div>

      {withTime && (
        <div className={s.sectionDivider}>
          <button
            type="button"
            className={s.toggleRow}
            onClick={() => {
              if (horaOpen) {
                // Collapsing the row also clears whatever time was set —
                // "Hora" is a single toggle that owns the field's presence,
                // not just its visibility.
                onTimeChange?.(null)
                setHoraOpen(false)
              } else {
                setHoraOpen(true)
              }
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="clock" size={15} strokeWidth={1.8} className={s.presetIcon} />
              <span className={s.presetLabel}>Hora</span>
            </span>
            <Icon name={horaOpen ? "chevronUp" : "chevronDown"} size={14} strokeWidth={1.8} className={s.presetIcon} />
          </button>
          {horaOpen && (
            <input
              type="time"
              className={s.timeInput}
              value={time ?? ""}
              onChange={(e) => onTimeChange?.(e.target.value || null)}
            />
          )}
        </div>
      )}

      {recurEnabled && value != null && (
        <div className={s.sectionDivider}>
          <div className={s.recurRow}>
            <span className={s.recurLabel}>
              <Icon name="repeat" size={15} strokeWidth={1.8} className={s.presetIcon} />
              Repetir
            </span>
            <select
              className={s.recurSelect}
              value={recur ?? "Não repete"}
              onChange={(e) => onRecurChange?.(e.target.value === "Não repete" ? null : e.target.value)}
            >
              {recorrenciaOptions(value).map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── DateField ────────────────────────────────────────────────────────────────

export interface DateFieldProps {
  value: string | null
  onChange: (iso: string | null) => void
  time?: string | null
  onTimeChange?: (hora: string | null) => void
  withTime?: boolean
  /** Default true. */
  allowClear?: boolean
  /** Default "Sem data". */
  placeholder?: string
  recurEnabled?: boolean
  recur?: string | null
  onRecurChange?: (label: string | null) => void
  /** Default false — task-centric "Adiar 1 dia" quick row (see DatePickerPanel). */
  allowAdiar?: boolean
  /** Default true. */
  nlParse?: boolean
  disabled?: boolean
  className?: string
}

export function DateField({
  value,
  onChange,
  time = null,
  onTimeChange,
  withTime = false,
  allowClear = true,
  placeholder = "Sem data",
  recurEnabled = false,
  recur = null,
  onRecurChange,
  allowAdiar = false,
  nlParse = true,
  disabled = false,
  className,
}: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const dateText = value ? dataLabel(value) : null
  const showClear = allowClear && value != null && !disabled

  return (
    <Popover
      open={open}
      onOpenChange={(o) => !disabled && setOpen(o)}
      align="start"
      width={300}
      fill
      scrollable={false}
      trigger={
        <button type="button" disabled={disabled} className={[s.field, className].filter(Boolean).join(" ")}>
          <Icon name="calendar" size={14} strokeWidth={1.8} className={s.fieldIcon} />
          <span className={value ? s.fieldLabel : s.fieldPlaceholder}>
            {value ? `${dateText}${time ? ` · ${time}` : ""}` : placeholder}
          </span>
          {showClear && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpar data"
              className={s.fieldClear}
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return
                e.preventDefault()
                e.stopPropagation()
                onChange(null)
              }}
            >
              <Icon name="x" size={12} strokeWidth={2} />
            </span>
          )}
        </button>
      }
    >
      <DatePickerPanel
        value={value}
        onChange={onChange}
        time={time}
        onTimeChange={onTimeChange}
        withTime={withTime}
        nlParse={nlParse}
        recurEnabled={recurEnabled}
        recur={recur}
        onRecurChange={onRecurChange}
        allowAdiar={allowAdiar}
        onRequestClose={() => setOpen(false)}
      />
    </Popover>
  )
}
