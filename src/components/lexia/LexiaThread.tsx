"use client"

// Scrollable message list. Fase 4 (R1): auto-stick só quando o usuário JÁ está
// perto do fim (<28px) — rolar pra cima pra ler não é mais interrompido a cada
// delta; um pill "↓ Nova resposta" reancora quando a resposta cresce fora de
// vista. Região aria-live polite anuncia o streaming p/ leitores de tela.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Icon } from "@/components/crm/crm-icons"
import "./lexia.css"
import type { LexiaPersona, LexiaModelo } from "@/lib/lexia/preferencias-core"
import type { Modificador } from "@/lib/lexia/agent/modificadores"
import { LexiaBubble } from "./LexiaBubble"
import { isNearBottom } from "./robustez"
import type { DocPatchPayload } from "./DocPatchCard"
import type { ChatMsg } from "./types"

export function LexiaThread({
  messages,
  streaming,
  persona,
  onDecide,
  onResponder,
  onDocAccept,
  autoApplyDoc,
  onRetry,
  onContinuar,
  onRefazer,
  onEditarPergunta,
  onFollowupPick,
  empty,
  padding = "18px 16px",
}: {
  messages: ChatMsg[]
  streaming: boolean
  persona?: LexiaPersona
  onDecide: (acaoId: number, decisao: "confirmar" | "recusar") => void
  /** Resolve um ChoiceCard (tool perguntar_usuario, Fase 6). */
  onResponder: (acaoId: number, resposta: { selecionadas: string[]; outro?: string }) => void
  onDocAccept?: (payload: DocPatchPayload) => void
  autoApplyDoc?: boolean
  onRetry?: () => void
  onContinuar?: () => void
  /** RetryMenu (Fase 5) — refaz a última resposta. */
  onRefazer?: (modificador?: Modificador, modelo?: LexiaModelo) => void
  /** "Editar pergunta" (Fase 5) — substitui a última pergunta do usuário. */
  onEditarPergunta?: (novoTexto: string) => void
  /** Clique num chip de "Próximos passos" (Fase 6) — preenche o composer. */
  onFollowupPick?: (texto: string) => void
  empty?: ReactNode
  padding?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)

  const checkAtBottom = useCallback(() => {
    const el = ref.current
    if (!el) return true
    return isNearBottom(el.scrollHeight, el.scrollTop, el.clientHeight)
  }, [])

  // Auto-stick: só rola pro fim se o usuário JÁ estava perto dele — rolar pra
  // cima pra reler o histórico não é mais desfeito a cada delta de streaming.
  useEffect(() => {
    const el = ref.current
    if (el && atBottom) el.scrollTop = el.scrollHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, streaming])

  const onScroll = () => setAtBottom(checkAtBottom())
  const jumpToBottom = () => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    setAtBottom(true)
  }

  // Aviso jurídico discreto — só na 1ª resposta completa da conversa.
  const firstAssistantId = useMemo(() => messages.find((m) => m.role === "assistant" && m.blocks.length > 0)?.id, [messages])
  // "Editar pergunta" e "Tentar de novo" (Fase 5) só valem na ÚLTIMA pergunta/
  // resposta — refazer uma mais antiga descartaria turnos reais vindos depois
  // (sem branching: reenviar sempre substitui a partir dali).
  const lastUserId = useMemo(() => [...messages].reverse().find((m) => m.role === "user")?.id, [messages])
  const lastAssistantId = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant")?.id, [messages])

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex" }}>
      <div
        ref={ref}
        onScroll={onScroll}
        aria-live="polite"
        aria-relevant="additions text"
        style={{ flex: 1, overflowY: "auto", padding, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}
      >
        {messages.length === 0 && empty ? (
          <div style={{ margin: "auto 0" }}>{empty}</div>
        ) : (
          messages.map((m, i) => (
            <LexiaBubble
              key={m.id}
              msg={m}
              streaming={streaming}
              live={streaming && i === messages.length - 1}
              persona={persona}
              showDisclaimer={m.id === firstAssistantId}
              isLastUser={m.id === lastUserId}
              isLastAssistant={m.id === lastAssistantId}
              onDecide={onDecide}
              onResponder={onResponder}
              onDocAccept={onDocAccept}
              autoApplyDoc={autoApplyDoc}
              onRetry={onRetry}
              onContinuar={onContinuar}
              onRefazer={onRefazer}
              onEditarPergunta={onEditarPergunta}
              onFollowupPick={onFollowupPick}
            />
          ))
        )}
      </div>
      {streaming && !atBottom && (
        <button
          onClick={jumpToBottom}
          style={{
            position: "absolute",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: 30,
            padding: "0 12px",
            borderRadius: 999,
            border: "1px solid var(--border-strong)",
            background: "var(--bg-elevated)",
            color: "var(--text)",
            fontSize: 12.5,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm, 0 4px 14px rgba(2,13,37,0.18))",
          }}
        >
          <Icon name="chevronDown" size={13} strokeWidth={2.4} />
          Nova resposta
        </button>
      )}
    </div>
  )
}
