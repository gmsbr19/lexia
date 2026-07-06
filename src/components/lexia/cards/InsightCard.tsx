"use client"

// LexIA · Chat — visualização de dados (handoff, Fase 3). Mini-visualizações
// do tamanho de um card pequeno: barra de comparação, sparkline de tendência,
// funil (posição de um lead). Sem dourado nos dados — só no selo que indica
// proveniência de IA (AiSeal).
import { Icon } from "@/components/crm/crm-icons"
import { formatBRL } from "@/lib/finance/money"
import type { InsightCardPayload } from "@/lib/lexia/cards-types"
import { AiSeal, CcFunnelStepper } from "../cc/CcKit"

function ProgressCompare({ a, b, aLabel, bLabel }: { a: number; b: number; aLabel: string; bLabel: string }) {
  const total = a + b || 1
  const pctA = (a / total) * 100
  return (
    <div>
      <div style={{ height: 8, borderRadius: 999, background: "var(--bg-sunken)", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${pctA}%`, height: "100%", background: "var(--ok)" }} />
        <div style={{ flex: 1, height: "100%", background: "var(--warn)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
        <span style={{ color: "var(--text)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ok)", display: "inline-block", marginRight: 5 }} />
          {aLabel} · {formatBRL(a)}
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--warn)", display: "inline-block", marginRight: 5 }} />
          {bLabel} · {formatBRL(b)}
        </span>
      </div>
    </div>
  )
}

function Sparkline({ pontos, labels }: { pontos: number[]; labels?: string[] }) {
  if (pontos.length < 2) return null
  const w = 280
  const h = 48
  const min = Math.min(...pontos)
  const max = Math.max(...pontos)
  const range = max - min || 1
  const step = w / (pontos.length - 1)
  const pts = pontos.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ")
  const last = pontos[pontos.length - 1]
  const first = pontos[0]
  const up = last >= first
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={up ? "var(--ok)" : "var(--crit)"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {labels && labels.length === pontos.length && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10.5, color: "var(--text-subtle)" }}>
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  )
}

export function InsightCard({ payload, width = 340 }: { payload: InsightCardPayload; width?: number | string }) {
  return (
    <div style={{ width, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", padding: 13, position: "relative" }}>
      <AiSeal />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13, paddingRight: 22 }}>
        {payload.icone && <Icon name={payload.icone} size={14} style={{ color: "var(--text-muted)" }} />}
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{payload.titulo}</span>
      </div>
      {payload.series.variant === "progress-compare" && <ProgressCompare {...payload.series} />}
      {payload.series.variant === "sparkline" && <Sparkline pontos={payload.series.pontos} labels={payload.series.labels} />}
      {payload.series.variant === "funnel" && <CcFunnelStepper stage={payload.series.estagio} />}
    </div>
  )
}
