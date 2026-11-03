"use client"

// LexIA · CRM — blocos visuais compartilhados pelas páginas de detalhe (contato
// /contatos/[id] e caso /casos/[id]): estatística numérica/monetária do
// cabeçalho, linha de informação com ícone e a sub-linha de processo.
import type { ReactNode } from "react"
import { CrmBadge, CrmRow, FxMoney } from "../crm-kit"
import { Icon } from "../crm-icons"
import { ProcSemaforo, urgenciaCalc } from "@/components/processos/proc-kit"
import type { ProcessoMini } from "../crm-types"

export function CrmStat({ label, value, tone }: { label: string; value: ReactNode; tone?: "pos" | "neg" | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 16, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
          color: tone === "neg" ? "var(--fin-neg,#C0492F)" : tone === "pos" ? "var(--fin-pos,#2E9E5B)" : "var(--text)",
        }}
      >
        {value}
      </span>
    </div>
  )
}

export function CrmMoneyStat({ label, cents, tone }: { label: string; cents: number; tone?: "pos" | "neg" | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
        <FxMoney cents={cents} size={16} plain={tone == null} dir={tone === "neg" ? "out" : "in"} />
      </span>
    </div>
  )
}

export function CrmInfoLine({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
      <Icon name={icon} size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  )
}

// ───────────────────────── processo sub-row (casos & processos tab) ─────────────────────────
export function CrmProcessoSubRow({ p, hoje, onClick }: { p: ProcessoMini; hoje: string; onClick: () => void }) {
  const foro = [p.tribunal, p.vara].filter(Boolean).join(" · ")
  return (
    <CrmRow
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 10px 40px",
        borderTop: "1px solid var(--border)", background: "var(--bg-soft)",
      }}
    >
      <Icon name="cornerDownRight" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.numeroCnj || "Sem CNJ"}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {[p.classe, foro].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <CrmBadge tone="neutral">{p.status}</CrmBadge>
      {p.proximaDataFatal != null ? (
        <ProcSemaforo urgencia={urgenciaCalc(p.proximaDataFatal, null, hoje)} />
      ) : (
        <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>sem prazo</span>
      )}
      <Icon name="chevronRight" size={15} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
    </CrmRow>
  )
}
