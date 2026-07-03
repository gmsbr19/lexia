"use client"

// Tarefas — shared UI primitives (ported from the design's tasks-kit.jsx).
// Reads real sócios / projects from TarefasContext.
import { useEffect, useRef, useState, type ReactNode } from "react"
import { PRIO, VINCULO_ICON, type SubItem, type TaskPrio, type VinculoRef } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { useTarefasCtx } from "./TarefasContext"
import { dataLabel, prazoInfo, tDiff } from "./tf-meta"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"

const prioColor = (prio: number): string => (PRIO[prio as TaskPrio] ?? PRIO[4]).color

// ── priority-colored round checkbox ─────────────────────────────────────────
export function TaskCheck({
  done,
  prio = 4,
  onToggle,
  size = 19,
}: {
  done: boolean
  prio?: number
  onToggle?: () => void
  size?: number
}) {
  const c = prioColor(prio)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle?.()
      }}
      aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
      className="task-check"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        cursor: "pointer",
        padding: 0,
        border: `1.7px solid ${c}`,
        background: done ? c : "transparent",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color .14s ease-out, border-color .14s ease-out, color .14s ease-out, box-shadow .14s ease-out",
        position: "relative",
      }}
    >
      <Icon name="check" size={size - 7} strokeWidth={3} style={{ opacity: done ? 1 : 0, transition: "opacity .12s" }} />
    </button>
  )
}

// ── priority flag ────────────────────────────────────────────────────────────
export function PriorityFlag({ prio, size = 13, showLabel = false }: { prio: number; size?: number; showLabel?: boolean }) {
  if (prio >= 4) return showLabel ? <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>Normal</span> : null
  const p = PRIO[prio as TaskPrio]
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: p.color, flexShrink: 0 }}>
      <Icon name="flag" size={size} strokeWidth={2} />
      {showLabel && <span style={{ fontSize: 12, fontWeight: 500 }}>{p.label}</span>}
    </span>
  )
}

// ── assignee avatar (sócio) ──────────────────────────────────────────────────
export function AssigneeAvatar({
  id,
  size = 22,
  ring = false,
  title = true,
}: {
  id: number | null | undefined
  size?: number
  ring?: boolean
  title?: boolean
}) {
  const { member } = useTarefasCtx()
  const m = member(id)
  if (!m) return null
  return (
    <div
      title={title ? `${m.nome} · ${m.role}` : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: m.color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 500,
        letterSpacing: "0.01em",
        boxShadow: ring ? "0 0 0 2px var(--surface)" : "none",
      }}
    >
      {m.initials}
    </div>
  )
}

// ── vínculo chip (caso/cliente · clicável) ───────────────────────────────────
export function LinkChip({ vinculo, onClick }: { vinculo: VinculoRef | null; onClick?: (v: VinculoRef) => void }) {
  if (!vinculo) return null
  const sub = vinculo.tipo === "caso" ? "Caso" : "Cliente"
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(vinculo)
      }}
      title={`${vinculo.nome} · ${sub}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 500,
        color: "var(--text-muted)",
        background: "var(--bg-sunken)",
        border: "1px solid var(--border)",
        padding: "2px 8px 2px 6px",
        borderRadius: 999,
        cursor: onClick ? "pointer" : "default",
        maxWidth: 160,
      }}
    >
      <Icon name={VINCULO_ICON[vinculo.tipo] as TfIconName} size={11} strokeWidth={1.9} style={{ flexShrink: 0 }} />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{vinculo.nome}</span>
    </span>
  )
}

// ── scheduled-date chip (data = quando fazer) ────────────────────────────────
export function DataChip({ data, hora, faded }: { data: string | null; hora?: string | null; faded?: boolean }) {
  if (!data) return null
  const lbl = dataLabel(data)
  const isToday = tDiff(data) === 0
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 500,
        color: faded ? "var(--text-subtle)" : isToday ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      <Icon name="calendar" size={12} strokeWidth={1.85} />
      {lbl}
      {hora && <span style={{ fontFeatureSettings: '"tnum"' }}>· {hora}</span>}
    </span>
  )
}

// ── deadline chip (prazo = limite) — urgency-colored ─────────────────────────
const PRAZO_TONE: Record<string, { fg: string; bg: string }> = {
  vencido: { fg: "var(--fin-neg)", bg: "var(--crit-soft)" },
  urgente: { fg: "var(--warn)", bg: "var(--warn-soft)" },
  proximo: { fg: "var(--text-muted)", bg: "var(--bg-sunken)" },
  neutro: { fg: "var(--text-subtle)", bg: "transparent" },
}
export function PrazoChip({ prazo, done, compact = false }: { prazo: string | null; done?: boolean; compact?: boolean }) {
  const info = prazoInfo(prazo, done)
  if (!info) return null
  const t = PRAZO_TONE[info.tone]
  const icon: TfIconName = info.tone === "vencido" ? "flame" : "flag"
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 500,
        color: t.fg,
        background: t.bg,
        padding: t.bg === "transparent" ? "0" : "2px 8px",
        borderRadius: 6,
      }}
    >
      <Icon name={icon} size={11} strokeWidth={2} />
      {compact ? info.label : <>Prazo {info.label}</>}
    </span>
  )
}

// ── subtasks progress ────────────────────────────────────────────────────────
export function SubProgress({ subtasks }: { subtasks: SubItem[] }) {
  if (!subtasks || !subtasks.length) return null
  const done = subtasks.filter((s) => s.done).length
  const all = done === subtasks.length
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 500,
        color: all ? "var(--fin-pos, #2E9E5B)" : "var(--text-subtle)",
      }}
    >
      <Icon name="listChecks" size={12} strokeWidth={1.9} />
      {done}/{subtasks.length}
    </span>
  )
}

// ── IA badge ─────────────────────────────────────────────────────────────────
export function IaBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 11,
        fontWeight: 500,
        color: "var(--accent)",
        background: "var(--accent-soft)",
        padding: "1px 6px",
        borderRadius: 6,
        flexShrink: 0,
      }}
    >
      <Icon name="sparkles" size={9} strokeWidth={2} />
      IA
    </span>
  )
}

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
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])
  const close = () => setOpen(false)
  return (
    // When open, the wrapper becomes a high stacking context so the dropdown
    // always paints above neighbouring form rows / pickers (e.g. Projeto above
    // Responsável in the task modal) instead of being partially occluded.
    <div ref={ref} style={{ position: "relative", display: "inline-flex", zIndex: open ? 60 : undefined }}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={lexGlassStrong}
          style={{
            position: "absolute",
            ...(placement === "up" ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            zIndex: 50,
            width,
            borderRadius: 10,
            padding: 6,
            maxHeight: 320,
            overflowY: "auto",
            ...glassElevation("0 12px 28px rgba(2,13,37,0.16)"),
          }}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
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

// ── view switcher ────────────────────────────────────────────────────────────
export type ViewId = "hoje" | "lista" | "quadro" | "calendario" | "agenda"
export const VIEWS: { id: ViewId; label: string; icon: TfIconName }[] = [
  { id: "hoje", label: "Hoje", icon: "sun" },
  { id: "lista", label: "Lista", icon: "list" },
  { id: "quadro", label: "Quadro", icon: "kanban" },
  { id: "calendario", label: "Calendário", icon: "calendar" },
  { id: "agenda", label: "Agenda do dia", icon: "calendarClock" },
]
export function ViewSwitcher({ view, setView }: { view: ViewId; setView: (v: ViewId) => void }) {
  return (
    <div style={{ display: "flex", gap: 3, background: "var(--bg-soft)", borderRadius: 10, padding: 3, border: "1px solid var(--border)" }}>
      {VIEWS.map((v) => {
        const on = view === v.id
        return (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: on ? "var(--surface)" : "transparent",
              color: on ? "var(--text)" : "var(--text-muted)",
              fontSize: 12,
              fontWeight: 500,
              boxShadow: on ? "var(--shadow-sm)" : "none",
            }}
          >
            <Icon name={v.icon} size={14} strokeWidth={1.85} />
            {v.label}
          </button>
        )
      })}
    </div>
  )
}

// ── section header (group titles in Hoje/Lista) ──────────────────────────────
export function SectionHeader({
  icon,
  label,
  count,
  tone,
  right,
}: {
  icon?: TfIconName
  label: ReactNode
  count?: number | null
  tone?: "vencido" | "accent"
  right?: ReactNode
}) {
  const color = tone === "vencido" ? "var(--fin-neg)" : tone === "accent" ? "var(--accent)" : "var(--text)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px 9px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
      {icon && <Icon name={icon} size={15} strokeWidth={1.95} style={{ color }} />}
      <span style={{ fontSize: 14, fontWeight: 500, color, letterSpacing: "-0.01em" }}>{label}</span>
      {count != null && <span style={{ fontSize: 12, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>{count}</span>}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  )
}
