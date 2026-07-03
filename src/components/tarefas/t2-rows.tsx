"use client"

// Tarefas v2 — Todoist-style rows, day-section headers, inline add e bloco de
// atrasadas (ported from the design's t2-rows.jsx). As linhas leem o projeto
// DINÂMICO (projetoId) e reusam os chips do tf-kit.
import { useState } from "react"
import type { TaskRow } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { useTarefasCtx } from "./TarefasContext"
import { MO, TODAY, WD_LONG, dataLabel, tDiff, tParse } from "./tf-meta"
import { AssigneeAvatar, IaBadge, LinkChip, PrazoChip, SubProgress, TaskCheck } from "./tf-kit"
import { AnimatedRows, type ViewCallbacks } from "./views"

// ── task row ─────────────────────────────────────────────────────────────────
export function T2Row({ task, showProject = true, ...cb }: { task: TaskRow; showProject?: boolean } & ViewCallbacks) {
  const { projetoById } = useTarefasCtx()
  const overdueData = task.data && !task.done && tDiff(task.data) < 0
  const p = projetoById(task.projetoId)
  return (
    <div
      onClick={() => cb.onOpen(task.id)}
      className="t2-row"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 11,
        padding: "10px 6px 11px",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        opacity: task.done ? 0.5 : 1,
        position: "relative",
      }}
    >
      <div style={{ marginTop: 2 }}>
        <TaskCheck done={task.done} prio={task.prio} onToggle={() => cb.onToggle(task.id)} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              fontSize: 14,
              color: "var(--text)",
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
              textDecoration: task.done ? "line-through" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {task.titulo}
          </span>
          {task.ai && <IaBadge />}
        </div>
        {task.notes && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {task.notes}
          </div>
        )}
        {(task.data || task.prazo || task.subtasks.length > 0 || task.recur || task.reminder || task.vinculo) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            {task.data && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  color: overdueData ? "var(--crit)" : tDiff(task.data) === 0 ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                <Icon name="calendar" size={12} strokeWidth={1.85} />
                {dataLabel(task.data)}
                {task.hora ? <span style={{ fontFeatureSettings: '"tnum"' }}> {task.hora}</span> : null}
              </span>
            )}
            <PrazoChip prazo={task.prazo} done={task.done} compact />
            <SubProgress subtasks={task.subtasks} />
            {task.recur && <Icon name="repeat" size={12} strokeWidth={1.9} style={{ color: "var(--text-subtle)" }} />}
            {task.reminder && <Icon name="bell" size={11} strokeWidth={1.9} style={{ color: "var(--text-subtle)" }} />}
            <LinkChip vinculo={task.vinculo} onClick={cb.onLinkClick} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 2 }}>
        {showProject && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-subtle)" }}>
            {p?.nome ?? "Entrada"}
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p?.cor || "var(--text-subtle)" }} />
          </span>
        )}
        {task.responsavelId != null && <AssigneeAvatar id={task.responsavelId} size={20} />}
      </div>
    </div>
  )
}

/** Helper: T2Rows keyed for the shared collapse/fade exit animation. */
export function t2Rows(arr: TaskRow[], cb: ViewCallbacks, showProject = true) {
  return arr.map((t) => ({ id: t.id, el: <T2Row task={t} showProject={showProject} {...cb} /> }))
}

// ── inline "Adicionar tarefa" row ────────────────────────────────────────────
export function InlineAdd({ onClick, label = "Adicionar tarefa" }: { onClick: () => void; label?: string }) {
  return (
    <div
      onClick={onClick}
      className="t2-add"
      style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 6px", cursor: "pointer", color: "var(--text-subtle)", fontSize: 13 }}
    >
      <span
        className="t2-add-plus"
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)",
          transition: "background .12s, color .12s",
          flexShrink: 0,
        }}
      >
        <Icon name="plus" size={14} strokeWidth={2.2} />
      </span>
      {label}
    </div>
  )
}

// ── day-section heading:  "2 jul · Hoje · Quinta-feira" ──────────────────────
export function dayHeading(isoDate: string): string {
  const d = tParse(isoDate)
  const n = tDiff(isoDate)
  const parts = [`${d.getDate()} ${MO[d.getMonth()]}`]
  if (n === 0) parts.push("Hoje")
  if (n === 1) parts.push("Amanhã")
  const wd = WD_LONG[d.getDay()].replace(/^./, (c) => c.toUpperCase())
  parts.push(wd + (d.getDay() > 0 && d.getDay() < 6 ? "-feira" : ""))
  return parts.join(" · ")
}

export function T2SectionHead({
  label,
  count,
  tone,
  right,
  collapsible,
  collapsed,
  onCollapse,
}: {
  label: string
  count?: number | null
  tone?: "crit"
  right?: React.ReactNode
  collapsible?: boolean
  collapsed?: boolean
  onCollapse?: () => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0 7px", borderBottom: "1px solid var(--border-strong)", position: "relative" }}>
      {collapsible && (
        <button
          onClick={onCollapse}
          aria-label={collapsed ? "Expandir" : "Recolher"}
          style={{
            position: "absolute",
            left: -26,
            width: 22,
            height: 22,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--text-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={collapsed ? "chevronRight" : "chevronDown"} size={14} />
        </button>
      )}
      <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: tone === "crit" ? "var(--crit)" : "var(--text)" }}>{label}</span>
      {count != null && count > 0 && <span style={{ fontSize: 12, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>{count}</span>}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  )
}

// ── overdue block (shared: Hoje + Em breve) ──────────────────────────────────
export function OverdueBlock({ tasks, cb, onReschedule }: { tasks: TaskRow[]; cb: ViewCallbacks; onReschedule: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!tasks.length) return null
  return (
    <div style={{ marginBottom: 26 }}>
      <T2SectionHead
        label="Atrasadas"
        count={tasks.length}
        tone="crit"
        collapsible
        collapsed={collapsed}
        onCollapse={() => setCollapsed((c) => !c)}
        right={
          <span onClick={onReschedule} style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)", cursor: "pointer" }}>
            Reagendar
          </span>
        }
      />
      {!collapsed && <AnimatedRows rows={t2Rows(tasks, cb)} />}
    </div>
  )
}

// ── empty state ──────────────────────────────────────────────────────────────
export function T2Empty({ icon = "checkCircle", title, sub }: { icon?: TfIconName; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-subtle)" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--bg-sunken)",
          color: "var(--text-muted)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Icon name={icon} size={24} strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 340, margin: "5px auto 0", lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

// Re-export para os call-sites v2 (Hoje usa a mesma ordenação das views).
export const byTimeV2 = (a: TaskRow, b: TaskRow): number =>
  (a.hora || "99") !== (b.hora || "99") ? (a.hora || "99").localeCompare(b.hora || "99") : a.prio - b.prio

export const todayIsoV2 = TODAY
