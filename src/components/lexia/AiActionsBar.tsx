"use client"

// LexIA · Chat — ações de mensagem (handoff, "100% novo"). Barra discreta que
// só aparece no hover do grupo da mensagem: Copiar, Tentar de novo (RetryMenu,
// Fase 5 — só na última resposta) e feedback 👍👎. Monocromática — sem dourado
// (é utilitária, não é "marca"). O selo do modelo (proveniência de IA, dourado
// legítimo) mora ao lado, no mesmo rodapé da resposta.
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { lexiaFeedback } from "@/components/crm/crm-api"
import { RetryMenu, type RetryPickId } from "./RetryMenu"
import type { Modificador } from "@/lib/lexia/agent/modificadores"
import type { LexiaModelo } from "@/lib/lexia/preferencias-core"
import "./cc/cc.css"

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus",
  "claude-sonnet-4-6": "Sonnet",
  "claude-haiku-4-5": "Haiku",
}

/** Selo "respondido por Claude X" — dourado é legítimo aqui (proveniência de IA). */
export function ModelSeal({ model }: { model?: string | null }) {
  if (!model) return null
  const label = MODEL_LABEL[model] ?? model
  return (
    <span className="cc-seal" title={`Respondido por Claude ${label}`}>
      <Icon name="sparkles" size={10} strokeWidth={2} style={{ color: "var(--accent)" }} />
      {label}
    </span>
  )
}

export function AiActionsBar({
  text,
  mensagemId,
  initialFeedback,
  onRefazer,
}: {
  /** Texto completo da resposta (todos os blocos de texto concatenados). */
  text: string
  /** id da mensagem persistida — sem ele (turno ainda não fechou) o feedback fica desabilitado. */
  mensagemId?: number
  initialFeedback?: "up" | "down" | null
  /** Presente só na ÚLTIMA resposta (refazer mais antigas descartaria turnos reais depois dela). */
  onRefazer?: (modificador?: Modificador, modelo?: LexiaModelo) => void
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(initialFeedback ?? null)
  const [copied, setCopied] = useState(false)
  const [retryOpen, setRetryOpen] = useState(false)

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(text)
    } catch {
      /* degrada em silêncio */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const marcar = (v: "up" | "down") => {
    if (!mensagemId) return
    const next = feedback === v ? null : v
    setFeedback(next) // otimista
    void lexiaFeedback(mensagemId, next).catch(() => setFeedback(feedback))
  }

  const pickRetry = (id: RetryPickId) => {
    setRetryOpen(false)
    if (id === "opus") onRefazer?.(undefined, "avancado")
    else if (id === "again") onRefazer?.()
    else onRefazer?.(id)
  }

  return (
    <div className="cc-msgactions" style={{ position: "relative" }}>
      <button className="cc-actbtn" title="Copiar resposta" onClick={copy} style={copied ? { color: "var(--ok)" } : undefined}>
        <Icon name={copied ? "check" : "copy"} size={13} strokeWidth={1.9} />
      </button>
      {onRefazer && (
        <button className="cc-actbtn" title="Tentar de novo" onClick={() => setRetryOpen((s) => !s)} aria-haspopup="menu" aria-expanded={retryOpen} style={retryOpen ? { color: "var(--text)" } : undefined}>
          <Icon name="refreshCw" size={13} strokeWidth={1.9} />
        </button>
      )}
      <span style={{ width: 1, height: 14, background: "var(--border)", margin: "0 3px" }} />
      <button className="cc-actbtn" title="Boa resposta" onClick={() => marcar("up")} disabled={!mensagemId} style={feedback === "up" ? { color: "var(--ok)" } : undefined}>
        <Icon name="thumbsUp" size={13} strokeWidth={1.9} />
      </button>
      <button className="cc-actbtn" title="Resposta ruim" onClick={() => marcar("down")} disabled={!mensagemId} style={feedback === "down" ? { color: "var(--crit)" } : undefined}>
        <Icon name="thumbsDown" size={13} strokeWidth={1.9} />
      </button>
      {retryOpen && onRefazer && <RetryMenu onPick={pickRetry} onClose={() => setRetryOpen(false)} />}
    </div>
  )
}
