"use client"

// LexIA · Chat — chips de próxima ação (handoff R4 "FollowChips", Fase 6, D2).
// Ao fim da última resposta, sugere 2-3 próximos passos ESPECÍFICOS ao que
// acabou de ser discutido; clicar PREENCHE o composer — não envia sozinho.
import { Icon } from "@/components/crm/crm-icons"

export function FollowChips({ itens, onPick }: { itens: string[]; onPick: (texto: string) => void }) {
  if (!itens.length) return null
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)" }}>Próximos passos</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {itens.map((it, i) => (
          <button
            key={i}
            onClick={() => onPick(it)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 30,
              padding: "0 11px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-muted)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {it}
            <Icon name="arrowRight" size={12} style={{ color: "var(--text-subtle)", opacity: 0.6, flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  )
}
