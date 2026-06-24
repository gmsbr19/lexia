"use client"

// Scrollable message list with auto-scroll-to-bottom. Empty-state content is
// provided by the container (welcome + suggestions) via `empty`.
import { useEffect, useRef, type ReactNode } from "react"
import "./lexia.css"
import { LexiaBubble } from "./LexiaBubble"
import type { ChatMsg } from "./types"

export function LexiaThread({
  messages,
  streaming,
  onDecide,
  empty,
  padding = "18px 16px",
}: {
  messages: ChatMsg[]
  streaming: boolean
  onDecide: (acaoId: number, decisao: "confirmar" | "recusar") => void
  empty?: ReactNode
  padding?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  return (
    <div ref={ref} style={{ flex: 1, overflowY: "auto", padding, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
      {messages.length === 0 && empty ? (
        <div style={{ margin: "auto 0" }}>{empty}</div>
      ) : (
        messages.map((m) => <LexiaBubble key={m.id} msg={m} streaming={streaming} onDecide={onDecide} />)
      )}
    </div>
  )
}
