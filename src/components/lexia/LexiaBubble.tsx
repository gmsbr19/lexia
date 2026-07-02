"use client"

// Renders one chat message. User turns are a navy bubble; assistant turns are an
// avatar + an ordered stack of render blocks (markdown text, tool chips,
// navigation notes, confirmation cards, system notices).
import { useRouter } from "next/navigation"
import { Icon } from "@/components/crm/crm-icons"
import { AnexoChips } from "./AnexoChips"
import { ConfirmCard } from "./ConfirmCard"
import { DocPatchCard, type DocPatchPayload } from "./DocPatchCard"
import { Markdown } from "./Markdown"
import { ToolChip } from "./ToolChip"
import { Orb } from "./LexiaKit"
import type { ChatMsg } from "./types"

// Estado de carregamento: rótulo com shimmer dourado + três pontinhos (§6).
function Thinking() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
      <span className="lx-thinking-label">Pensando…</span>
      <span style={{ display: "inline-flex", gap: 4 }}>
        <span className="lx-dot" style={{ animationDelay: "0ms" }} />
        <span className="lx-dot" style={{ animationDelay: "160ms" }} />
        <span className="lx-dot" style={{ animationDelay: "320ms" }} />
      </span>
    </div>
  )
}

export function LexiaBubble({
  msg,
  streaming,
  onDecide,
  onDocAccept,
  autoApplyDoc,
}: {
  msg: ChatMsg
  streaming: boolean
  onDecide: (acaoId: number, decisao: "confirmar" | "recusar") => void
  /** Aplica edições propostas ao documento aberto (só no painel do editor). */
  onDocAccept?: (payload: DocPatchPayload) => void
  /** Modo automático: aplica as edições propostas sem clicar em "Aplicar". */
  autoApplyDoc?: boolean
}) {
  const router = useRouter()
  if (msg.role === "user") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        {msg.anexos?.length ? <AnexoChips anexos={msg.anexos} /> : null}
        {msg.text ? (
          <div
            style={{
              maxWidth: "82%",
              padding: "10px 13px",
              borderRadius: 14,
              borderTopRightRadius: 4,
              fontSize: 14,
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "var(--brand-navy)",
              color: "#F5F1E4",
            }}
          >
            {msg.text}
          </div>
        ) : null}
      </div>
    )
  }

  const empty = msg.blocks.length === 0
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
      <Orb size={28} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9, paddingTop: 2 }}>
        {empty ? (
          <Thinking />
        ) : (
          msg.blocks.map((b, i) => {
            switch (b.type) {
              case "text":
                // resposta da IA = texto corrido (sem balão); só o usuário tem balão.
                return (
                  <div
                    key={i}
                    style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", letterSpacing: "-0.01em", maxWidth: "100%", wordBreak: "break-word" }}
                  >
                    <Markdown text={b.text} />
                  </div>
                )
              case "tool":
                return <ToolChip key={i} block={b} />
              case "confirm":
                return <ConfirmCard key={i} block={b} onDecide={onDecide} busy={streaming} />
              case "doc-patch":
                return onDocAccept ? <DocPatchCard key={i} block={b} onAccept={onDocAccept} autoApply={autoApplyDoc} /> : null
              case "navigate":
                return (
                  <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-subtle)", alignSelf: "flex-start" }}>
                    <Icon name="externalLink" size={12} />
                    Abri {b.rota}
                  </div>
                )
              case "link":
                return (
                  <button
                    key={i}
                    onClick={() => router.push(b.rota)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      alignSelf: "flex-start",
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border-gold, var(--accent))",
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="externalLink" size={13} />
                    {b.label}
                  </button>
                )
              case "notice":
                return (
                  <div
                    key={i}
                    style={{
                      background: "rgba(192,73,47,0.10)",
                      color: "var(--fin-neg,#C0492F)",
                      padding: "10px 13px",
                      borderRadius: 14,
                      borderTopLeftRadius: 4,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {b.text}
                  </div>
                )
              default:
                return null
            }
          })
        )}
      </div>
    </div>
  )
}
