"use client"

// Projetos & Tarefas — shared UI primitives (ported from the design's
// projetos-kit.jsx). Built on the Tarefas tokens + tf-kit (Icon / Menu /
// AssigneeAvatar) and the real ProjetoView model. The acrylic surfaces reuse the
// app-wide --lex-acrylic* / --lex-blur tokens (same family as the bell/toasts).
import { useMemo, type CSSProperties, type ReactNode } from "react"
import { PROJECTS, STATUS, type TeamMember } from "@/lib/tarefas/types"
import { useAreasStore, toAreaOptions, resolveAreaLabel } from "@/lib/areas/store"
import { type ProjetoStatus, type ProjetoView, type SaudeProjeto, saudeMeta, statusProjetoMeta } from "@/lib/projetos/types"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { Icon, type TfIconName } from "@/components/tarefas/tf-icons"
import { AssigneeAvatar, Menu, MenuItem } from "@/components/tarefas/tf-kit"
import { TODAY } from "@/components/tarefas/tf-meta"
import { addBizDaysClient } from "./pj-meta"

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

// ── legacy deep-link tab ids (?tab= no /tarefas; o workspace v2 os mapeia
// para a navegação da sidebar) ────────────────────────────────────────────────
export type ModuleTab = "tarefas" | "projetos" | "dashboard" | "templates"

// ── saúde do projeto (chip + dot) ────────────────────────────────────────────
const SAUDE_SOFT: Record<SaudeProjeto, string> = {
  no_prazo: "var(--ok-soft)",
  em_risco: "var(--warn-soft)",
  atrasado: "var(--crit-soft)",
}
export function SaudeChip({ saude, compact = false }: { saude: SaudeProjeto; compact?: boolean }) {
  const s = saudeMeta(saude)
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: compact ? "0 7px" : "0 9px",
        borderRadius: 6,
        fontSize: compact ? 11 : 12,
        fontWeight: 500,
        background: SAUDE_SOFT[saude],
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {s.label}
    </span>
  )
}
export function SaudeDot({ saude, size = 7 }: { saude: SaudeProjeto; size?: number }) {
  const s = saudeMeta(saude)
  return <span title={s.label} style={{ width: size, height: size, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
}

// ── pílula de status do projeto ──────────────────────────────────────────────
const STATUS_TONE: Record<ProjetoStatus, { bg: string; fg: string }> = {
  ativo: { bg: "var(--ok-soft)", fg: "var(--ok)" },
  pausado: { bg: "var(--neutral-soft)", fg: "var(--text-muted)" },
  concluido: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  arquivado: { bg: "var(--neutral-soft)", fg: "var(--text-subtle)" },
}
export function ProjStatusPill({ status }: { status: ProjetoStatus }) {
  const meta = statusProjetoMeta(status)
  const t = STATUS_TONE[status] ?? STATUS_TONE.ativo
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 9px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        background: t.bg,
        color: t.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {meta.label}
    </span>
  )
}

// ── tag de área (prática) ─────────────────────────────────────────────────────
export function AreaTag({ area }: { area: string | null }) {
  const label = useAreaLabel(area)
  if (!area) return null
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 9px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        background: "var(--bg-sunken)",
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  )
}

// ── progresso (barra + anel) ──────────────────────────────────────────────────
export function ProgressBar({
  value,
  color = "var(--accent)",
  height = 4,
  track = "var(--bg-sunken)",
}: {
  value: number
  color?: string
  height?: number
  track?: string
}) {
  return (
    <div style={{ height, borderRadius: 999, background: track, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, background: color, borderRadius: 999, transition: `width .35s ${EASE}` }} />
    </div>
  )
}
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  color = "var(--accent)",
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100)
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: `stroke-dashoffset .5s ${EASE}` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 500, color: "var(--text)", fontFeatureSettings: '"tnum"', letterSpacing: "-0.02em" }}>{value}</span>
        <span style={{ fontSize: size * 0.13, color: "var(--text-subtle)", marginTop: -2 }}>%</span>
      </div>
    </div>
  )
}

// ── ícone do projeto (container quadrado, cor do projeto) ─────────────────────
export function ProjectIcon({ cor, icone, size = 34, radius = 9 }: { cor: string | null; icone: string | null; size?: number; radius?: number }) {
  const color = cor || "var(--text-muted)"
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={(icone as TfIconName) || "folder"} size={size * 0.5} strokeWidth={1.8} />
    </span>
  )
}

// ── bandeira de sugestão da LexIA (dourada, dispensável) ──────────────────────
export function AiSuggestionBanner({
  title,
  children,
  onPrimary,
  primaryLabel = "Criar projeto",
  onDismiss,
  icon = "sparkles",
}: {
  title: string
  children?: ReactNode
  onPrimary: () => void
  primaryLabel?: string
  onDismiss: () => void
  icon?: TfIconName
}) {
  return (
    <div
      className="ai-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 15,
        padding: "14px 16px",
        marginBottom: 16,
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 100% 0%, var(--accent-soft) 0%, transparent 50%)" }} />
      <div style={{ position: "relative", width: 38, height: 38, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={19} strokeWidth={1.9} />
      </div>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 7px", borderRadius: 999 }}>LexIA</span>
        </div>
        {children && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.45 }}>{children}</div>}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button className="btn btn-ghost" onClick={onDismiss} style={{ height: 34, fontSize: 12.5 }}>Dispensar</button>
        <button className="btn btn-primary" onClick={onPrimary} style={{ height: 34, fontSize: 12.5 }}>
          <Icon name="plus" size={14} strokeWidth={2.2} />
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}

// ── barra de edição em massa (rodapé flutuante, acrílica) ─────────────────────
export type BulkField = "status" | "responsavelId" | "prazo" | "projetoId"
export function BulkBar({
  count,
  socios,
  projetos,
  onClear,
  onApply,
  onDelete,
}: {
  count: number
  socios: TeamMember[]
  projetos: ProjetoView[]
  onClear: () => void
  onApply: (field: BulkField, value: string | number | null) => void
  onDelete: () => void
}) {
  const upBtn = (icon: TfIconName, label: string, content: (close: () => void) => ReactNode) => (
    <Menu
      align="left"
      width={210}
      placement="up"
      trigger={
        <span className="bulk-act">
          <Icon name={icon} size={14} strokeWidth={1.85} />
          {label}
          <Icon name="chevronDown" size={12} />
        </span>
      }
    >
      {content}
    </Menu>
  )
  return (
    <div
      className={`bulk-bar ${lexGlassStrong}`}
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 10px 8px 14px",
        borderRadius: 14,
        maxWidth: "calc(100% - 32px)",
        flexWrap: "wrap",
        ...glassElevation("0 12px 32px rgba(2,13,37,0.18)"),
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--text)", paddingRight: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, padding: "0 6px", borderRadius: 6, background: "var(--accent)", color: "var(--brand-navy)", fontSize: 12, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{count}</span>
        selecionadas
      </span>
      <span style={{ width: 1, height: 22, background: "var(--border)" }} />
      {upBtn("circleDot", "Status", (close) =>
        STATUS.map((s) => <MenuItem key={s.id} dot={s.color} label={s.label} onClick={() => { onApply("status", s.id); close() }} />),
      )}
      {upBtn("user", "Responsável", (close) => (
        <>
          <MenuItem label="Remover responsável" onClick={() => { onApply("responsavelId", null); close() }} />
          {socios.map((m) => (
            <MenuItem key={m.id} label={m.nome} sub={m.role} onClick={() => { onApply("responsavelId", m.id); close() }} right={<AssigneeAvatar id={m.id} size={18} title={false} />} />
          ))}
        </>
      ))}
      {upBtn("flag", "Prazo", (close) => (
        <>
          {([["Hoje", 0], ["Amanhã", 1], ["Em 3 dias úteis", 3], ["Em 1 semana", 7]] as [string, number][]).map(([lbl, n]) => (
            <MenuItem key={lbl} icon="calendar" label={lbl} onClick={() => { onApply("prazo", addBizDaysClient(TODAY(), n)); close() }} />
          ))}
          <MenuItem icon="x" label="Remover prazo" onClick={() => { onApply("prazo", null); close() }} />
        </>
      ))}
      {upBtn("layoutGrid", "Projeto", (close) =>
        projetos.map((p) => <MenuItem key={p.id} dot={p.cor || "var(--text-muted)"} label={p.nome} onClick={() => { onApply("projetoId", p.id); close() }} />),
      )}
      <button className="bulk-act danger" onClick={onDelete}>
        <Icon name="trash2" size={14} strokeWidth={1.85} />
        Excluir
      </button>
      <span style={{ width: 1, height: 22, background: "var(--border)" }} />
      <button className="btn btn-ghost" onClick={onClear} style={{ width: 30, height: 30, padding: 0 }} title="Limpar seleção">
        <Icon name="x" size={16} />
      </button>
    </div>
  )
}

// ── mini-stat (cabeçalho do projeto) ──────────────────────────────────────────
export function MiniStat({ value, label, tone }: { value: ReactNode; label: string; tone?: "crit" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 16, fontWeight: 500, color: tone === "crit" ? "var(--crit)" : "var(--text)", fontFeatureSettings: '"tnum"', letterSpacing: "-0.02em" }}>{value}</span>
      <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{label}</span>
    </div>
  )
}

// ── filter trigger button ─────────────────────────────────────────────────────
export function FilterBtn({ icon, label, active, children }: { icon?: TfIconName; label?: string; active?: boolean; children?: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 32,
        padding: "0 11px",
        borderRadius: 9,
        border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
        background: active ? "var(--accent-soft)" : "var(--surface)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        color: active ? "var(--accent)" : "var(--text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {icon && <Icon name={icon} size={14} strokeWidth={1.85} />}
      {children || label}
      <Icon name="chevronDown" size={12} />
    </span>
  )
}

// ── skeleton row + error banner ───────────────────────────────────────────────
export function SkelRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 10px" }}>
      <div className="skeleton" style={{ width: 19, height: 19, borderRadius: "50%" }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: "38%", height: 13 }} />
        <div className="skeleton" style={{ width: "22%", height: 10, marginTop: 7 }} />
      </div>
      <div className="skeleton" style={{ width: 64, height: 13 }} />
      <div className="skeleton" style={{ width: 22, height: 22, borderRadius: "50%" }} />
    </div>
  )
}
export function ErrorBanner({ children, onRetry }: { children: ReactNode; onRetry: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        marginBottom: 16,
        background: "var(--crit-soft)",
        border: "1px solid color-mix(in srgb, var(--crit) 28%, transparent)",
        borderRadius: 10,
      }}
    >
      <Icon name="alertTriangle" size={17} strokeWidth={1.9} style={{ color: "var(--crit)", flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{children}</span>
      <button className="btn btn-ghost" onClick={onRetry} style={{ height: 30, fontSize: 12, color: "var(--crit)" }}>
        <Icon name="refreshCw" size={13} strokeWidth={2} />
        Tentar de novo
      </button>
    </div>
  )
}

// ── page layout helpers ───────────────────────────────────────────────────────
export function PageFrame({ children, pad }: { children: ReactNode; pad?: string }) {
  return (
    <div className="pj-frame" style={pad ? { padding: pad } : undefined}>
      {children}
    </div>
  )
}
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", color: "var(--text)" }}>{title}</h1>
        {sub && <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}
export function CardTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── acrylic overlay shell (modais, wizard, editor) ────────────────────────────
export function Overlay({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  const panel: CSSProperties = {
    width: wide ? 820 : 600,
    maxWidth: "100%",
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 16,
    ...glassElevation("0 24px 60px rgba(2,13,37,0.28)"),
  }
  return (
    <div
      onClick={onClose}
      className="overlay-scrim"
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, backdropFilter: "blur(2px)" }}
    >
      <div onClick={(e) => e.stopPropagation()} className={lexGlassStrong} style={panel}>
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ title, sub, onClose, icon }: { title: string; sub?: ReactNode; onClose: () => void; icon?: TfIconName }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "15px 18px", borderBottom: "1px solid var(--border)" }}>
      {icon && (
        <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={icon} size={17} />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={onClose} className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, flexShrink: 0 }}>
        <Icon name="x" size={16} />
      </button>
    </div>
  )
}

// shared field styles for the modals
export const fieldCol: CSSProperties = { display: "flex", flexDirection: "column", gap: 6 }
export const fieldLbl: CSSProperties = { fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }
export const pickerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 7,
  height: 40,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  cursor: "pointer",
  fontSize: 14,
  color: "var(--text)",
}
export const ICON_CHOICES: TfIconName[] = ["building", "gavel", "handshake", "scale", "briefcase", "fileCheck", "userPlus", "folder"]
export const COLOR_CHOICES = ["#1F3A6E", "#2E7D6B", "#C0492F", "#5A4F9A", "#9A6B2E", "#9A2E5A", "#7A8699"]
// Área de prática (a TAG do projeto). O backend guarda a CHAVE (`soc`, `trab`…),
// e a UI resolve o rótulo via o store de AreaDireito. O AREA_OPTIONS estático
// serve de fallback enquanto o store carrega (e é reusado pelo ProjectsTab para
// agrupar pelo rail — já substituído pelo hook useAreaOptions abaixo).
export interface AreaOption {
  id: string
  label: string
  cor?: string | null
}
/** Fallback estático (seed inicial). O hook useAreaOptions() é preferido na UI. */
export const AREA_OPTIONS: AreaOption[] = PROJECTS.filter((p) => !p.inbox).map((p) => ({ id: p.id, label: p.name }))
/** Hook que retorna as áreas ativas do store (reage a reload do admin). */
export function useAreaOptions(): AreaOption[] {
  const areas = useAreasStore((s) => s.areas)
  return useMemo(() => toAreaOptions(areas), [areas])
}
/** Rótulo de exibição via store (hook — use em componentes React). */
export function useAreaLabel(chave: string | null | undefined): string {
  const areas = useAreasStore((s) => s.areas)
  return resolveAreaLabel(areas, chave)
}
/** Rótulo puro (não-hook) — fallback ao valor cru quando a área não está no store. */
export const areaLabel = (value: string | null | undefined): string => {
  if (!value) return ""
  return AREA_OPTIONS.find((a) => a.id === value)?.label ?? value
}
