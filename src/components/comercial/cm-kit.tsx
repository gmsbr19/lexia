"use client"

// LexIA · Comercial — shared UI atoms (ported from the design's com-ui). Styling
// uses the bridged design variables (see cm.css.ts); structural layout stays
// inline to match the prototype 1:1.
import { useEffect } from "react"
import { useModalGuard } from "@/lib/client/modal-guard"
import { Icon, type CmIconName } from "./cm-icons"
import {
  CAMP_STATUSES,
  CM_STAGE_MAP,
  CM_STAGE_PERDIDO,
  CAMPANHA_STATUS_LABEL,
  ORIGEM_COLOR,
  ORIGEM_LABEL,
  PLATAFORMA_COLOR,
  PLATAFORMA_LABEL,
  PLATAFORMA_SHORT,
  cmShiftRef,
  type CmRef,
  type CmScope,
  type Periodo,
} from "./cm-meta"
import type { CampanhaStatus, LeadEtapa, LeadOrigem, Plataforma } from "@/lib/comercial/types"

const POS = "var(--cm-pos,#2E9E5B)"
const NEG = "var(--cm-neg,#C0492F)"

// ── delta badge ──────────────────────────────────────────────────────────────
export function CmDelta({ value, invert = false, suffix = "%" }: { value: number | null; invert?: boolean; suffix?: string }) {
  if (value == null) return <span style={{ fontSize: 12, color: "var(--text-subtle)", fontWeight: 500 }}>novo</span>
  const flat = Math.abs(value) < 0.05
  const up = value > 0
  const good = invert ? !up : up
  const color = flat ? "var(--text-subtle)" : good ? POS : NEG
  const txt = `${up ? "+" : "−"}${Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: value % 1 === 0 ? 0 : 1 })}${suffix}`
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 500, color, fontFeatureSettings: '"tnum"', whiteSpace: "nowrap" }}>
      {!flat && <Icon name={up ? "trendingUp" : "trendingDown"} size={12} strokeWidth={2.2} />}
      {flat ? "—" : txt}
    </span>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────
export function CmKpi({
  label, value, delta, deltaInvert, suffix, sub, icon, accent, tone, big,
}: {
  label: string
  value: string
  delta?: number | null
  deltaInvert?: boolean
  suffix?: string
  sub?: string
  icon?: CmIconName
  accent?: "gold"
  tone?: "pos" | "neg"
  big?: boolean
}) {
  return (
    <div className="card" style={{ padding: "15px 17px", display: "flex", flexDirection: "column", gap: 8, minHeight: 108 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
        {icon && (
          <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: accent === "gold" ? "var(--accent-soft)" : "var(--bg-sunken)", color: accent === "gold" ? "var(--accent)" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={14} strokeWidth={1.8} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", fontFeatureSettings: '"tnum"', lineHeight: 1.05, color: tone === "neg" ? NEG : tone === "pos" ? POS : "var(--text)" }}>{value}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: "auto" }}>
        {delta !== undefined && <CmDelta value={delta} invert={deltaInvert} suffix={suffix} />}
        {sub && <span style={{ fontSize: 11, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>}
      </div>
    </div>
  )
}

// ── chips / pills ────────────────────────────────────────────────────────────
export function CmOriginChip({ origem, compact }: { origem: LeadOrigem; compact?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: ORIGEM_COLOR[origem], flexShrink: 0 }} />
      {!compact && ORIGEM_LABEL[origem]}
    </span>
  )
}

export function CmPlatformBadge({ plataforma }: { plataforma: Plataforma }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--text)", background: "var(--bg-sunken)", padding: "3px 10px 3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: PLATAFORMA_COLOR[plataforma], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 500, flexShrink: 0 }}>{PLATAFORMA_SHORT[plataforma]}</span>
      {PLATAFORMA_LABEL[plataforma]}
    </span>
  )
}

export function CmStagePill({ etapa }: { etapa: LeadEtapa }) {
  const s = etapa === "perdido" ? CM_STAGE_PERDIDO : CM_STAGE_MAP[etapa] ?? CM_STAGE_PERDIDO
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, padding: "3px 9px 3px 8px", borderRadius: 6, color: s.color, background: `${s.color}1f`, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

export function CmStatusChip({ status }: { status: CampanhaStatus }) {
  const map: Record<CampanhaStatus, { c: string; bg: string }> = {
    ativa: { c: "#2E9E5B", bg: "rgba(46,158,91,0.12)" },
    pausada: { c: "#C0A147", bg: "rgba(192,161,71,0.12)" },
    encerrada: { c: "var(--text-subtle)", bg: "var(--bg-sunken)" },
  }
  const { c, bg } = map[status] ?? map.encerrada
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, padding: "3px 9px 3px 8px", borderRadius: 6, color: c, background: bg, whiteSpace: "nowrap" }}>
      <span className={status === "ativa" ? "pulse" : undefined} style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
      {CAMPANHA_STATUS_LABEL[status]}
    </span>
  )
}

// ── segmented control ────────────────────────────────────────────────────────
type SegOption = string | { value: string; label: string; icon?: CmIconName }
export function CmSegmented({ options, value, onChange, size = "md" }: { options: SegOption[]; value: string; onChange: (v: string) => void; size?: "sm" | "md" }) {
  const h = size === "sm" ? 28 : 32
  return (
    <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunken)", borderRadius: 10, padding: 3 }}>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value
        const lab = typeof o === "string" ? o : o.label
        const on = val === value
        return (
          <button key={val} onClick={() => onChange(val)} style={{ height: h, padding: "0 13px", borderRadius: 8, border: "none", cursor: "pointer", background: on ? "var(--surface)" : "transparent", color: on ? "var(--text)" : "var(--text-muted)", fontSize: 12, fontWeight: 500, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em", boxShadow: on ? "var(--shadow-sm)" : "none", display: "inline-flex", alignItems: "center", gap: 6, transition: "background .12s" }}>
            {typeof o !== "string" && o.icon && <Icon name={o.icon} size={13} />}
            {lab}
          </button>
        )
      })}
    </div>
  )
}

// ── tabs ─────────────────────────────────────────────────────────────────────
export interface CmTabDef { id: string; label: string; icon: CmIconName; badge?: number | null }
export function CmTabs({ tabs, active, onChange }: { tabs: CmTabDef[]; active: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 0, padding: "0 40px", borderBottom: "1px solid var(--border)", background: "var(--bg)", minHeight: 44, flexShrink: 0, overflowX: "auto" }}>
      {tabs.map((t) => {
        const on = active === t.id
        return (
          <div key={t.id} onClick={() => onChange(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14, fontWeight: 500, color: on ? "var(--text)" : "var(--text-muted)", letterSpacing: "-0.01em", borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1 }}>
            <Icon name={t.icon} size={15} strokeWidth={on ? 2 : 1.75} />
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span style={{ fontSize: 11, fontWeight: 500, background: on ? "var(--accent-soft)" : "var(--bg-sunken)", color: on ? "var(--accent)" : "var(--text-subtle)", padding: "1px 6px", borderRadius: 999, fontFeatureSettings: '"tnum"' }}>{t.badge}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── period bar ───────────────────────────────────────────────────────────────
export function CmPeriodBar({ ref0, setRef, period, setPeriod, scope }: { ref0: CmRef; setRef: (r: CmRef) => void; period: Periodo; setPeriod: (p: Periodo) => void; scope: CmScope }) {
  const shift = (d: number) => setRef(cmShiftRef(ref0, period, d))
  const now = new Date()
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 40px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)", flexShrink: 0, flexWrap: "wrap", rowGap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button className="btn btn-ghost" onClick={() => shift(-1)} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="chevronLeft" size={16} /></button>
        <div style={{ minWidth: 150, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>{scope.title}</div>
          <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{scope.sub}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => shift(1)} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="chevronRight" size={16} /></button>
      </div>
      <button className="btn btn-secondary" onClick={() => setRef({ y: now.getFullYear(), m: now.getMonth() })} style={{ height: 30, fontSize: 12, padding: "0 11px" }}>Hoje</button>
      <CmSegmented size="sm" value={period} onChange={(v) => setPeriod(v as Periodo)} options={[{ value: "mes", label: "Mês" }, { value: "trimestre", label: "Trimestre" }, { value: "ano", label: "Ano" }]} />
    </div>
  )
}

// ── frame / titles / empty ───────────────────────────────────────────────────
export function CmFrame({ children, pad = "24px 40px 56px" }: { children: React.ReactNode; pad?: string }) {
  return <div style={{ padding: pad, maxWidth: 1280, margin: "0 auto" }}>{children}</div>
}
export function CmCardTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}
export function CmEmpty({ icon = "inbox", title, desc, action }: { icon?: CmIconName; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 24px", gap: 10 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--bg-sunken)", color: "var(--text-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={24} strokeWidth={1.6} /></div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 320, lineHeight: 1.5 }}>{desc}</div>}
      {action}
    </div>
  )
}

// ── form fields ──────────────────────────────────────────────────────────────
export function CmLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.01em" }}>{children}</span>
      {hint && <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{hint}</span>}
    </div>
  )
}
export function CmField({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  return <div>{label && <CmLabel hint={hint}>{label}</CmLabel>}{children}</div>
}
export function CmInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="input" style={{ height: 38, fontSize: 14, ...(props.style || {}) }} />
}
type SelOption = string | { value: string; label: string }
export function CmSelect({ options, value, onChange, placeholder, disabled, style }: { options: SelOption[]; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; placeholder?: string; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange} disabled={disabled} className="input" style={{ height: 38, fontSize: 14, appearance: "none", WebkitAppearance: "none", paddingRight: 34, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-subtle)" }}><Icon name="chevronDown" size={15} /></div>
    </div>
  )
}
export function CmMoneyInput({ value, onChange, placeholder = "0,00" }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>R$</span>
      <CmInput value={value} onChange={onChange} placeholder={placeholder} inputMode="decimal" style={{ paddingLeft: 36, fontFamily: "var(--font-mono)" }} />
    </div>
  )
}

// ── modal (slide-in from the right) ──────────────────────────────────────────
export function CmModal({ title, sub, onClose, children, footer, width = 580 }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "stretch", justifyContent: "flex-end", background: "transparent" }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="cm-slidein" style={{ width, maxWidth: "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--lex-acrylic)", backdropFilter: "var(--lex-blur)", WebkitBackdropFilter: "var(--lex-blur)", boxShadow: "-14px 0 60px rgba(2,13,37,0.30)", borderLeft: "1px solid var(--lex-acrylic-border)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em" }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{sub}</div>}
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="x" size={17} /></button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)", background: "color-mix(in srgb, var(--bg-soft) 55%, transparent)", flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  )
}

// ── table helpers ────────────────────────────────────────────────────────────
export function CmTh({ children, align = "left", w }: { children?: React.ReactNode; align?: "left" | "right"; w?: number }) {
  return <th style={{ textAlign: align, padding: "11px 14px", fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap", width: w }}>{children}</th>
}
export function CmNum({ children, color = "var(--text)", weight = 500, size = 12 }: { children: React.ReactNode; color?: string; weight?: number; size?: number }) {
  return <span style={{ fontFamily: "var(--font-mono)", fontFeatureSettings: '"tnum"', fontSize: size, fontWeight: weight, color, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{children}</span>
}

export { CAMP_STATUSES }
