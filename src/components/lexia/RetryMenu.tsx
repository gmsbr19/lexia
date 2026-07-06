"use client"

// LexIA · Chat — menu "Tentar de novo" (handoff R4, Fase 5). Substitui o botão
// simples de regenerar por um menu: refazer a mesma pergunta, subir para o
// modelo avançado (Opus), ou ajustar tom/tamanho (mais curta/formal/simples).
// Monocromático — o dourado (var(--accent)) aparece só no ícone de IA do
// cabeçalho, nunca preenchendo um item (é utilitário, não elemento de marca).
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { MenuPanel } from "./LexiaKit"
import type { Modificador } from "@/lib/lexia/agent/modificadores"

export type RetryPickId = "again" | "opus" | Modificador

interface RetryItem {
  id: RetryPickId
  icon: CrmIconName
  label: string
  tag?: string
}

const RETRY_ITEMS: (RetryItem | { group: string })[] = [
  { id: "again", icon: "refreshCw", label: "Tentar de novo" },
  { id: "opus", icon: "zap", label: "Com modelo avançado", tag: "Opus" },
  { group: "Ajustar" },
  { id: "curta", icon: "minus", label: "Resposta mais curta" },
  { id: "formal", icon: "scale", label: "Tom mais formal" },
  { id: "simples", icon: "feather", label: "Tom mais simples" },
]

export function RetryMenu({ onPick, onClose }: { onPick: (id: RetryPickId) => void; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
      <MenuPanel style={{ position: "absolute", bottom: 32, left: 0, width: 236, zIndex: 2, padding: 6, transformOrigin: "bottom left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 500, color: "var(--text-subtle)", padding: "6px 8px" }}>
          <Icon name="sparkles" size={13} style={{ color: "var(--accent)" }} />
          Refazer resposta
        </div>
        {RETRY_ITEMS.map((it, i) =>
          "group" in it ? (
            <div key={i} style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "8px 8px 4px" }}>
              {it.group}
            </div>
          ) : (
            <button
              key={it.id}
              className="fx-menu-item"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", border: "none", background: "transparent", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}
              onClick={() => onPick(it.id)}
            >
              <Icon name={it.icon} size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13.5, color: "var(--text)" }}>{it.label}</span>
              {it.tag && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-subtle)", border: "1px solid var(--border)", borderRadius: 5, padding: "1px 5px" }}>{it.tag}</span>
              )}
            </button>
          ),
        )}
      </MenuPanel>
    </>
  )
}
