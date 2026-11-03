"use client"

// Menu/MenuItem genéricos (portal + posição fixa) — usados pelo DataGrid e por
// outros módulos. O módulo Tarefas redesenhado usa as primitivas de tk-ui.tsx.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Icon, type TfIconName } from "./tf-icons"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"

// ── generic popover menu ─────────────────────────────────────────────────────
export function Menu({
  trigger,
  children,
  align = "left",
  width = 220,
  placement = "down",
}: {
  trigger: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: "left" | "right"
  width?: number
  placement?: "down" | "up"
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Panel is portaled to <body> with fixed positioning computed from the
  // trigger's rect — a plain position:absolute panel gets silently clipped
  // whenever the trigger sits inside an `overflow:auto`/`hidden` ancestor
  // (e.g. a scrollable table card), which hid row-action dropdowns near the
  // bottom of a scrolled table.
  const reposition = () => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return
    const top = placement === "up" ? r.top - 6 : r.bottom + 6
    const left = align === "right" ? r.right - width : r.left
    setPos({ top, left })
  }
  useLayoutEffect(() => {
    if (!open) return
    reposition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => reposition()
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    const h = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      if (panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
      document.removeEventListener("mousedown", h)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const close = () => setOpen(false)
  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          className={lexGlassStrong}
          style={{
            position: "fixed",
            top: placement === "up" ? undefined : pos.top,
            bottom: placement === "up" ? window.innerHeight - pos.top : undefined,
            left: pos.left,
            zIndex: 1000,
            width,
            borderRadius: 10,
            padding: 6,
            // Panels can be mounted inside right-aligned table cells — never
            // inherit that alignment into the menu items.
            textAlign: "left",
            maxHeight: 320,
            overflowY: "auto",
            ...glassElevation("0 12px 28px rgba(2,13,37,0.16)"),
          }}
        >
          {typeof children === "function" ? children(close) : children}
        </div>,
        document.body,
      )}
    </div>
  )
}

export function MenuItem({
  icon,
  dot,
  label,
  sub,
  active,
  onClick,
  right,
}: {
  icon?: TfIconName
  dot?: string
  label: ReactNode
  sub?: string
  active?: boolean
  onClick?: () => void
  right?: ReactNode
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 9px",
        borderRadius: 8,
        cursor: "pointer",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--surface-hover)"
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent"
      }}
    >
      {dot && <span style={{ width: 9, height: 9, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      {icon && <Icon name={icon} size={15} strokeWidth={1.8} style={{ flexShrink: 0, color: active ? "var(--accent)" : "var(--text-muted)" }} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
      {sub && <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{sub}</span>}
      {right}
      {active && <Icon name="check" size={14} strokeWidth={2.4} />}
    </div>
  )
}
