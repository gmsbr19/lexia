"use client"

import { useState } from "react"
import { Sparkles, X, Send, Check, ChevronRight } from "lucide-react"
import { tokens } from "@/styles/tokens.css"
import { btn } from "@/styles/components.css"

export interface AISuggestion {
  field: string
  label: string
  value: string
}

interface AIPanelProps {
  onClose: () => void
  suggestions?: AISuggestion[]
  onAcceptSuggestion?: (suggestion: AISuggestion) => void
}

const MOCK_SUGGESTIONS: AISuggestion[] = [
  { field: "objeto", label: "Objeto dos serviços", value: "defesa em ação trabalhista nº 0001234-56.2026.5.02.0001 e todos os recursos e incidentes dela decorrentes" },
  { field: "foro", label: "Cidade (foro)", value: "São Paulo" },
]

const EXAMPLE_PROMPTS = [
  "Preencher dados do contratante",
  "Sugerir cláusula de reajuste IPCA",
  "Ajustar prazo para 24 meses",
]

export function AIPanel({ onClose, suggestions = MOCK_SUGGESTIONS, onAcceptSuggestion }: AIPanelProps) {
  const [prompt, setPrompt] = useState("")
  const [accepted, setAccepted] = useState<Set<string>>(new Set())

  function handleAccept(s: AISuggestion) {
    setAccepted((prev) => new Set(prev).add(s.field))
    onAcceptSuggestion?.(s)
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      borderLeft: `1px solid ${tokens.color.border}`,
      background: tokens.color.bg,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px 12px",
        borderBottom: `1px solid ${tokens.color.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg, #C0A147, #9a7f2e)",
          color: "#020D25", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
        }}>
          <Sparkles size={14} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.color.text }}>Assistente IA</div>
          <div style={{ fontSize: "11px", color: tokens.color.textSubtle }}>Baseado nos modelos do escritório</div>
        </div>
        <button
          onClick={onClose}
          style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", color: tokens.color.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ padding: "12px 14px 0", flexShrink: 0 }}>
          <div style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 8 }}>
            Sugestões
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {suggestions.map((s) => {
              const isAccepted = accepted.has(s.field)
              return (
                <div key={s.field} style={{
                  padding: "10px 12px",
                  background: tokens.color.surface,
                  border: `1px solid ${isAccepted ? "rgba(192,161,71,0.3)" : tokens.color.border}`,
                  borderRadius: 10,
                  opacity: isAccepted ? 0.6 : 1,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 600, color: tokens.color.accent, display: "flex", alignItems: "center", gap: 4 }}>
                      <Sparkles size={9} strokeWidth={2} />
                      Sugestão · {s.label}
                    </span>
                    <button
                      onClick={() => handleAccept(s)}
                      disabled={isAccepted}
                      className={btn({ variant: isAccepted ? "ghost" : "secondary" })}
                      style={{ height: 22, fontSize: "11px", padding: "0 8px", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {isAccepted ? <><Check size={10} />Aceito</> : "Aceitar"}
                    </button>
                  </div>
                  <div style={{ fontSize: "12px", color: tokens.color.textMuted, lineHeight: 1.45 }}>
                    {s.value}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Chat history placeholder */}
      <div style={{ flex: 1, padding: "12px 14px", overflow: "auto", minHeight: 0 }}>
        <div style={{
          padding: "10px 12px", background: tokens.color.bgSoft,
          borderRadius: 10, fontSize: "12.5px", color: tokens.color.textMuted, lineHeight: 1.5,
        }}>
          <span style={{ color: tokens.color.accent, fontWeight: 500 }}>Assistente</span>
          <br />
          Olá! Posso ajudar a preencher os campos do contrato ou sugerir cláusulas. Descreva o que precisa abaixo.
        </div>
      </div>

      {/* Composer */}
      <div style={{ padding: "0 14px 16px", flexShrink: 0 }}>
        {/* Example chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setPrompt(p)}
              style={{
                fontSize: "11px", padding: "3px 9px", borderRadius: 999,
                border: `1px solid ${tokens.color.border}`,
                background: tokens.color.surface,
                color: tokens.color.textMuted, cursor: "pointer",
                fontFamily: tokens.font.sans,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <ChevronRight size={10} />
              {p}
            </button>
          ))}
        </div>

        <div style={{
          background: tokens.color.surface, border: `1px solid ${tokens.color.borderStrong}`,
          borderRadius: 12, padding: "8px 10px 6px", boxShadow: tokens.color.shadowSm,
        }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva o que precisa ajustar..."
            rows={2}
            style={{
              width: "100%", border: "none", outline: "none", resize: "none",
              background: "transparent", fontFamily: tokens.font.sans,
              fontSize: "12.5px", color: tokens.color.text, lineHeight: 1.5,
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4, borderTop: `1px solid ${tokens.color.border}` }}>
            <button
              className={btn({ variant: "primary" })}
              style={{ height: 26, width: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
