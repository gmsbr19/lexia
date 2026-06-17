"use client"

// Full-page LexIA (claude.ai-style): conversation sidebar + wide chat pane.
// Reads ?conversa=<id> to open a thread. Shares the same chat kit as the popup.
import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Icon } from "@/components/crm/crm-icons"
import { crmDate } from "@/components/crm/crm-fmt"
import { lexiaConversa, lexiaConversas, lexiaDeleteConversa } from "@/components/crm/crm-api"
import type { LexiaConversaRow } from "@/components/crm/crm-types"
import { Composer } from "./Composer"
import { LexiaThread } from "./LexiaThread"
import { Suggestions, contextChips } from "./Suggestions"
import { useLexiaStream } from "./useLexiaStream"

const GOLD_GRAD = "var(--brand-gold)"

export function LexiaPage() {
  const router = useRouter()
  const params = useSearchParams()
  const initial = Number(params.get("conversa")) || null

  const { messages, streaming, conversaId, send, decide, stop, reset, hydrate } = useLexiaStream()
  const [conversas, setConversas] = useState<LexiaConversaRow[]>([])

  const refreshList = useCallback(() => {
    lexiaConversas()
      .then(setConversas)
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshList()
  }, [refreshList])

  // Open the conversation from the URL once on mount.
  useEffect(() => {
    if (!initial) return
    let alive = true
    lexiaConversa(initial)
      .then((det) => alive && hydrate(det.id, det.mensagens))
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the list fresh as new conversations are created / titled.
  useEffect(() => {
    if (conversaId) refreshList()
  }, [conversaId, messages.length, refreshList])

  const open = useCallback(
    async (id: number) => {
      try {
        const det = await lexiaConversa(id)
        hydrate(det.id, det.mensagens)
        router.replace(`/lexia?conversa=${id}`)
      } catch {
        /* ignore */
      }
    },
    [hydrate, router],
  )

  const novo = useCallback(() => {
    reset()
    router.replace("/lexia")
  }, [reset, router])

  const remover = useCallback(
    async (id: number, e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        await lexiaDeleteConversa(id)
        if (id === conversaId) novo()
        refreshList()
      } catch {
        /* ignore */
      }
    },
    [conversaId, novo, refreshList],
  )

  return (
    <div style={{ height: "100%", display: "flex", minHeight: 0, background: "var(--bg)" }}>
      {/* conversation sidebar */}
      <aside
        style={{
          width: 268,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--bg-soft)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div style={{ padding: 14 }}>
          <button onClick={novo} className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start", height: 38 }}>
            <Icon name="plus" size={15} />
            Nova conversa
          </button>
        </div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 18px 8px" }}>
          Recentes
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 12px", minHeight: 0 }}>
          {conversas.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "8px 8px" }}>Nenhuma conversa ainda.</div>
          ) : (
            conversas.map((c) => {
              const active = c.id === conversaId
              return (
                <div
                  key={c.id}
                  onClick={() => open(c.id)}
                  className="lx-conv"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: active ? "var(--accent-soft)" : "transparent",
                    marginBottom: 2,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: active ? "var(--accent)" : "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.titulo || "Conversa sem título"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{crmDate(c.atualizadaEm)}</div>
                  </div>
                  <button
                    onClick={(e) => remover(c.id, e)}
                    title="Excluir"
                    className="btn btn-ghost"
                    style={{ width: 26, height: 26, padding: 0, borderRadius: 6, color: "var(--text-subtle)", flexShrink: 0 }}
                  >
                    <Icon name="trash2" size={13} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* chat pane */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: GOLD_GRAD,
              color: "#020D25",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <Icon name="sparkles" size={16} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em" }}>LexIA</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0 }}>
          <div style={{ flex: 1, width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <LexiaThread
              messages={messages}
              streaming={streaming}
              onDecide={decide}
              padding="26px 22px"
              empty={<Suggestions chips={contextChips("lexia", false)} onPick={(c) => send(c, "lexia")} />}
            />
            <Composer onSend={(t, anexos) => send(t, "lexia", anexos)} onStop={stop} streaming={streaming} />
          </div>
        </div>
      </div>
    </div>
  )
}
