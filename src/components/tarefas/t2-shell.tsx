"use client"

// Tarefas v2 — sidebar do módulo (estilo Todoist) + frame de conteúdo centrado.
// Ported from the design's t2-shell.jsx, sem o GlobalRail (o app já tem o
// UnifiedShell) e sem o toggle de tema (é do app). Os projetos DINÂMICOS vivem
// na sidebar; contadores em tempo real derivam da lista otimista de tarefas.
import type { ReactNode } from "react"
import type { ProjetoView } from "@/lib/projetos/types"
import { Icon, type TfIconName } from "./tf-icons"

export type T2View =
  | "entrada"
  | "hoje"
  | "embreve"
  | "agenda"
  | "todas"
  | "dashboard"
  | "templates"
  | "arquivados"
  | "projeto"

export interface T2Nav {
  view: T2View
  projectId: number | null
}

function SideItem({
  icon,
  label,
  count,
  active,
  onClick,
  dot,
  right,
}: {
  icon?: TfIconName
  label: string
  count?: number | null
  active?: boolean
  onClick: () => void
  dot?: string
  right?: ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className="side-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 34,
        padding: "0 10px",
        borderRadius: 8,
        cursor: "pointer",
        flexShrink: 0,
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.01em",
      }}
    >
      {dot ? (
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: dot, flexShrink: 0, marginLeft: 3, marginRight: 2 }} />
      ) : (
        icon && <Icon name={icon} size={16} strokeWidth={active ? 2 : 1.75} style={{ flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {right}
      {count != null && count > 0 && (
        <span style={{ fontSize: 11.5, fontWeight: 500, fontFeatureSettings: '"tnum"', color: active ? "var(--accent)" : "var(--text-subtle)" }}>
          {count}
        </span>
      )}
    </div>
  )
}

function SideGroupLabel({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 10px 6px" }}>
      <span style={{ fontSize: 10.5, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  )
}

export function TasksSidebar({
  nav,
  go,
  counts,
  projetos,
  openCount,
  canEdit,
  onToggleFav,
  onNewProject,
  onQuickAdd,
  onRamble,
  onNavigate,
}: {
  nav: T2Nav
  go: (nav: T2Nav) => void
  counts: { hoje: number; entrada: number }
  projetos: ProjetoView[]
  openCount: (projetoId: number) => number
  canEdit: boolean
  onToggleFav: (id: number) => void
  onNewProject: () => void
  onQuickAdd: () => void
  onRamble: () => void
  onNavigate?: () => void
}) {
  const to = (view: T2View, projectId: number | null = null) => {
    go({ view, projectId })
    onNavigate?.()
  }
  const favStar = (p: ProjetoView) => (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggleFav(p.id)
      }}
      className="side-fav"
      title={p.favorito ? "Remover favorito" : "Favoritar"}
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        lineHeight: 0,
        flexShrink: 0,
        color: p.favorito ? "var(--accent)" : "var(--text-subtle)",
        opacity: p.favorito ? 1 : 0,
      }}
    >
      <Icon name="star" size={12} strokeWidth={1.9} style={p.favorito ? { fill: "currentColor" } : undefined} />
    </button>
  )
  const projItem = (p: ProjetoView) => (
    <SideItem
      key={p.id}
      dot={p.cor || "var(--text-muted)"}
      label={p.nome}
      count={openCount(p.id)}
      right={favStar(p)}
      active={nav.view === "projeto" && nav.projectId === p.id}
      onClick={() => to("projeto", p.id)}
    />
  )
  const reais = projetos.filter((p) => p.status !== "arquivado")
  const favs = reais.filter((p) => p.favorito)
  const arquivados = projetos.filter((p) => p.status === "arquivado")

  return (
    <aside className="t2-side">
      {/* Adicionar tarefa + Ramble */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "0 0 10px" }}>
        <div
          onClick={onQuickAdd}
          className="side-item"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 36,
            padding: "0 8px",
            borderRadius: 8,
            cursor: "pointer",
            color: "var(--accent)",
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--brand-gold)",
              color: "var(--brand-navy)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="plus" size={14} strokeWidth={2.6} />
          </span>
          Adicionar tarefa
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--text-subtle)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "1px 6px",
            }}
          >
            Q
          </span>
        </div>
        <button
          onClick={onRamble}
          title="Ditar tarefas (Ramble)"
          className="side-item"
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="mic" size={17} strokeWidth={1.9} />
        </button>
      </div>

      <div className="side-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1, paddingBottom: 8 }}>
        <SideItem icon="inbox" label="Entrada" count={counts.entrada} active={nav.view === "entrada"} onClick={() => to("entrada")} />
        <SideItem icon="calendarDay" label="Hoje" count={counts.hoje} active={nav.view === "hoje"} onClick={() => to("hoje")} />
        <SideItem icon="calendarRange" label="Em breve" active={nav.view === "embreve"} onClick={() => to("embreve")} />
        <SideItem icon="list" label="Todas as tarefas" active={nav.view === "todas"} onClick={() => to("todas")} />
        <SideItem icon="barChart" label="Equipe" active={nav.view === "dashboard"} onClick={() => to("dashboard")} />
        <SideItem icon="copy" label="Modelos" active={nav.view === "templates"} onClick={() => to("templates")} />

        {favs.length > 0 && <SideGroupLabel label="Favoritos" />}
        {favs.map(projItem)}

        <SideGroupLabel
          label="Meus projetos"
          right={
            canEdit ? (
              <button
                onClick={onNewProject}
                title="Novo projeto"
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2, lineHeight: 0, color: "var(--text-subtle)" }}
              >
                <Icon name="plus" size={13} strokeWidth={2} />
              </button>
            ) : undefined
          }
        />
        {reais.map(projItem)}
        {!reais.length && (
          <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "2px 10px 6px", lineHeight: 1.45 }}>
            Nenhum projeto ainda{canEdit ? " — crie um no +" : ""}.
          </div>
        )}
        <SideItem icon="archive" label="Arquivados" count={arquivados.length} active={nav.view === "arquivados"} onClick={() => to("arquivados")} />
      </div>
    </aside>
  )
}

// ── content frame (scrollable, centered column like Todoist) ─────────────────
export function T2Frame({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
      <div style={{ maxWidth: wide ? 1060 : 820, margin: "0 auto", padding: "26px 40px 80px" }}>{children}</div>
    </div>
  )
}

// ── page title block ─────────────────────────────────────────────────────────
export function T2Title({ title, sub, right }: { title: string; sub?: string | null; right?: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text)" }}>{title}</h1>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {sub && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, fontSize: 13, color: "var(--text-muted)" }}>
          <Icon name="checkCircle" size={14} strokeWidth={1.8} />
          {sub}
        </div>
      )}
    </div>
  )
}
