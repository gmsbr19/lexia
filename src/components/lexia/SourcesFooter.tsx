"use client"

// LexIA · Chat — rodapé de fontes citáveis (handoff R5 "SourceChip"/
// "SourcesFooter", Fase 6, D9). Mostra de onde vieram os dados usados na
// resposta; cada chip abre a rota da fonte.
import { useRouter } from "next/navigation"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import type { Fonte } from "@/lib/lexia/cards-types"

const ICON_POR_TIPO: Record<Fonte["tipo"], CrmIconName> = {
  publicacao: "mail",
  andamento: "briefcase",
  contrato: "fileCheck",
  lancamento: "banknote",
  documento: "fileText",
}

function SourceChip({ fonte, onClick }: { fonte: Fonte; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={fonte.detalhe ?? fonte.titulo}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 26,
        padding: "0 9px",
        borderRadius: 7,
        border: "1px solid var(--border)",
        background: "var(--bg-sunken)",
        color: "var(--text-muted)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        maxWidth: 220,
      }}
    >
      <Icon name={ICON_POR_TIPO[fonte.tipo]} size={12} style={{ flexShrink: 0, color: "var(--text-subtle)" }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fonte.titulo}</span>
    </button>
  )
}

export function SourcesFooter({ fontes }: { fontes: Fonte[] }) {
  const router = useRouter()
  if (!fontes.length) return null
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {fontes.map((f, i) => (
        <SourceChip key={i} fonte={f} onClick={() => router.push(f.rota)} />
      ))}
    </div>
  )
}
