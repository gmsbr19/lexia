"use client"

// Renders one chat message. User turns are a navy bubble; assistant turns are an
// avatar + an ordered stack of render blocks (markdown text, tool chips,
// navigation notes, confirmation cards, system notices).
import { useRouter } from "next/navigation"
import { Icon } from "@/components/crm/crm-icons"
import { AnexoChips } from "./AnexoChips"
import { ConfirmCard } from "./ConfirmCard"
import { DocPatchCard } from "./DocPatchCard"
import { Markdown } from "./Markdown"
import { ToolChip } from "./ToolChip"
import type { ChatMsg, DocPatchSuggestion } from "./types"

const GOLD_GRAD = "var(--brand-gold)"

function Avatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        flexShrink: 0,
        background: GOLD_GRAD,
        color: "#020D25",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
    >
      <Icon name="sparkles" size={15} />
    </div>
  )
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "12px 14px", borderRadius: 14, background: "var(--bg-sunken)", alignSelf: "flex-start" }}>
      <span className="lx-dot" style={{ animationDelay: "0ms" }} />
      <span className="lx-dot" style={{ animationDelay: "160ms" }} />
      <span className="lx-dot" style={{ animationDelay: "320ms" }} />
    </div>
  )
}

export function LexiaBubble({
  msg,
  streaming,
  onDecide,
  onDocAccept,
}: {
  msg: ChatMsg
  streaming: boolean
  onDecide: (acaoId: number, decisao: "confirmar" | "recusar") => void
  onDocAccept?: (sugestoes: DocPatchSuggestion[]) => void
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
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <Avatar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {empty ? (
          <ThinkingDots />
        ) : (
          msg.blocks.map((b, i) => {
            switch (b.type) {
              case "text":
                return (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg-sunken)",
                      color: "var(--text)",
                      padding: "10px 13px",
                      borderRadius: 14,
                      borderTopLeftRadius: 4,
                      maxWidth: "100%",
                      wordBreak: "break-word",
                    }}
                  >
                    <Markdown text={b.text} />
                  </div>
                )
              case "tool":
                return <ToolChip key={i} block={b} />
              case "confirm":
                return <ConfirmCard key={i} block={b} onDecide={onDecide} busy={streaming} />
              case "doc-patch":
                return <DocPatchCard key={i} sugestoes={b.sugestoes} onAccept={onDocAccept} />
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
