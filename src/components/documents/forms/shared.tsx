"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Check } from "lucide-react"
import { tokens } from "@/styles/tokens.css"

// ── date utilities ─────────────────────────────────────────────────────────────

export const MESES = [
  "janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro",
]

export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function isoToExtensa(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-").map(Number)
  return `${d} de ${MESES[m - 1]} de ${y}`
}

// ── address ────────────────────────────────────────────────────────────────────

export interface AddrState {
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

export const emptyAddr: AddrState = {
  logradouro: "", numero: "", complemento: "",
  bairro: "", cidade: "", uf: "", cep: "",
}

export function composeEndereco(a: AddrState): string {
  const parts: string[] = []
  if (a.logradouro) parts.push(a.logradouro)
  if (a.numero) parts.push(`nº ${a.numero}`)
  if (a.complemento) parts.push(a.complemento)
  if (a.bairro) parts.push(a.bairro)
  const cidadeUf = [a.cidade, a.uf].filter(Boolean).join("/")
  if (cidadeUf) parts.push(cidadeUf)
  if (a.cep) parts.push(`CEP ${a.cep}`)
  return parts.join(", ")
}

// ── constants ──────────────────────────────────────────────────────────────────

export const ESTADOS_CIVIS: Record<string, string[]> = {
  masculino: ["solteiro","casado","separado judicialmente","divorciado","viúvo","em união estável"],
  feminino:  ["solteira","casada","separada judicialmente","divorciada","viúva","em união estável"],
}

// ── style primitives ───────────────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 34,
  paddingLeft: 10,
  paddingRight: 10,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: tokens.radius.sm,
  fontFamily: tokens.font.sans,
  fontSize: "13px",
  color: tokens.color.text,
  outline: "none",
  boxSizing: "border-box",
}

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.textMuted,
  marginBottom: 5,
  letterSpacing: "0.01em",
}

// ── form components ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  suffix?: string
  type?: string
  aiSuggested?: boolean
}

export function FormField({ label, value, onChange, placeholder, hint, suffix, type, aiSuggested }: FieldProps) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {aiSuggested && (
          <span style={{
            marginLeft: 6, fontSize: "10px", fontWeight: 600,
            padding: "1px 5px", borderRadius: 4,
            background: tokens.color.accentSoft, color: tokens.color.accent,
          }}>IA</span>
        )}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type ?? "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            paddingRight: suffix ? 52 : 10,
            border: aiSuggested
              ? `1px solid ${tokens.color.accent}`
              : `1px solid ${tokens.color.borderStrong}`,
          }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: tokens.color.textSubtle, fontFamily: tokens.font.mono }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: tokens.color.textSubtle, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function SelectField({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, paddingRight: 28, appearance: "none", cursor: "pointer", color: value ? tokens.color.text : tokens.color.textSubtle } as React.CSSProperties}
        >
          <option value="">Selecione...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={12} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: tokens.color.textSubtle, pointerEvents: "none" }} />
      </div>
    </div>
  )
}

export function TextAreaField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          width: "100%", padding: "8px 10px",
          background: tokens.color.surface,
          border: `1px solid ${tokens.color.borderStrong}`,
          borderRadius: tokens.radius.sm,
          fontFamily: tokens.font.sans, fontSize: "13px",
          color: tokens.color.text, outline: "none",
          resize: "vertical", lineHeight: 1.5, boxSizing: "border-box",
        }}
      />
      {hint && <div style={{ fontSize: 11, color: tokens.color.textSubtle, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function TogglePill({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: "inline-flex", background: tokens.color.bgSunken, borderRadius: tokens.radius.sm, padding: 2, gap: 2 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "4px 12px", borderRadius: 4, border: "none", cursor: "pointer",
            fontSize: "12px", fontWeight: 500, fontFamily: tokens.font.sans,
            background: value === o.value ? tokens.color.surface : "transparent",
            color: value === o.value ? tokens.color.text : tokens.color.textMuted,
            boxShadow: value === o.value ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.1s",
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}

export function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {children}
    </div>
  )
}

export function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: tokens.color.border }} />
      <span style={{ fontSize: "10.5px", color: tokens.color.textSubtle, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: tokens.color.border }} />
    </div>
  )
}

export function FormSection({ title, number, complete, open, children }: {
  title: string; number: number; complete?: boolean; open?: boolean; children?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(!!open)
  return (
    <div style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0,
          borderTopStyle: "solid", borderLeftStyle: "solid", borderRightStyle: "solid",
          borderBottomStyle: "solid",
          borderBottomWidth: expanded ? 1 : 0,
          borderBottomColor: tokens.color.border,
          width: "100%", background: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          background: complete ? tokens.color.accent : expanded ? tokens.color.text : tokens.color.bgSunken,
          color: complete || expanded ? tokens.color.bg : tokens.color.textSubtle,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600,
        }}>
          {complete ? <Check size={10} strokeWidth={2.5} /> : number}
        </div>
        <div style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, color: tokens.color.text }}>{title}</div>
        {expanded ? <ChevronDown size={14} color={tokens.color.textSubtle} /> : <ChevronRight size={14} color={tokens.color.textSubtle} />}
      </button>
      {expanded && children && (
        <div style={{ padding: "16px 14px", display: "grid", gap: 12 }}>{children}</div>
      )}
    </div>
  )
}

export function AddressForm({ addr, onChange }: {
  addr: AddrState
  onChange: (field: keyof AddrState, val: string) => void
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: "10.5px", fontWeight: 600, color: tokens.color.textSubtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Endereço
      </div>
      <FormField label="Logradouro" value={addr.logradouro} onChange={(v) => onChange("logradouro", v)} placeholder="Rua, Av., Alameda..." />
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10 }}>
        <FormField label="Número" value={addr.numero} onChange={(v) => onChange("numero", v)} placeholder="123" />
        <FormField label="Complemento" value={addr.complemento} onChange={(v) => onChange("complemento", v)} placeholder="Apto 45, Sala 3..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
        <FormField label="Bairro" value={addr.bairro} onChange={(v) => onChange("bairro", v)} placeholder="Jardins" />
        <FormField label="CEP" value={addr.cep} onChange={(v) => onChange("cep", v)} placeholder="00000-000" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 56px", gap: 10 }}>
        <FormField label="Cidade" value={addr.cidade} onChange={(v) => onChange("cidade", v)} placeholder="São Paulo" />
        <FormField label="UF" value={addr.uf} onChange={(v) => onChange("uf", v.toUpperCase().slice(0, 2))} placeholder="SP" />
      </div>
    </div>
  )
}
