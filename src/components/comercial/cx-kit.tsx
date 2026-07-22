"use client"

// LexIA · Comercial v2 — shared UI primitives (prefixed Cx), ported faithfully
// from the Claude Design handoff "LexIA - Comercial v2" (src/com2/cx-ui.jsx +
// cx-store.jsx metas), adapted to the real data layer: usuarios come from the
// CmDataset, stages from usePipelineStore, áreas from useAreasStore, and the
// qualification state is the real Estado A/B/C/D from score.ts.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { Icon, type CmIconName } from "./cm-icons"
import { useModalGuard } from "@/lib/client/modal-guard"
import { lexGlass, lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { resolveEtapaColor, resolveEtapaLabel, usePipelineStore } from "@/lib/comercial/pipeline/store"
import type { Estado } from "@/lib/comercial/score"
import type { CmRef, CmScope, Periodo } from "./cm-meta"
import { cmShiftRef, cmRefToday } from "./cm-meta"
import type { CmUsuarioOption } from "@/lib/comercial/types"

// ---- taxonomies (visual metas of the v2 design) ----
export const CX_QUAL: Record<Estado, { key: Estado; label: string; color: string; icon: CmIconName }> = {
  A: { key: "A", label: "Quente", color: "#C0492F", icon: "flame" },
  B: { key: "B", label: "Morno", color: "#C0A147", icon: "sunrise" },
  C: { key: "C", label: "Frio", color: "#4A78C0", icon: "wifiOff" },
  D: { key: "D", label: "Desqualificado", color: "var(--text-subtle)", icon: "minusCircle" },
}
export const CX_TEMPERATURAS = [
  { key: "quente", label: "Quente", color: "#C0492F" },
  { key: "morno", label: "Morno", color: "#C0A147" },
  { key: "frio", label: "Frio", color: "#4A78C0" },
]
export const CX_TEMP_MAP = Object.fromEntries(CX_TEMPERATURAS.map((t) => [t.key, t]))
export const CX_CANAIS: { key: string; label: string; icon: CmIconName }[] = [
  { key: "ligacao", label: "Ligação", icon: "phone" },
  { key: "whatsapp", label: "WhatsApp", icon: "send" },
  { key: "email", label: "E-mail", icon: "mail" },
  { key: "reuniao", label: "Reunião", icon: "calendar" },
  { key: "outro", label: "Outro", icon: "circleDot" },
]
export const CX_CANAL_MAP = Object.fromEntries(CX_CANAIS.map((c) => [c.key, c]))
export const CX_RESULTADOS: { key: string; label: string; color: string; icon: CmIconName }[] = [
  { key: "sem_resposta", label: "Sem resposta", color: "var(--text-subtle)", icon: "minusCircle" },
  { key: "fria", label: "Fria", color: "#C0A147", icon: "thumbsDown" },
  { key: "positiva", label: "Positiva", color: "#2E9E5B", icon: "thumbsUp" },
]
export const CX_RESULTADO_MAP = Object.fromEntries(CX_RESULTADOS.map((r) => [r.key, r]))
export const CX_ATIV_TIPOS: { key: string; label: string; icon: CmIconName }[] = [
  { key: "ligacao", label: "Ligação", icon: "phone" },
  { key: "whatsapp", label: "WhatsApp", icon: "send" },
  { key: "email", label: "E-mail", icon: "mail" },
  { key: "reuniao", label: "Reunião", icon: "calendar" },
  { key: "nota", label: "Nota", icon: "edit" },
  { key: "outro", label: "Outro", icon: "zap" },
]
export const CX_ATIV_MAP = Object.fromEntries(CX_ATIV_TIPOS.map((t) => [t.key, t]))

// ---- date helpers (relative-day labels of the v2 design) ----
export function cxToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
export function cxDaysTo(iso: string | null | undefined, today = cxToday()): number | null {
  if (!iso) return null
  return Math.round((new Date(iso.slice(0, 10) + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) / 86400000)
}
export function cxRelDay(iso: string | null | undefined, today = cxToday()): string {
  const d = cxDaysTo(iso, today)
  if (d == null) return "—"
  if (d === 0) return "hoje"
  if (d === 1) return "amanhã"
  if (d === -1) return "ontem"
  if (d < 0) return `há ${-d} dias`
  return `em ${d} dias`
}

// ---- clipboard with legacy fallback ----
export function cxCopy(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text)
      return
    }
  } catch { /* fall through */ }
  try {
    const t = document.createElement("textarea")
    t.value = text
    t.style.position = "fixed"
    t.style.opacity = "0"
    document.body.appendChild(t)
    t.select()
    document.execCommand("copy")
    t.remove()
  } catch { /* ignore */ }
}

// ---- person avatar (deterministic color per user id) ----
const CX_AVATAR_COLORS = ["#C0A147", "#4A78C0", "#9A6FB0", "#2E9E5B", "#4F9E8F", "#C0492F"]
function cxIniciais(nome: string): string {
  const words = nome.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
export function cxUserColor(id: number): string {
  return CX_AVATAR_COLORS[Math.abs(id) % CX_AVATAR_COLORS.length]
}
export function CxAvatar({ id, nome, size = 24 }: { id: number | null; nome?: string | null; size?: number }) {
  if (id == null || !nome) {
    return (
      <span title="Sem responsável" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, border: "1.5px dashed var(--border-strong)", color: "var(--text-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="user" size={size * 0.5} />
      </span>
    )
  }
  const cor = cxUserColor(id)
  return (
    <span title={nome} style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: cor + "26", color: cor, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, fontWeight: 600, letterSpacing: "-0.02em" }}>{cxIniciais(nome)}</span>
  )
}
export function CxOwner({ id, usuarios, muted }: { id: number | null; usuarios: CmUsuarioOption[]; muted?: boolean }) {
  const nome = id != null ? usuarios.find((u) => u.id === id)?.nome ?? null : null
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <CxAvatar id={id} nome={nome} size={22} />
      <span style={{ fontSize: 12.5, fontWeight: 500, color: nome ? (muted ? "var(--text-muted)" : "var(--text)") : "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome ?? "Sem responsável"}</span>
    </span>
  )
}

// ---- qualification badge (Quente / Morno / Frio / Desqualificado) ----
export function CxQualBadge({ state, size = "md" }: { state: Estado; size?: "sm" | "md" }) {
  const q = CX_QUAL[state] ?? CX_QUAL.C
  const sm = size === "sm"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: sm ? 4 : 5, height: sm ? 20 : 23, padding: sm ? "0 7px" : "0 9px", borderRadius: 6, fontSize: sm ? 11 : 12, fontWeight: 600, letterSpacing: "-0.01em", color: q.color, background: q.color.startsWith("var") ? "var(--bg-sunken)" : q.color + "1c", whiteSpace: "nowrap" }}>
      <Icon name={q.icon} size={sm ? 11 : 12.5} strokeWidth={2} />{q.label}
    </span>
  )
}

// ---- dual-axis score meter (fit / engajamento) ----
export function CxMeter({ label, value, tone = "gold", w = 46 }: { label: string; value: number; tone?: "gold" | "blue"; w?: number }) {
  const col = tone === "blue" ? "#4A78C0" : "var(--accent-strong)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-subtle)", width: 26, flexShrink: 0 }}>{label}</span>
      <div style={{ width: w, height: 5, borderRadius: 3, background: "var(--bg-sunken)", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${value}%`, height: "100%", borderRadius: 3, background: col }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, color: "var(--text)", width: 20, textAlign: "right", fontFeatureSettings: '"tnum"' }}>{value}</span>
    </div>
  )
}

// ---- origin / platform / stage / temperature / status ----
export function CxOriginChip({ label, color, compact }: { label: string; color: string; compact?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flexShrink: 0 }} />{!compact && label}
    </span>
  )
}
export function CxPlatformMark({ plataforma, size = 26 }: { plataforma: string; size?: number }) {
  const google = plataforma === "google_ads" || plataforma === "Google Ads"
  const c = google ? "#3B7DDD" : "#8B5CF6"
  return <span style={{ width: size, height: size, borderRadius: size * 0.3, background: c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.46, fontWeight: 800, flexShrink: 0 }}>{google ? "G" : "M"}</span>
}
export function CxStagePill({ etapa }: { etapa: string }) {
  const stages = usePipelineStore((s) => s.stages)
  const label = resolveEtapaLabel(stages, etapa)
  const color = resolveEtapaColor(stages, etapa) ?? "#7C8AA5"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 500, padding: "3px 9px 3px 8px", borderRadius: 6, color, background: color + "20", whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />{label}
    </span>
  )
}
export function CxTempDot({ temp, showLabel }: { temp: string | null; showLabel?: boolean }) {
  const t = (temp && CX_TEMP_MAP[temp]) || CX_TEMP_MAP.frio
  return (
    <span title={`Temperatura: ${t.label}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: showLabel ? "var(--text)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: t.color, flexShrink: 0, boxShadow: `0 0 0 3px ${t.color}22` }} />{showLabel && t.label}
    </span>
  )
}
export function CxStatusChip({ status, label }: { status: string; label: string }) {
  const map: Record<string, string> = { ativa: "#2E9E5B", pausada: "#C0A147", encerrada: "var(--text-subtle)" }
  const c = map[status] ?? map.encerrada
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 500, color: c, whiteSpace: "nowrap" }}>
      <span className={status === "ativa" ? "pulse" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />{label}
    </span>
  )
}

// ---- phone with copy-to-clipboard ----
export function CxPhone({ value, size = 12, color = "var(--text-muted)" }: { value: string | null; size?: number; color?: string }) {
  const [done, setDone] = useState(false)
  if (!value) return <span style={{ fontSize: size, color: "var(--text-subtle)" }}>—</span>
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    cxCopy(value)
    setDone(true)
    setTimeout(() => setDone(false), 1300)
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: size, color, fontFeatureSettings: '"tnum"' }}>{value}</span>
      <button onClick={copy} className="cx-copybtn" title={done ? "Copiado!" : "Copiar telefone"} style={{ width: 22, height: 22, padding: 0, border: "none", background: "transparent", borderRadius: 6, cursor: "pointer", color: done ? "#2E9E5B" : "var(--text-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={done ? "check" : "copy"} size={12.5} /></button>
    </span>
  )
}

// ---- channel icon row ----
export function CxCanalIcons({ canais, size = 13 }: { canais: string[] | null | undefined; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {(canais ?? []).map((k) => {
        const c = CX_CANAL_MAP[k]
        return c ? <Icon key={k} name={c.icon} size={size} style={{ color: "var(--text-muted)" }} /> : null
      })}
    </span>
  )
}

// ---- segmented control ----
export function CxSegmented({ options, value, onChange, size = "md" }: {
  options: ({ value: string; label: string; icon?: CmIconName } | string)[]
  value: string
  onChange: (v: string) => void
  size?: "sm" | "md"
}) {
  const h = size === "sm" ? 30 : 34
  return (
    <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunken)", borderRadius: 9, padding: 3 }}>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value
        const lab = typeof o === "string" ? o : o.label
        const on = val === value
        return (
          <button key={val} onClick={() => onChange(val)} style={{
            height: h, padding: "0 13px", borderRadius: 7, border: "none", cursor: "pointer",
            background: on ? "var(--surface)" : "transparent", color: on ? "var(--text)" : "var(--text-muted)",
            fontSize: 12.5, fontWeight: on ? 600 : 500, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em",
            boxShadow: on ? "var(--shadow-sm)" : "none", display: "inline-flex", alignItems: "center", gap: 6, transition: "background .12s",
          }}>{typeof o !== "string" && o.icon && <Icon name={o.icon} size={14} />}{lab}</button>
        )
      })}
    </div>
  )
}

// ---- checkbox (tri-state) — custom-drawn on the app tokens (gold fill +
// navy check, ring on focus), instead of the browser-native accentColor ----
export function CxCheckbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  const on = checked || !!indeterminate
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      onClick={onChange}
      className="cx-checkbox"
      style={{
        width: 16, height: 16, padding: 0, flexShrink: 0, cursor: "pointer",
        borderRadius: 5, border: `1.5px solid ${on ? "var(--accent-strong)" : "var(--border-strong)"}`,
        background: on ? "var(--accent-strong)" : "var(--surface)", color: "var(--brand-navy)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "background .12s, border-color .12s",
      }}
    >
      {indeterminate ? <span style={{ width: 8, height: 2, borderRadius: 1, background: "currentColor" }} /> : checked && <Icon name="check" size={11} strokeWidth={3.2} />}
    </button>
  )
}

// ---- empty state ----
export function CxEmpty({ icon = "inbox", title, desc, action }: { icon?: CmIconName; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px", gap: 11 }}>
      <div style={{ width: 54, height: 54, borderRadius: 15, background: "var(--bg-sunken)", color: "var(--text-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={25} strokeWidth={1.6} /></div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: "var(--text-muted)", maxWidth: 340, lineHeight: 1.55 }}>{desc}</div>}
      {action}
    </div>
  )
}

// ---- form fields ----
export function CxLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.01em" }}>{children}</span>
      {hint && <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{hint}</span>}
    </div>
  )
}
export function CxField({ label, hint, children }: { label?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return <div>{label && <CxLabel hint={hint}>{label}</CxLabel>}{children}</div>
}
export function CxInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="input" style={{ height: 38, fontSize: 14, ...(props.style ?? {}) }} />
}
export function CxTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="textarea" style={{ fontSize: 14, minHeight: 72, ...(props.style ?? {}) }} />
}
export function CxSelect({ options, value, onChange, placeholder, disabled, style }: {
  options: ({ value: string; label: string } | string)[]
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  placeholder?: string
  disabled?: boolean
  style?: CSSProperties
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange} disabled={disabled} className="input" style={{ height: 38, fontSize: 14, appearance: "none", WebkitAppearance: "none", paddingRight: 34, cursor: "pointer", ...(style ?? {}) }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-subtle)" }}><Icon name="chevronDown" size={15} /></div>
    </div>
  )
}
export function CxMoneyInput({ value, onChange, placeholder = "0,00" }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-subtle)", fontFamily: "var(--font-mono)", zIndex: 1 }}>R$</span>
      <CxInput value={value} onChange={onChange} placeholder={placeholder} inputMode="decimal" style={{ paddingLeft: 36, fontFamily: "var(--font-mono)" }} />
    </div>
  )
}
// radio-list single select (used for loss reasons etc.)
export function CxRadioList({ options, value, onChange, accent = "var(--accent-strong)" }: {
  options: ({ value: string; label: string } | string)[]
  value: string
  onChange: (v: string) => void
  accent?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value
        const lab = typeof o === "string" ? o : o.label
        const on = value === val
        return (
          <button key={val} onClick={() => onChange(val)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 13px", textAlign: "left", borderRadius: "var(--r-sm)", cursor: "pointer", border: `1px solid ${on ? accent : "var(--border)"}`, background: on ? "var(--accent-soft)" : "var(--surface)" }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `2px solid ${on ? accent : "var(--border-strong)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />}</span>
            <span style={{ fontSize: 13, color: "var(--text)", fontWeight: on ? 600 : 400 }}>{lab}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---- centered modal ----
export function CxModal({ title, sub, icon, onClose, children, footer, width = 580 }: {
  title: ReactNode
  sub?: ReactNode
  icon?: CmIconName
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px", background: "transparent" }}>
      {/* app-standard glass surface (shared lexGlass recipe + per-surface elevation) */}
      <div onMouseDown={(e) => e.stopPropagation()} className={`cx-pop ${lexGlass}`} style={{ width, maxWidth: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", borderRadius: "var(--r-lg)", overflow: "hidden", ...glassElevation("0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24)") }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "18px 22px 15px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {icon && <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={17} /></div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.02em" }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="x" size={17} /></button>
        </div>
        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "13px 22px", borderTop: "1px solid var(--border)", background: "color-mix(in srgb, var(--bg-soft) 55%, transparent)", flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  )
}

// ---- table header cell ----
export function CxTh({ children, align = "left", w, onClick, sort }: {
  children?: ReactNode
  align?: "left" | "right"
  w?: number | string
  onClick?: () => void
  sort?: "asc" | "desc"
}) {
  return (
    <th onClick={onClick} style={{ textAlign: align, padding: "10px 13px", fontSize: 11, fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", width: w, cursor: onClick ? "pointer" : "default", userSelect: "none" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {children}
        {sort && <Icon name="chevronDown" size={12} style={{ transform: sort === "asc" ? "rotate(180deg)" : "none", color: "var(--accent)" }} />}
      </span>
    </th>
  )
}

// ---- mono number ----
export function CxNum({ children, color = "var(--text)", weight = 600, size = 12.5 }: { children: ReactNode; color?: string; weight?: number; size?: number }) {
  return <span style={{ fontFamily: "var(--font-mono)", fontFeatureSettings: '"tnum"', fontSize: size, fontWeight: weight, color, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{children}</span>
}

// ---- dropdown menu wrapper ----
export function CxMenu({ trigger, children, align = "right", minWidth = 190 }: {
  trigger: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: "left" | "right"
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}>{trigger}</span>
      {open && (
        <>
          <div onClick={(e) => { e.stopPropagation(); setOpen(false) }} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          {/* app-standard glass popup (shared lexGlassStrong recipe) */}
          <div className={`card ${lexGlassStrong}`} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", [align]: 0, top: "calc(100% + 4px)", zIndex: 41, minWidth, padding: 6, ...glassElevation("0 12px 28px rgba(2,13,37,0.16)") }}>
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </div>
        </>
      )}
    </div>
  )
}
export function CxMenuItem({ icon, children, onClick, tone, danger }: { icon?: CmIconName; children: ReactNode; onClick?: () => void; tone?: string; danger?: boolean }) {
  return <button className="cx-menu-item" onClick={onClick} style={{ color: danger ? "var(--crit)" : tone ?? "var(--text)" }}>{icon && <Icon name={icon} size={13} />}{children}</button>
}

// ---- period bar (Campanhas) ----
export function CxPeriodBar({ ref0, setRef, period, setPeriod, scopeLabel, right }: {
  ref0: CmRef
  setRef: (r: CmRef) => void
  period: Periodo
  setPeriod: (p: Periodo) => void
  scopeLabel: CmScope
  right?: ReactNode
}) {
  const shift = (d: number) => setRef(cmShiftRef(ref0, period, d))
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", rowGap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button className="btn btn-ghost" onClick={() => shift(-1)} style={{ width: 32, height: 32, padding: 0, borderRadius: 8 }}><Icon name="chevronLeft" size={16} /></button>
        <div style={{ minWidth: 148, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>{scopeLabel.title}</div>
          <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{scopeLabel.sub}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => shift(1)} style={{ width: 32, height: 32, padding: 0, borderRadius: 8 }}><Icon name="chevronRight" size={16} /></button>
      </div>
      <button className="btn btn-secondary" onClick={() => setRef(cmRefToday())} style={{ height: 32, fontSize: 12, padding: "0 12px" }}>Atual</button>
      <CxSegmented options={[{ value: "mes", label: "Mês" }, { value: "trimestre", label: "Trimestre" }, { value: "ano", label: "Ano" }]} value={period} onChange={(v) => setPeriod(v as Periodo)} size="sm" />
      {right}
    </div>
  )
}
