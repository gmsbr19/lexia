"use client"

// LexIA · Chat — "Pensou por Xs" (handoff R5, Fase 6, D8). Colapsado por
// padrão, acima da timeline de tools; expandir mostra o raciocínio (extended
// thinking) resumido. Reusa .cc-timeline-toggle (mesma família visual do
// colapso "N passos" da AgentTimeline).
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import "./cc/cc.css"
import type { PensamentoMeta } from "@/lib/lexia/cards-types"

function formatDuracao(ms: number): string {
  const s = ms / 1000
  if (s < 1) return "menos de 1s"
  if (s < 60) return `${Math.round(s)}s`
  const min = Math.floor(s / 60)
  const resto = Math.round(s % 60)
  return resto ? `${min}min ${resto}s` : `${min}min`
}

export function ThoughtDisclosure({ pensamento }: { pensamento: PensamentoMeta }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div>
      <button onClick={() => setAberto((s) => !s)} className="cc-timeline-toggle">
        <Icon name="sigma" size={13} />
        <span>Pensou por {formatDuracao(pensamento.duracaoMs)}</span>
        <Icon name="chevronDown" size={13} style={{ transform: aberto ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {aberto && (
        <div
          style={{
            marginTop: 6,
            padding: "9px 11px",
            borderRadius: 10,
            background: "var(--bg-sunken)",
            fontSize: 12.5,
            color: "var(--text-muted)",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {pensamento.resumo}
        </div>
      )}
    </div>
  )
}
