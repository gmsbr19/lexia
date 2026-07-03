"use client"

// LexIA · CRM — shared UI primitives (Fx* form/layout atoms + Crm* domain atoms),
// ported ~verbatim from the design prototype (fin-ui.jsx + crm-ui.jsx). Styles
// are inline + the `.crm-scope` bridge vars (crm-theme.css). Money is centavos.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { crmMoney, crmInitials } from "./crm-fmt"
import { Icon, type CrmIconName } from "./crm-icons"
import { useModalGuard } from "@/lib/client/modal-guard"
import { lexGlass, lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"

export const CRM_TODAY = (() => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
})()

// ───────────────────────── money / numeric ─────────────────────────
export const FX_NUM: CSSProperties = { fontFeatureSettings: '"tnum"', fontVariantNumeric: "tabular-nums" }

export function FxMoney({
  cents,
  dir,
  size = 13,
  weight = 500,
  plain = false,
}: {
  cents: number
  dir?: "in" | "out"
  size?: number
  weight?: number
  plain?: boolean
}) {
  const neg = dir === "out"
  const color = plain ? "var(--text)" : neg ? "var(--fin-neg, #C0492F)" : "var(--fin-pos, #2E9E5B)"
  const prefix = plain ? "" : neg ? "−" : "+"
  return (
    <span style={{ fontSize: size, fontWeight: weight, color, ...FX_NUM, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
      {prefix}
      {crmMoney(Math.abs(cents)).replace("−", "")}
    </span>
  )
}

// ───────────────────────── status pill ─────────────────────────
type FxStatus = "pago" | "vencido" | "avencer"
const FX_PILL: Record<FxStatus, { bg: string; fg: string; label: string }> = {
  pago: { bg: "rgba(46,158,91,0.10)", fg: "var(--fin-pos, #2E9E5B)", label: "Pago" },
  vencido: { bg: "rgba(192,73,47,0.10)", fg: "var(--fin-neg, #C0492F)", label: "Vencido" },
  avencer: { bg: "var(--bg-sunken)", fg: "var(--text-muted)", label: "A vencer" },
}
export function FxStatusPill({ status }: { status: FxStatus }) {
  const t = FX_PILL[status] || FX_PILL.avencer
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500,
        padding: "3px 9px", borderRadius: 6, background: t.bg, color: t.fg, whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {t.label}
    </span>
  )
}

// ───────────────────────── checkbox ─────────────────────────
export function FxCheck({
  checked,
  indeterminate,
  onChange,
  title,
}: {
  checked?: boolean
  indeterminate?: boolean
  onChange: (e: React.MouseEvent) => void
  title?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : !!checked}
      title={title}
      onClick={(e) => { e.stopPropagation(); onChange(e) }}
      className={`fx-check${checked || indeterminate ? " on" : ""}`}
    >
      {checked && <Icon name="check" size={11} strokeWidth={3.2} />}
      {!checked && indeterminate && <span style={{ width: 8, height: 2, borderRadius: 2, background: "currentColor" }} />}
    </button>
  )
}

// ───────────────────────── direction chip ─────────────────────────
export function FxDirChip({ dir, compact = false }: { dir: "in" | "out"; compact?: boolean }) {
  const inc = dir === "in"
  const c = inc ? "var(--fin-pos,#2E9E5B)" : "var(--fin-neg,#C0492F)"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: c, whiteSpace: "nowrap" }}>
      <span
        style={{
          width: 18, height: 18, borderRadius: 6, background: inc ? "rgba(46,158,91,0.13)" : "rgba(192,73,47,0.13)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Icon name={inc ? "arrowDownRight" : "arrowUpRight"} size={12} strokeWidth={2.2} />
      </span>
      {!compact && (inc ? "A receber" : "A pagar")}
    </span>
  )
}

// ───────────────────────── segmented control ─────────────────────────
export type SegOption = string | { value: string; label: string; icon?: CrmIconName }
export function FxSegmented({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: SegOption[]
  value: string
  onChange: (v: string) => void
  size?: "md" | "sm"
}) {
  const h = size === "sm" ? 28 : 32
  return (
    <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunken)", borderRadius: 8, padding: 3 }}>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value
        const lab = typeof o === "string" ? o : o.label
        const on = val === value
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            style={{
              height: h, padding: "0 13px", borderRadius: 6, border: "none", cursor: "pointer",
              background: on ? "var(--surface)" : "transparent", color: on ? "var(--text)" : "var(--text-muted)",
              fontSize: 12, fontWeight: 500, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em",
              boxShadow: on ? "var(--shadow-sm)" : "none", whiteSpace: "nowrap", flexShrink: 0,
              display: "inline-flex", alignItems: "center", gap: 6, transition: "background .12s",
            }}
          >
            {typeof o !== "string" && o.icon && <Icon name={o.icon} size={13} />}
            {lab}
          </button>
        )
      })}
    </div>
  )
}

// ───────────────────────── tab strip (in-page) ─────────────────────────
export type FxTabDef = { id: string; label: string; icon: CrmIconName; badge?: number | string | null }
export function FxTabs({ tabs, active, onChange }: { tabs: FxTabDef[]; active: string; onChange: (id: string) => void }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "stretch", gap: 0, padding: "0 28px", borderBottom: "1px solid var(--border)",
        background: "var(--bg)", minHeight: 44, flexShrink: 0, overflowX: "auto", scrollbarWidth: "none",
      }}
    >
      {tabs.map((t) => {
        const on = active === t.id
        return (
          <div
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "0 11px", cursor: "pointer", fontSize: 12,
              fontWeight: 500, color: on ? "var(--text)" : "var(--text-muted)", letterSpacing: "-0.01em",
              whiteSpace: "nowrap", flexShrink: 0, borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1,
            }}
          >
            <Icon name={t.icon} size={14} strokeWidth={on ? 2 : 1.75} />
            {t.label}
            {t.badge != null && (
              <span
                style={{
                  fontSize: 11, fontWeight: 500, background: on ? "var(--accent-soft)" : "var(--bg-sunken)",
                  color: on ? "var(--accent)" : "var(--text-subtle)", padding: "1px 6px", borderRadius: 999, ...FX_NUM,
                }}
              >
                {t.badge}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ───────────────────────── page frame + titles ─────────────────────────
export function FxFrame({ children, pad = "24px 40px 48px" }: { children: ReactNode; pad?: string }) {
  return <div style={{ padding: pad, maxWidth: 1240, margin: "0 auto" }}>{children}</div>
}
export function FxCardTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

// ───────────────────────── form fields ─────────────────────────
export function FxLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.01em" }}>{children}</span>
      {hint && <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{hint}</span>}
    </div>
  )
}
export function FxInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="input" style={{ height: 38, fontSize: 14, ...(props.style || {}) }} />
}
export function FxTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="textarea" style={{ fontSize: 14, resize: "vertical", ...(props.style || {}) }} />
}
export function FxSelect({
  options,
  value,
  onChange,
  placeholder,
  ...rest
}: {
  options: (string | { value: string; label: string })[]
  value: string
  onChange: React.ChangeEventHandler<HTMLSelectElement>
  placeholder?: string
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value">) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        {...rest}
        className="input"
        style={{ height: 38, fontSize: 14, appearance: "none", WebkitAppearance: "none", paddingRight: 34, cursor: "pointer" }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value
          const l = typeof o === "string" ? o : o.label
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-subtle)" }}>
        <Icon name="chevronDown" size={15} />
      </div>
    </div>
  )
}

// ───────────────────────── modal shell ─────────────────────────
export function FxModal({
  title,
  sub,
  onClose,
  children,
  footer,
  width = 560,
}: {
  title: ReactNode
  sub?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])
  return (
    <div
      onMouseDown={onClose}
      className="crm-scope"
      style={{
        position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", padding: 24,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`crm-pop-in ${lexGlass}`}
        style={{
          width, maxWidth: "100%", maxHeight: "92%", display: "flex", flexDirection: "column",
          borderRadius: "var(--r-lg)",
          ...glassElevation("0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24)"),
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em" }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{sub}</div>}
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}>
            <Icon name="x" size={17} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto" }}>{children}</div>
        {footer && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)", background: "color-mix(in srgb, var(--bg-soft) 55%, transparent)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── KPI card ─────────────────────────
export type FxKpiProps = {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: CrmIconName
  accent?: "gold"
  tone?: "pos" | "neg"
}
export function FxKpi({ label, value, sub, icon, accent, tone }: FxKpiProps) {
  return (
    <div className="card" style={{ padding: "15px 17px", display: "flex", flexDirection: "column", gap: 9, minHeight: 104 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
        {icon && (
          <div
            style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: accent === "gold" ? "var(--accent-soft)" : "var(--bg-sunken)",
              color: accent === "gold" ? "var(--accent)" : "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name={icon} size={14} strokeWidth={1.8} />
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", ...FX_NUM,
          color: tone === "neg" ? "var(--fin-neg,#C0492F)" : tone === "pos" ? "var(--fin-pos,#2E9E5B)" : "var(--text)",
        }}
      >
        {value}
      </span>
      {sub && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{sub}</span>}
    </div>
  )
}
export function CrmKpiRow({ kpis }: { kpis: FxKpiProps[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 14, marginBottom: 22 }}>
      {kpis.map((k, i) => <FxKpi key={i} {...k} />)}
    </div>
  )
}

// ───────────────────────── avatar ─────────────────────────
export function CrmAvatar({ name, iniciais, size = 34, tipo }: { name?: string; iniciais?: string; size?: number; tipo?: string }) {
  const txt = iniciais || crmInitials(name || "?")
  const isPJ = tipo === "PJ" || tipo === "pj"
  return (
    <div
      style={{
        width: size, height: size, borderRadius: isPJ ? Math.round(size * 0.26) : "50%", flexShrink: 0,
        background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 500, letterSpacing: "-0.02em", border: "1px solid var(--border)",
      }}
    >
      {txt}
    </div>
  )
}

// ───────────────────────── badges ─────────────────────────
export type BadgeTone = "neutral" | "gold" | "pos" | "neg" | "blue"
export function CrmBadge({ children, tone = "neutral", dot }: { children: ReactNode; tone?: BadgeTone; dot?: boolean }) {
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: "var(--bg-sunken)", fg: "var(--text-muted)" },
    gold: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    pos: { bg: "rgba(46,158,91,0.10)", fg: "var(--fin-pos,#2E9E5B)" },
    neg: { bg: "rgba(192,73,47,0.10)", fg: "var(--fin-neg,#C0492F)" },
    blue: { bg: "var(--bg-sunken)", fg: "var(--text-muted)" },
  }
  const t = tones[tone] || tones.neutral
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, padding: "3px 9px",
        borderRadius: 6, background: t.bg, color: t.fg, whiteSpace: "nowrap", letterSpacing: "0.01em",
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
      {children}
    </span>
  )
}
export function CrmTipoBadge({ tipo }: { tipo: string }) {
  return <CrmBadge tone="neutral">{tipo.toUpperCase()}</CrmBadge>
}
export function CrmClasseBadge({ classe }: { classe: string }) {
  return classe === "lead" ? <CrmBadge tone="gold" dot>Lead</CrmBadge> : <CrmBadge tone="pos" dot>Cliente</CrmBadge>
}
export function CrmCasoTipoPill({ tipo }: { tipo: string }) {
  const lit = tipo === "litígio" || tipo === "litigio"
  return <CrmBadge tone={lit ? "neg" : "blue"} dot>{lit ? "Litígio" : "Consultivo"}</CrmBadge>
}
export function CrmContratoStatus({ status, venc }: { status: string | null; venc?: string | null }) {
  if (status === "recebido") return <CrmBadge tone="pos" dot>Recebido</CrmBadge>
  if (venc && venc.slice(0, 10) < CRM_TODAY) return <CrmBadge tone="neg" dot>Vencido</CrmBadge>
  return <CrmBadge tone="neutral" dot>Lançado</CrmBadge>
}

// ───────────────────────── event / task meta ─────────────────────────
export type EvtTipo = "audiencia" | "prazo" | "reuniao" | "outro"
export const CRM_EVT: Record<EvtTipo, { label: string; color: string; soft: string; icon: CrmIconName }> = {
  audiencia: { label: "Audiência", color: "#C0492F", soft: "rgba(192,73,47,0.12)", icon: "gavel" },
  prazo: { label: "Prazo", color: "#C0A147", soft: "rgba(192,161,71,0.16)", icon: "flag" },
  reuniao: { label: "Reunião", color: "#7A8194", soft: "rgba(122,129,148,0.14)", icon: "users" },
  outro: { label: "Outro", color: "#7A8194", soft: "rgba(122,129,148,0.14)", icon: "circleDot" },
}
export const CRM_TASK_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  todo: { label: "A fazer", tone: "neutral" },
  doing: { label: "Fazendo", tone: "blue" },
  review: { label: "Revisão", tone: "gold" },
  done: { label: "Concluída", tone: "pos" },
}
export const CRM_PRIO: Record<string, { label: string; color: string }> = {
  P1: { label: "P1", color: "#C0492F" },
  P2: { label: "P2", color: "#C0A147" },
  P3: { label: "P3", color: "#7A8194" },
  P4: { label: "P4", color: "#7A8194" },
}
/** Accepts P1..P4 or numeric 1..4. */
export function CrmPrioTag({ p }: { p: string | number }) {
  const key = typeof p === "number" ? `P${p}` : p
  const m = CRM_PRIO[key] || CRM_PRIO.P4
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 26, height: 20, padding: "0 6px",
        borderRadius: 6, fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", color: m.color, background: m.color + "1f", ...FX_NUM,
      }}
    >
      {m.label}
    </span>
  )
}

// ───────────────────────── empty state ─────────────────────────
export function CrmEmpty({ icon = "inbox", title, sub, cta }: { icon?: CrmIconName; title: ReactNode; sub?: ReactNode; cta?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "54px 20px", textAlign: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon name={icon} size={18} strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5, maxWidth: 320, lineHeight: 1.5 }}>{sub}</div>}
      {cta && <div style={{ marginTop: 16 }}>{cta}</div>}
    </div>
  )
}

// ───────────────────────── page heading ─────────────────────────
export function CrmPageHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)" }}>{title}</h1>
        {sub && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{sub}</div>}
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}</div>}
    </div>
  )
}

// ───────────────────────── search field ─────────────────────────
export function CrmSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
      <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }}>
        <Icon name="search" size={15} />
      </div>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: 36, height: 40, fontSize: 14, background: "var(--surface)" }}
      />
    </div>
  )
}

// ───────────────────────── clickable row ─────────────────────────
export function CrmRow({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} className="crm-row" style={{ cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  )
}

// ───────────────────────── linked chip ─────────────────────────
export function CrmLink({ children, onClick, icon }: { children: ReactNode; onClick?: () => void; icon?: CrmIconName }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "transparent", color: "var(--accent)",
        fontFamily: "var(--font-sans)", fontSize: "inherit", fontWeight: 500, cursor: "pointer", padding: 0, letterSpacing: "-0.01em",
      }}
    >
      {icon && <Icon name={icon} size={13} />}
      {children}
    </button>
  )
}

// ───────────────────────── toast ─────────────────────────
type ToastTone = "pos" | "neg" | "info"
type ToastItem = { id: string; msg: string; icon: CrmIconName; tone: ToastTone; onClick?: () => void }
type ToastFn = (
  msg: string,
  opts?: { icon?: CrmIconName; tone?: ToastTone; duration?: number; onClick?: () => void },
) => void
const CrmToastCtx = createContext<{ toast: ToastFn }>({ toast: () => {} })
export const useCrmToast = () => useContext(CrmToastCtx)
export function CrmToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const toast = useCallback<ToastFn>((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    setItems((p) => [...p, { id, msg, icon: opts.icon || "checkCircle", tone: opts.tone || "pos", onClick: opts.onClick }])
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), opts.duration || 2600)
  }, [])
  const value = useMemo(() => ({ toast }), [toast])
  return (
    <CrmToastCtx.Provider value={value}>
      {children}
      {/* Center via flexbox (left:0/right:0 + alignItems), NOT a container
          transform — a transform on this ancestor would become the backdrop
          root and break each toast card's backdrop-filter (the page frost). */}
      <div style={{ position: "fixed", bottom: 22, left: 0, right: 0, zIndex: 1500, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none" }}>
        {items.map((t) => (
          <div
            key={t.id}
            className={`crm-toast ${lexGlassStrong}`}
            onClick={t.onClick}
            role={t.onClick ? "button" : undefined}
            tabIndex={t.onClick ? 0 : undefined}
            onKeyDown={t.onClick ? (e) => (e.key === "Enter" || e.key === " ") && t.onClick?.() : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", borderRadius: 10,
              color: "var(--text)",
              fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em", maxWidth: 460, pointerEvents: "auto",
              cursor: t.onClick ? "pointer" : "default",
              ...glassElevation("0 12px 32px rgba(2,13,37,0.18)"),
            }}
          >
            <Icon
              name={t.icon}
              size={16}
              style={{ color: t.tone === "neg" ? "var(--fin-neg, #C0492F)" : t.tone === "info" ? "var(--accent)" : "var(--fin-pos, #1F8A4C)" }}
            />
            {t.msg}
          </div>
        ))}
      </div>
    </CrmToastCtx.Provider>
  )
}
