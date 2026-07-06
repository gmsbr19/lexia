"use client"

// LexIA · Chat — popover de comandos "/" (Fase 7). Cada item preenche o
// composer com um texto-modelo (o usuário completa e envia) — não é uma tool,
// só um atalho de digitação. Componente CONTROLADO (mesma convenção do
// MentionPopover): o LexiaComposer é dono do índice ativo (teclado).
import { Icon } from "@/components/crm/crm-icons"
import { MenuPanel } from "./LexiaKit"

export { COMANDOS, filtrarComandos, type Comando } from "./comandos-data"
import type { Comando } from "./comandos-data"

export function SlashCommands({ itens, active, onHover, onPick }: { itens: Comando[]; active: number; onHover: (i: number) => void; onPick: (c: Comando) => void }) {
  return (
    <MenuPanel style={{ position: "absolute", bottom: 44, left: 0, width: 260, zIndex: 2, padding: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", padding: "4px 8px 6px" }}>Comandos</div>
      {itens.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", padding: "6px 8px 8px" }}>Nada encontrado</div>
      ) : (
        itens.map((c, idx) => (
          <button
            key={c.id}
            className="fx-menu-item"
            style={{ width: "100%", background: idx === active ? "var(--surface-hover)" : "transparent" }}
            onMouseEnter={() => onHover(idx)}
            onClick={() => onPick(c)}
          >
            <Icon name={c.icon} size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{c.label}</span>
            </span>
            <span style={{ fontSize: 11, color: "var(--text-subtle)", flexShrink: 0 }}>{c.desc}</span>
          </button>
        ))
      )}
    </MenuPanel>
  )
}
