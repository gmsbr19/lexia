"use client"

// Generalized popover foundation — generalizes the proven `Menu` pattern from
// src/components/tarefas/tf-kit.tsx (portal to document.body, fixed position
// computed from the trigger's getBoundingClientRect(), reposition on
// scroll/resize, outside-click via a document-level mousedown listener) into
// a bare, controlled, reusable primitive. This is the base a future Combobox
// and DatePicker get built on top of — it owns NO search/option/calendar
// behavior, only positioning, glass, outside-click, Escape, and flip.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import * as s from "./popover.css"

export interface PopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Clickable content; clicking it calls onOpenChange(!open) — Popover
   *  itself does not own open state. */
  trigger: ReactNode
  /** Panel content. */
  children: ReactNode
  /** "start" (default): panel's left edge aligns with the trigger's left
   *  edge. "end": panel's right edge aligns with the trigger's right edge
   *  (renamed from tf-kit Menu's align "left"/"right"). */
  align?: "start" | "end"
  /** "bottom" (default) or "top". When "bottom" would overflow the viewport
   *  (not enough space below the trigger for the panel's actual rendered
   *  height) it flips to rendering above the trigger automatically — and
   *  symmetrically for an explicit "top" that would overflow upward. */
  placement?: "bottom" | "top"
  /** undefined (default): panel sizes to its own content. "trigger": panel
   *  width matches the trigger wrapper's rendered width. A number: fixed
   *  pixel width. */
  width?: number | "trigger"
  /** Default 1400 — clears every modal band in the app (portal menus ~1000,
   *  most modals 100-130, the "big modal" band 1200-1300) while staying
   *  under toasts (1500-1600), so a popover opened from inside a modal still
   *  renders on top of it. */
  zIndex?: number
  /** Extra class(es) appended after the panel's own glass class. */
  panelClassName?: string
  /** Default true. */
  closeOnOutsideClick?: boolean
  /** Default false. When true the trigger wrapper becomes a full-width block
   *  box so a `width:100%` trigger (Combobox/DateField) spans its container
   *  instead of shrink-wrapping to its content. Leave false for chip/button
   *  triggers that should size to their own content (e.g. a Menu-style chip). */
  fill?: boolean
  /** Default true → the panel caps at 360px tall and scrolls (right for long
   *  option lists / menus). Set false for self-contained panels that must show
   *  in full without an inner scrollbar (e.g. the DatePicker calendar). */
  scrollable?: boolean
}

const GAP = 6
// Keep the panel at least this far from the viewport edges so it never sits
// flush against (or spills past) the window border.
const MARGIN = 8

interface Pos {
  top?: number
  bottom?: number
  left: number
  width?: number
  maxHeight: number | "none"
}

export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "start",
  placement = "bottom",
  width,
  zIndex = 1400,
  panelClassName,
  closeOnOutsideClick = true,
  fill = false,
  scrollable = true,
}: PopoverProps) {
  const [pos, setPos] = useState<Pos | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Panel is portaled to <body> with fixed positioning computed from the
  // trigger's rect — see Menu's own comment in tf-kit.tsx for why (a plain
  // position:absolute panel gets clipped by any scrollable/overflow:hidden
  // ancestor). Extended here with a flip check: the panel already exists in
  // the DOM (rendered invisible below, via `visibility`) by the time this
  // runs, so panelRef's rect reflects its REAL rendered size — no guessing.
  const reposition = () => {
    const triggerRect = wrapRef.current?.getBoundingClientRect()
    if (!triggerRect) return
    const panelEl = panelRef.current
    // scrollHeight = the panel's FULL natural content height, unaffected by
    // whatever maxHeight is currently clamping the box — so the fit/flip/cap
    // math below always sees the real size, and choosing a new maxHeight can't
    // feed back into the measurement (no oscillation with the ResizeObserver).
    const naturalH = panelEl?.scrollHeight ?? 0
    const measuredW = panelEl?.getBoundingClientRect().width ?? 0
    const viewportH = window.innerHeight
    const viewportW = window.innerWidth
    const spaceBelow = viewportH - triggerRect.bottom - GAP - MARGIN
    const spaceAbove = triggerRect.top - GAP - MARGIN

    // Prefer the requested placement; flip only when it doesn't fit AND the
    // other side has more room.
    let side: "top" | "bottom" = placement
    if (placement === "bottom" && naturalH > spaceBelow && spaceAbove > spaceBelow) side = "top"
    else if (placement === "top" && naturalH > spaceAbove && spaceBelow > spaceAbove) side = "bottom"

    // Scrollable panels (long option lists / menus) cap at 360 like a menu;
    // self-contained panels (the DatePicker calendar) show in full. Either way
    // clamp to the room actually available on the chosen side, so the panel
    // never spills off-page — it only falls back to an inner scroll on a
    // genuinely too-short viewport.
    const avail = side === "bottom" ? spaceBelow : spaceAbove
    const hardCap = scrollable ? Math.min(360, avail) : avail
    const maxHeight: number | "none" = naturalH > hardCap ? Math.max(hardCap, 120) : "none"

    const effectiveWidth = typeof width === "number" ? width : width === "trigger" ? triggerRect.width : measuredW
    // Clamp horizontally so a trigger near the right/left edge doesn't push the
    // panel past the window border.
    let left = align === "end" ? triggerRect.right - effectiveWidth : triggerRect.left
    left = Math.max(MARGIN, Math.min(left, viewportW - effectiveWidth - MARGIN))

    setPos({
      left,
      width: width === "trigger" ? triggerRect.width : undefined,
      maxHeight,
      ...(side === "bottom"
        ? { top: triggerRect.bottom + GAP, bottom: undefined }
        : { top: undefined, bottom: viewportH - triggerRect.top + GAP }),
    })
  }

  // Reset pos the moment `open` flips to false — derived during render (the
  // house workaround for react-hooks/set-state-in-effect: compare a "last
  // signal" value and setState conditionally in the render body itself)
  // rather than inside the layout effect below, since this reset needs no
  // DOM measurement and doesn't belong in an effect.
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (!open) setPos(null)
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
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // The panel's own content will later be dynamic (a Combobox's filtered
  // option list, a DatePicker's calendar) — when its rendered size changes
  // while it stays open, re-run the flip/align math instead of leaving it
  // sized/positioned for stale content.
  useEffect(() => {
    if (!open) return
    if (typeof ResizeObserver === "undefined") return
    const panelEl = panelRef.current
    if (!panelEl) return
    const ro = new ResizeObserver(() => reposition())
    ro.observe(panelEl)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || !closeOnOutsideClick) return
    // Native document-level listener, exactly like Menu's — it only READS
    // the event to decide whether to close ourselves; it never calls
    // stopPropagation() or dispatches anything, so it can't interfere with
    // an ancestor modal's own outside-click handler (see Popover.tsx's
    // final report / CLAUDE.md task notes for why nesting is already safe).
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      if (panelRef.current?.contains(e.target as Node)) return
      onOpenChange(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closeOnOutsideClick])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      onOpenChange(false)
      wrapRef.current?.focus()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const styleWidth = typeof width === "number" ? width : pos?.width

  return (
    <div ref={wrapRef} tabIndex={-1} className={fill ? s.wrapFill : s.wrap}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className={[s.panel, panelClassName].filter(Boolean).join(" ")}
            style={{
              position: "fixed",
              top: pos?.top,
              bottom: pos?.bottom,
              left: pos?.left,
              width: styleWidth,
              zIndex,
              // Viewport-aware cap computed in reposition() (see there):
              // "none" = show in full, a number = clamp + inner scroll as a
              // last resort. Inline overrides the class's default 360 cleanly.
              maxHeight: pos?.maxHeight,
              // Hidden until the first reposition() pass (inside
              // useLayoutEffect, which flushes synchronously before paint)
              // has measured the panel's real size and set a final
              // position — avoids a one-frame flash at (auto, 0,0).
              visibility: pos ? "visible" : "hidden",
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  )
}
