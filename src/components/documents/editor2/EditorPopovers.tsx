"use client"

// Floating glass surfaces for the flexible editor, positioned in VIEWPORT space
// (the editor scrolls internally, so `position: fixed` anchored to the field /
// selection rect is simplest and dismisses cleanly on scroll):
//   • FieldFillPopover — click a {{campo}} chip on the page to type its value.
//   • ArmFieldPopover  — name + type a new field placed via "posicionar campo".
//   • SelectionToolbar — quick format + "Editar com a LexIA" over a selection.
// All three wear the shared `lexGlassStrong` recipe (opaque frost over live text).
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Check, Sparkles, Trash2, X, Bold, Italic, Underline as UnderlineIcon } from "lucide-react"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { tokens } from "@/styles/tokens.css"
import { FIELD_TYPE_OPTIONS, fieldTypeMeta } from "./field-types"
import type { PlaceholderType } from "@/lib/documents/model/types"

const ELEV = "0 18px 50px rgba(2,13,37,0.28)"

/** Viewport rect enough to anchor a popover (from the editor's coordsOf / rectOfRange). */
export interface AnchorRect {
  left: number
  top: number
  bottom: number
  right?: number
}

// Dismiss on outside pointerdown / scroll / resize / Escape.
function useDismiss(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onScroll = () => onClose()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    // capture scroll from the inner editor container too
    window.addEventListener("pointerdown", onDown, true)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onScroll)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown, true)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onScroll)
      window.removeEventListener("keydown", onKey)
    }
  }, [ref, onClose])
}

// Clamp a popover box into the viewport (8px gutter).
function clampToViewport(el: HTMLElement) {
  const pad = 8
  const r = el.getBoundingClientRect()
  let dx = 0
  let dy = 0
  if (r.left < pad) dx = pad - r.left
  else if (r.right > window.innerWidth - pad) dx = window.innerWidth - pad - r.right
  if (r.top < pad) dy = pad - r.top
  else if (r.bottom > window.innerHeight - pad) dy = window.innerHeight - pad - r.bottom
  if (dx || dy) {
    el.style.left = `${parseFloat(el.style.left) + dx}px`
    el.style.top = `${parseFloat(el.style.top) + dy}px`
  }
}

// ── Field fill (click a placeholder chip on the page) ──────────────────────────
export function FieldFillPopover({
  field,
  value,
  rect,
  onChange,
  onClear,
  onClose,
}: {
  field: { name: string; label: string; dataType?: PlaceholderType }
  value: string
  rect: AnchorRect
  onChange: (v: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useDismiss(ref, onClose)
  const { Icon, label: typeLabel } = fieldTypeMeta(field.dataType)

  useLayoutEffect(() => {
    if (ref.current) clampToViewport(ref.current)
  }, [rect])
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [field.name])

  return (
    <div
      ref={ref}
      className={lexGlassStrong}
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 8,
        zIndex: 60,
        width: 280,
        borderRadius: 12,
        padding: 12,
        ...glassElevation(ELEV),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: tokens.color.accentSoft, color: tokens.color.accent }}>
          <Icon size={14} />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: tokens.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{field.label}</span>
          <span style={{ display: "block", fontSize: 11, color: tokens.color.textSubtle, textTransform: "uppercase", letterSpacing: "0.06em" }}>{typeLabel}</span>
        </span>
        <button type="button" onClick={onClose} title="Fechar" style={iconBtn}>
          <X size={14} />
        </button>
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onClose()
          }
        }}
        placeholder={`Valor do campo…`}
        style={{
          width: "100%",
          height: 36,
          borderRadius: 8,
          border: `1px solid ${tokens.color.border}`,
          background: tokens.color.surface,
          color: tokens.color.text,
          padding: "0 10px",
          fontSize: 13,
          fontFamily: tokens.font.sans,
          outline: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
        <button type="button" onClick={onClear} disabled={!value} style={{ ...ghostChip, opacity: value ? 1 : 0.5, cursor: value ? "pointer" : "default" }}>
          <Trash2 size={13} /> Limpar
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose} style={goldChip}>
          <Check size={13} /> Concluir
        </button>
      </div>
    </div>
  )
}

// ── Arm / "posicionar campo" (name a new field placed by click) ────────────────
export function ArmFieldPopover({
  rect,
  onSubmit,
  onClose,
}: {
  rect: AnchorRect
  onSubmit: (field: { label: string; dataType: PlaceholderType }) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [label, setLabel] = useState("")
  const [dataType, setDataType] = useState<PlaceholderType>("texto")
  useDismiss(ref, onClose)

  useLayoutEffect(() => {
    if (ref.current) clampToViewport(ref.current)
  }, [rect])
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    const l = label.trim()
    if (!l) return
    onSubmit({ label: l, dataType })
  }

  return (
    <div
      ref={ref}
      className={lexGlassStrong}
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 8,
        zIndex: 60,
        width: 300,
        borderRadius: 12,
        padding: 12,
        ...glassElevation(ELEV),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: tokens.color.text }}>Novo campo</span>
        <button type="button" onClick={onClose} title="Cancelar" style={iconBtn}>
          <X size={14} />
        </button>
      </div>
      <label style={fieldLabel}>Nome do campo</label>
      <input
        ref={inputRef}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Ex.: Nome do outorgante"
        style={{
          width: "100%",
          height: 36,
          borderRadius: 8,
          border: `1px solid ${tokens.color.border}`,
          background: tokens.color.surface,
          color: tokens.color.text,
          padding: "0 10px",
          fontSize: 13,
          fontFamily: tokens.font.sans,
          outline: "none",
          marginBottom: 9,
        }}
      />
      <label style={fieldLabel}>Tipo</label>
      <select
        value={dataType}
        onChange={(e) => setDataType(e.target.value as PlaceholderType)}
        style={{
          width: "100%",
          height: 36,
          borderRadius: 8,
          border: `1px solid ${tokens.color.border}`,
          background: tokens.color.surface,
          color: tokens.color.text,
          padding: "0 8px",
          fontSize: 13,
          fontFamily: tokens.font.sans,
          outline: "none",
        }}
      >
        {FIELD_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 11 }}>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose} style={ghostChip}>
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={!label.trim()} style={{ ...goldChip, opacity: label.trim() ? 1 : 0.5, cursor: label.trim() ? "pointer" : "default" }}>
          <Check size={13} /> Inserir
        </button>
      </div>
    </div>
  )
}

// ── Selection toolbar (quick format + "Editar com a LexIA") ────────────────────
export function SelectionToolbar({
  rect,
  active,
  onFormat,
  onEditWithLexia,
}: {
  rect: AnchorRect
  active: { bold: boolean; italic: boolean; underline: boolean }
  onFormat: (mark: "bold" | "italic" | "underline") => void
  onEditWithLexia: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (ref.current) clampToViewport(ref.current)
  }, [rect])

  // centered over the selection, floating just above it
  const cx = rect.right != null ? (rect.left + rect.right) / 2 : rect.left
  return (
    <div
      ref={ref}
      className={lexGlassStrong}
      // keep the editor selection alive — never take focus on click
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: cx,
        top: rect.top - 46,
        transform: "translateX(-50%)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: 4,
        borderRadius: 11,
        ...glassElevation(ELEV),
      }}
    >
      <button type="button" onClick={() => onFormat("bold")} title="Negrito" style={active.bold ? selChipActive : selChip}>
        <Bold size={14} />
      </button>
      <button type="button" onClick={() => onFormat("italic")} title="Itálico" style={active.italic ? selChipActive : selChip}>
        <Italic size={14} />
      </button>
      <button type="button" onClick={() => onFormat("underline")} title="Sublinhado" style={active.underline ? selChipActive : selChip}>
        <UnderlineIcon size={14} />
      </button>
      <span style={{ width: 1, height: 18, background: tokens.color.border, margin: "0 2px" }} />
      <button type="button" onClick={onEditWithLexia} style={{ ...goldChip, height: 30 }}>
        <Sparkles size={13} /> Editar com a LexIA
      </button>
    </div>
  )
}

// ── shared inline styles ───────────────────────────────────────────────────────
const iconBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  border: "none",
  background: "transparent",
  color: tokens.color.textMuted,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  flexShrink: 0,
}
const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: tokens.color.textMuted,
  marginBottom: 5,
  letterSpacing: "0.01em",
}
const ghostChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 30,
  padding: "0 11px",
  borderRadius: 8,
  border: `1px solid ${tokens.color.border}`,
  background: "transparent",
  color: tokens.color.textMuted,
  fontSize: 12.5,
  fontWeight: 500,
  fontFamily: tokens.font.sans,
  cursor: "pointer",
}
const goldChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  border: "none",
  background: tokens.color.accentStrong,
  color: "#020D25", // navy on gold in BOTH themes (matches .btn-gold)
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: tokens.font.sans,
  cursor: "pointer",
}
const selChip: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: tokens.color.textMuted,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
}
const selChipActive: React.CSSProperties = { ...selChip, background: tokens.color.accentSoft, color: tokens.color.accent }
