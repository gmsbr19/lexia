"use client"

// One assistant "doc-patch" block: the AI's proposed edits to the OPEN document,
// rendered as per-field "Aceitar" cards (+ "Aceitar todos"). Accepting applies the
// suggestion to the live editor preview via onAccept (the editor's acceptSuggestions).
import { useState } from "react"
import { Check, CheckCheck, FileText } from "lucide-react"
import type { DocPatchSuggestion } from "./types"

function snippet(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export function DocPatchCard({
  sugestoes,
  onAccept,
}: {
  sugestoes: DocPatchSuggestion[]
  onAccept?: (sugestoes: DocPatchSuggestion[]) => void
}) {
  const [accepted, setAccepted] = useState<Set<number>>(new Set())

  const apply = (idxs: number[]) => {
    const pick = idxs.filter((i) => !accepted.has(i))
    if (pick.length === 0 || !onAccept) return
    onAccept(pick.map((i) => sugestoes[i]))
    setAccepted((prev) => {
      const next = new Set(prev)
      pick.forEach((i) => next.add(i))
      return next
    })
  }

  const pending = sugestoes.map((_, i) => i).filter((i) => !accepted.has(i))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "stretch" }}>
      {sugestoes.map((sug, i) => {
        const done = accepted.has(i)
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "9px 10px",
              borderRadius: 10,
              background: "var(--accent-soft)",
              border: "1px solid var(--border-gold, var(--accent))",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: "var(--accent)", marginBottom: 2 }}>
                <FileText size={11} /> {sug.label}
              </div>
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45, wordBreak: "break-word" }}>{snippet(sug.value)}</div>
            </div>
            <button
              onClick={() => apply([i])}
              disabled={done}
              style={{
                flexShrink: 0,
                height: 26,
                padding: "0 9px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                borderRadius: 8,
                border: "none",
                cursor: done ? "default" : "pointer",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
                background: done ? "transparent" : "var(--brand-gold)",
                color: done ? "var(--text-subtle)" : "#020D25",
              }}
            >
              <Check size={11} /> {done ? "Aceito" : "Aceitar"}
            </button>
          </div>
        )
      })}
      {sugestoes.length > 1 && (
        <button
          onClick={() => apply(sugestoes.map((_, i) => i))}
          disabled={pending.length === 0}
          style={{
            alignSelf: "flex-start",
            height: 28,
            padding: "0 11px",
            display: "flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 8,
            border: "1px solid var(--border)",
            cursor: pending.length === 0 ? "default" : "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            background: pending.length === 0 ? "transparent" : "var(--surface)",
            color: pending.length === 0 ? "var(--text-subtle)" : "var(--text)",
          }}
        >
          <CheckCheck size={13} /> {pending.length === 0 ? "Tudo aceito" : `Aceitar todos (${pending.length})`}
        </button>
      )}
    </div>
  )
}
