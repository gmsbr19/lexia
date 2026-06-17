"use client"

// A tool-activity chip: spinner while running, check/cross when done. Mirrors
// the visual language of Claude/Gemini tool-call indicators.
import { Icon } from "@/components/crm/crm-icons"
import type { ChatBlock } from "./types"

type ToolBlock = Extract<ChatBlock, { type: "tool" }>

export function ToolChip({ block }: { block: ToolBlock }) {
  const running = block.status === "run"
  const erro = block.status === "erro"
  const color = erro ? "var(--fin-neg,#C0492F)" : running ? "var(--text-muted)" : "var(--fin-pos,#1F8A4C)"
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--bg-soft)",
        fontSize: 12,
        color: "var(--text-muted)",
        margin: "2px 0",
        alignSelf: "flex-start",
      }}
    >
      <span style={{ color, display: "inline-flex" }}>
        {running ? (
          <Icon name="refreshCw" size={13} className="lx-spin" />
        ) : erro ? (
          <Icon name="alertTriangle" size={13} />
        ) : (
          <Icon name="check" size={13} />
        )}
      </span>
      <span>{block.label}</span>
    </div>
  )
}
