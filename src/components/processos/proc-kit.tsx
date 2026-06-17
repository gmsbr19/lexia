"use client"

// Processos (Contencioso) — shared UI primitives (Proc* atoms), ported from the
// design prototype (proc-ui.jsx). Built on the CRM kit + the .crm-scope bridge
// vars. The deadline "semáforo" is the only place semantic colour is used; it is
// derived from the backend's UrgenciaView (never stored).
import type { CSSProperties, ReactNode } from "react"
import { CrmBadge, useCrmToast, type BadgeTone } from "@/components/crm/crm-kit"
import { crmDate } from "@/components/crm/crm-fmt"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import type { UrgenciaView } from "@/lib/processos/types"

// ── semáforo (vermelho / âmbar / verde) ─────────────────────────────────────────
export type ProcTone = "neg" | "warn" | "pos" | "neutral"
export const PROC_TONE: Record<ProcTone, { fg: string; soft: string }> = {
  neg: { fg: "var(--crit)", soft: "var(--crit-soft)" },
  warn: { fg: "var(--warn)", soft: "var(--warn-soft)" },
  pos: { fg: "var(--ok)", soft: "var(--ok-soft)" },
  neutral: { fg: "var(--text-muted)", soft: "var(--bg-sunken)" },
}

function diasEntreISO(aISO: string, bISO: string): number {
  const [ay, am, ad] = aISO.split("-").map(Number)
  const [by, bm, bd] = bISO.split("-").map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/** Client mirror of lib/processos/urgencia.urgenciaDe — for previews where the
 *  server hasn't computed the semáforo yet (the prazo modal). */
export function urgenciaCalc(fatalISO: string, internaISO: string | null, hoje: string, ambarDias = 5): UrgenciaView {
  const diasRestantes = diasEntreISO(hoje, fatalISO)
  const estado = diasRestantes < 0 ? "vencido" : diasRestantes === 0 ? "hoje" : "futuro"
  let faixa: UrgenciaView["faixa"]
  if (estado !== "futuro") faixa = "vermelho"
  else if (internaISO && hoje >= internaISO) faixa = "vermelho"
  else if (diasRestantes <= ambarDias) faixa = "ambar"
  else faixa = "verde"
  return { estado, faixa, diasRestantes }
}

export function urgenciaUI(u: UrgenciaView | null): { tone: ProcTone; color: string; soft: string; label: string } {
  if (!u) return { tone: "neutral", color: PROC_TONE.neutral.fg, soft: PROC_TONE.neutral.soft, label: "—" }
  const tone: ProcTone = u.faixa === "vermelho" ? "neg" : u.faixa === "ambar" ? "warn" : "pos"
  const label =
    u.estado === "vencido"
      ? `${Math.abs(u.diasRestantes)} d em atraso`
      : u.estado === "hoje"
        ? "Vence hoje"
        : `${u.diasRestantes} ${u.diasRestantes === 1 ? "dia" : "dias"}`
  return { tone, color: PROC_TONE[tone].fg, soft: PROC_TONE[tone].soft, label }
}

export function ProcDot({ tone = "neutral", size = 8 }: { tone?: ProcTone; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: PROC_TONE[tone].fg, flexShrink: 0, display: "inline-block" }} />
  )
}

export function ProcSemaforo({ urgencia, big = false }: { urgencia: UrgenciaView | null; big?: boolean }) {
  const u = urgenciaUI(urgencia)
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, height: big ? 26 : 22, padding: big ? "0 11px" : "0 9px",
        borderRadius: 6, background: u.soft, color: u.color, fontSize: big ? 13 : 12, fontWeight: 500,
        fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", letterSpacing: "-0.01em",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {u.label}
    </span>
  )
}

// ── fonte / sistema (PJe / e-SAJ / Projudi / DJe) ────────────────────────────────
const FONTE_LABEL: Record<string, string> = {
  pje: "PJe", dje: "DJe", datajud: "DataJud", esaj: "e-SAJ", projudi: "Projudi", eproc: "eproc", manual: "Manual",
}
export const sistemaLabel = (s: string | null | undefined) => (s ? FONTE_LABEL[s] ?? s : "—")

export function ProcFonte({ fonte }: { fonte: string | null }) {
  const label = fonte ? FONTE_LABEL[fonte] ?? fonte : "—"
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, height: 20, padding: "0 8px", borderRadius: 6,
        background: "var(--bg-sunken)", color: "var(--text-muted)", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.02em", whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-subtle)" }} />
      {label}
    </span>
  )
}

// ── número CNJ (tabular) + copiar ────────────────────────────────────────────────
export function ProcCNJ({ numero, size = 13, copy = false, color = "var(--text)" }: { numero: string | null; size?: number; copy?: boolean; color?: string }) {
  const { toast } = useCrmToast()
  if (!numero) return <span style={{ fontSize: size, color: "var(--text-subtle)" }}>sem número</span>
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: size, fontWeight: 500, color, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>{numero}</span>
      {copy && (
        <button
          onClick={(e) => { e.stopPropagation(); if (navigator.clipboard) navigator.clipboard.writeText(numero); toast("Número CNJ copiado") }}
          title="Copiar número CNJ"
          style={{ border: "none", background: "transparent", color: "var(--text-subtle)", cursor: "pointer", padding: 2, display: "inline-flex", borderRadius: 5 }}
        >
          <Icon name="copy" size={13} />
        </button>
      )}
    </span>
  )
}

// ── status do processo ───────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  ativo: { label: "Ativo", tone: "pos" },
  suspenso: { label: "Suspenso", tone: "gold" },
  arquivado: { label: "Arquivado", tone: "neutral" },
  baixado: { label: "Baixado", tone: "neutral" },
}
export function ProcStatus({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.ativo
  return <CrmBadge tone={m.tone} dot>{m.label}</CrmBadge>
}

// ── fase (faseAtual é texto livre; rótulo amigável p/ códigos conhecidos) ──────────
const FASE_LABEL: Record<string, string> = {
  conhecimento: "Conhecimento", instrucao: "Instrução", sentenca: "Sentença",
  recursal: "Recursal", execucao: "Execução / Cumprimento", distribuicao: "Aguardando distribuição",
}
export function ProcFaseTag({ fase }: { fase: string | null }) {
  if (!fase) return null
  const label = FASE_LABEL[fase] ?? fase.charAt(0).toUpperCase() + fase.slice(1)
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 9px", borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {label}
    </span>
  )
}

// ── ícone de tipo de movimentação (heurística por palavra-chave do tipo) ──────────
export function movIcon(tipo: string | null): CrmIconName {
  const t = (tipo ?? "").toLowerCase()
  if (t.includes("intima")) return "bell"
  if (t.includes("public")) return "fileText"
  if (t.includes("senten")) return "scale"
  if (t.includes("decis") || t.includes("acórd") || t.includes("acord")) return "gavel"
  if (t.includes("despach")) return "feather"
  if (t.includes("audi")) return "users"
  if (t.includes("peti") || t.includes("protocol")) return "send"
  if (t.includes("juntad")) return "paperclip"
  if (t.includes("distrib")) return "cornerDownRight"
  return "circleDot"
}
export function ProcMovIcon({ tipo, size = 32, active = false }: { tipo: string | null; size?: number; active?: boolean }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "var(--accent-soft)" : "var(--bg-sunken)", color: active ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      <Icon name={movIcon(tipo)} size={Math.round(size * 0.5)} strokeWidth={1.7} />
    </div>
  )
}

// ── responsável: avatar + primeiro nome ──────────────────────────────────────────
function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "—"
}
export function ProcResp({ nome, showName = true, size = 22 }: { nome: string | null; showName?: boolean; size?: number }) {
  if (!nome) return <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>—</span>
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }} title={nome}>
      <span style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, fontWeight: 500, flexShrink: 0 }}>{initials(nome)}</span>
      {showName && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>{nome.split(" ")[0]}</span>}
    </span>
  )
}

// ── KPI compacto com tonalidade (semáforo) ───────────────────────────────────────
export function ProcStat({ label, value, icon, tone, sub, onClick }: { label: string; value: ReactNode; icon?: CrmIconName; tone?: ProcTone | null; sub?: ReactNode; onClick?: () => void }) {
  const fg = tone ? PROC_TONE[tone].fg : "var(--text)"
  return (
    <div
      className="card"
      onClick={onClick}
      style={{ padding: "15px 17px", display: "flex", flexDirection: "column", gap: 9, minHeight: 102, cursor: onClick ? "pointer" : "default", transition: "border-color .12s, background .12s" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
        {icon && (
          <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: tone ? PROC_TONE[tone].soft : "var(--bg-sunken)", color: tone ? fg : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={14} strokeWidth={1.8} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums", color: fg }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{sub}</span>}
    </div>
  )
}

// ── título de seção (ficha) ────────────────────────────────────────────────────
export function ProcSecTitle({ icon, title, right, sub }: { icon?: CrmIconName; title: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        {icon && <span style={{ color: "var(--text-subtle)" }}><Icon name={icon} size={16} /></span>}
        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{sub}</span>}
      </div>
      {right}
    </div>
  )
}

export const fmtDate = crmDate
