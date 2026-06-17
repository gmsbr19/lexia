"use client"

import { ChevronDown, Check, Sparkles } from "lucide-react"
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

import * as fieldStyles from "./Fields.css"

export const inputStyle: React.CSSProperties = {}

export const labelStyle: React.CSSProperties = {}

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
    <div className={fieldStyles.stackedField}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <label className={fieldStyles.label}>{label}</label>
        {aiSuggested && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: "10px", fontWeight: 500, color: tokens.color.accent,
            padding: "1px 5px", borderRadius: 6,
            background: tokens.color.accentSoft, letterSpacing: "0.04em",
          }}>
            <Sparkles size={8} strokeWidth={2.4} />
            IA
          </span>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <input
          className={fieldStyles.input}
          type={type ?? "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: suffix ? 52 : 14, border: aiSuggested ? `1px solid ${tokens.color.accent}` : undefined, boxShadow: aiSuggested ? `0 0 0 3px ${tokens.color.accentSoft}` : undefined }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: tokens.color.textSubtle, fontFamily: tokens.font.mono }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <div className={fieldStyles.hint}>{hint}</div>}
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
      <label className={fieldStyles.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldStyles.input}
          style={{ paddingRight: 28, appearance: "none", cursor: "pointer", color: value ? tokens.color.text : tokens.color.textSubtle } as React.CSSProperties}
        >
          <option value="">Selecione...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={12} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: tokens.color.textSubtle, pointerEvents: "none" }} />
      </div>
    </div>
  )
}

export function TextAreaField({ label, value, onChange, placeholder, hint, aiSuggested }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; aiSuggested?: boolean
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <label className={fieldStyles.label}>{label}</label>
        {aiSuggested && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: "10px", fontWeight: 500, color: tokens.color.accent,
            padding: "1px 5px", borderRadius: 6,
            background: tokens.color.accentSoft, letterSpacing: "0.04em",
          }}>
            <Sparkles size={8} strokeWidth={2.4} />
            IA
          </span>
        )}
      </div>
      <textarea
        className={fieldStyles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
      />
      {hint && <div className={fieldStyles.hint}>{hint}</div>}
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
            padding: "5px 13px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: "12px", fontWeight: 500, fontFamily: tokens.font.sans,
            background: value === o.value ? tokens.color.surface : "transparent",
            color: value === o.value ? tokens.color.text : tokens.color.textMuted,
            boxShadow: value === o.value ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            transition: "background-color 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out, box-shadow 0.12s ease-out",
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}

export function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {children}
    </div>
  )
}

export function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
      <div style={{ flex: 1, height: 1, background: tokens.color.border }} />
      <span style={{ fontSize: "11px", color: tokens.color.textSubtle, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: tokens.color.border }} />
    </div>
  )
}

export function FormSection({ title, complete, children, completion }: {
  title: string; complete?: boolean; children?: React.ReactNode; completion?: string
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: tokens.color.textSubtle }}>
          {title}
        </div>
        {completion && (
          <div style={{
            fontSize: "10px",
            color: complete ? tokens.color.accent : tokens.color.textSubtle,
            fontFeatureSettings: '"tnum"',
            padding: "2px 8px",
            borderRadius: 999,
            border: `1px solid ${complete ? "rgba(192,161,71,0.35)" : tokens.color.border}`,
            background: complete ? tokens.color.accentSoft : tokens.color.bgSoft,
          }}>
            {completion}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  )
}

export function AddressForm({ addr, onChange }: {
  addr: AddrState
  onChange: (field: keyof AddrState, val: string) => void
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: "11px", fontWeight: 500, color: tokens.color.textSubtle, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Endereço
      </div>
      <FormField label="Logradouro" value={addr.logradouro} onChange={(v) => onChange("logradouro", v)} placeholder="Rua, Av., Alameda..." />
      <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 12 }}>
        <FormField label="Número" value={addr.numero} onChange={(v) => onChange("numero", v)} placeholder="123" />
        <FormField label="Complemento" value={addr.complemento} onChange={(v) => onChange("complemento", v)} placeholder="Apto 45, Sala 3..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 118px", gap: 12 }}>
        <FormField label="Bairro" value={addr.bairro} onChange={(v) => onChange("bairro", v)} placeholder="Jardins" />
        <FormField label="CEP" value={addr.cep} onChange={(v) => onChange("cep", v)} placeholder="00000-000" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 66px", gap: 12 }}>
        <FormField label="Cidade" value={addr.cidade} onChange={(v) => onChange("cidade", v)} placeholder="São Paulo" />
        <FormField label="UF" value={addr.uf} onChange={(v) => onChange("uf", v.toUpperCase().slice(0, 2))} placeholder="SP" />
      </div>
    </div>
  )
}
