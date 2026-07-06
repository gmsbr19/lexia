"use client"

// LexIA · Chat — resultado de busca agrupado por tipo (handoff, Fase 3).
// Reaproveita as linhas compactas de cada entidade quando o tipo bate — o
// card JÁ é a resposta.
import { Icon } from "@/components/crm/crm-icons"
import type { SearchCardPayload } from "@/lib/lexia/cards-types"
import { EntityRow } from "./EntityCard"

export function SearchResultsCard({ payload }: { payload: SearchCardPayload }) {
  const visible = payload.grupos.filter((g) => g.itens.length > 0)
  if (visible.length === 0) {
    return (
      <div style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", padding: "28px 13px", textAlign: "center" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "var(--bg-sunken)",
            color: "var(--text-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <Icon name="search" size={19} strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>Nenhum resultado para &quot;{payload.query}&quot;</div>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", padding: "10px 10px 11px", display: "flex", flexDirection: "column", gap: 10 }}>
      {payload.query && (
        <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "2px 3px 0" }}>
          Resultados para <strong style={{ color: "var(--text-muted)", fontWeight: 500 }}>&quot;{payload.query}&quot;</strong>
        </div>
      )}
      {visible.map((g, gi) => (
        <div key={gi}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-subtle)", padding: "2px 2px 6px" }}>{g.label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {g.itens.map((item, i) => (
              <EntityRow key={i} kind={g.kind} data={item as never} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
