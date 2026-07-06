"use client"

// LexIA · Chat — histórico v2 (handoff, Fase 8). Busca accent-insensitive
// client-side (a lista inteira já foi carregada), renomear inline, fixar no
// topo (a ordenação pinned-first já vem do backend — ver queries.ts), chip de
// contexto de entidade (última menção "@" da conversa, Fase 7), skeleton.
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { crmDate } from "@/components/crm/crm-fmt"
import { lexiaFixarConversa, lexiaRenameConversa } from "@/components/crm/crm-api"
import type { LexiaConversaRow } from "@/components/crm/crm-types"
import { contemNormalizado } from "@/lib/text"
import "./cc/cc.css"

function HistorySkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "2px 4px" }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px" }}>
          <div className="cc-skeleton" style={{ width: 14, height: 14, borderRadius: 4 }} />
          <div className="cc-skeleton" style={{ height: 10, flex: 1, maxWidth: 150 + (i % 3) * 34 }} />
        </div>
      ))}
    </div>
  )
}

function ConversaRow({ r, onOpen, onTogglePin, onRename }: { r: LexiaConversaRow; onOpen: () => void; onTogglePin: () => void; onRename: (titulo: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(r.titulo ?? "")

  const confirmar = () => {
    onRename(draft.trim() || "Conversa sem título")
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px" }}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              confirmar()
            }
            if (e.key === "Escape") setEditing(false)
          }}
          className="input"
          style={{ flex: 1, height: 30, fontSize: 13 }}
        />
        <button className="btn btn-ghost" style={{ width: 26, height: 26, padding: 0, borderRadius: 6, flexShrink: 0 }} onClick={confirmar} title="Salvar">
          <Icon name="check" size={14} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="fx-menu-item"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 6px 7px 10px", cursor: "pointer" }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titulo || "Conversa sem título"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
          <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{crmDate(r.atualizadaEm)}</span>
          {r.contexto && (
            <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10.5, color: "var(--text-subtle)", background: "var(--bg-sunken)", borderRadius: 5, padding: "1px 6px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.contexto.nome}
            </span>
          )}
        </div>
      </div>
      <button
        title={r.fixada ? "Desafixar" : "Fixar"}
        className="btn btn-ghost"
        style={{ width: 26, height: 26, padding: 0, borderRadius: 6, flexShrink: 0, color: r.fixada ? "var(--accent)" : "var(--text-subtle)" }}
        onClick={(e) => {
          e.stopPropagation()
          onTogglePin()
        }}
      >
        <Icon name="star" size={13} strokeWidth={r.fixada ? 0 : 1.9} style={r.fixada ? { fill: "currentColor" } : undefined} />
      </button>
      <button
        title="Renomear"
        className="btn btn-ghost"
        style={{ width: 26, height: 26, padding: 0, borderRadius: 6, flexShrink: 0, color: "var(--text-subtle)" }}
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
      >
        <Icon name="edit3" size={13} />
      </button>
    </div>
  )
}

export function HistoryDropdown({
  conversas,
  loading,
  onOpen,
  onChanged,
}: {
  conversas: LexiaConversaRow[]
  loading: boolean
  onOpen: (r: LexiaConversaRow) => void
  /** Backend confirmou fixar/renomear — o chamador funde o patch na lista local. */
  onChanged: (id: number, patch: Partial<LexiaConversaRow>) => void
}) {
  const [busca, setBusca] = useState("")
  const filtradas = busca.trim() ? conversas.filter((c) => contemNormalizado(busca, c.titulo, c.contexto?.nome)) : conversas

  const togglePin = (r: LexiaConversaRow) => {
    const fixada = !r.fixada
    onChanged(r.id, { fixada }) // otimista
    void lexiaFixarConversa(r.id, fixada).catch(() => onChanged(r.id, { fixada: r.fixada }))
  }
  const renomear = (r: LexiaConversaRow, titulo: string) => {
    const anterior = r.titulo
    onChanged(r.id, { titulo }) // otimista
    void lexiaRenameConversa(r.id, titulo).catch(() => onChanged(r.id, { titulo: anterior }))
  }

  const fixadas = filtradas.filter((c) => c.fixada)
  const outras = filtradas.filter((c) => !c.fixada)

  return (
    <div>
      <div style={{ padding: "4px 6px 8px" }}>
        <div className="cc-searchbox" style={{ display: "flex", alignItems: "center", gap: 7, height: 32, padding: "0 9px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-sunken)", transition: "border-color .12s, box-shadow .12s" }}>
          <Icon name="search" size={13} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar conversas…"
            autoFocus
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text)", fontFamily: "var(--font-sans)" }}
          />
        </div>
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {loading ? (
          <HistorySkeleton />
        ) : filtradas.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--text-subtle)", padding: "6px 10px 8px" }}>{busca.trim() ? "Nenhuma conversa encontrada." : "Nenhuma ainda."}</div>
        ) : (
          <>
            {fixadas.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "6px 10px 4px" }}>Fixadas</div>
                {fixadas.map((r) => (
                  <ConversaRow key={r.id} r={r} onOpen={() => onOpen(r)} onTogglePin={() => togglePin(r)} onRename={(t) => renomear(r, t)} />
                ))}
              </>
            )}
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "6px 10px 4px" }}>
              {fixadas.length > 0 ? "Recentes" : "Mais antigas"}
            </div>
            {outras.slice(0, 20).map((r) => (
              <ConversaRow key={r.id} r={r} onOpen={() => onOpen(r)} onTogglePin={() => togglePin(r)} onRename={(t) => renomear(r, t)} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
