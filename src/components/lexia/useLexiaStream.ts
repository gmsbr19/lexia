"use client"

// The chat engine: owns the thread, drives the streaming endpoints, and turns
// SSE events into render blocks (text deltas, tool chips, navigation, and
// confirmation cards). Shared by the popup and the full /lexia page.
import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { SseEvent } from "@/lib/lexia/types"
import type { LexiaMensagemRow } from "@/lib/lexia/types"
import { streamLexia, LexiaStreamError } from "./sse-client"
import type { ClientAnexo } from "./anexos"
import type { LexiaAgentMode, LexiaModelo } from "@/lib/lexia/preferencias-core"
import type { ChatBlock, ChatMsg } from "./types"

let seq = 0
const nextId = () => `m${++seq}`

/** Seleções vivas do composer enviadas por turno (a persona/instruções vêm do banco). */
export interface SendOpts {
  /** legado — equivale a modelo:'avancado' */
  opus?: boolean
  modelo?: LexiaModelo
  agentMode?: LexiaAgentMode
  autoMode?: boolean
}

export interface UseLexia {
  messages: ChatMsg[]
  streaming: boolean
  conversaId: number | null
  send: (text: string, pagina?: string, anexos?: ClientAnexo[], opts?: SendOpts) => void
  decide: (acaoId: number, decisao: "confirmar" | "recusar") => void
  stop: () => void
  reset: () => void
  hydrate: (conversaId: number, mensagens: LexiaMensagemRow[]) => void
}

/** Disparado quando um turno termina (evento `done`) — NÃO em aborto/erro. Usado
 *  pela barra para avisar o usuário quando ela conclui em segundo plano. */
export interface UseLexiaOpts {
  onComplete?: (info: { conversaId: number | null; prompt: string; pendente: boolean }) => void
}

export function useLexiaStream(initialConversaId: number | null = null, opts: UseLexiaOpts = {}): UseLexia {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [streaming, setStreaming] = useState(false)
  const [conversaId, setConversaId] = useState<number | null>(initialConversaId)
  const abortRef = useRef<AbortController | null>(null)
  const convRef = useRef<number | null>(initialConversaId)
  // Mantém o último pedido do usuário p/ compor o resumo do aviso de conclusão.
  const lastPromptRef = useRef("")
  // Ref evita recriar runStream a cada render quando o callback muda.
  const onCompleteRef = useRef(opts.onComplete)
  onCompleteRef.current = opts.onComplete
  // Espelha as mensagens p/ ler o resumo do card de confirmação dentro de `decide`
  // sem recriar o callback (e sem efeitos colaterais dentro de updaters).
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
  }, [])

  const reset = useCallback(() => {
    stop()
    setMessages([])
    setConversaId(null)
    convRef.current = null
  }, [stop])

  const hydrate = useCallback(
    (id: number, mensagens: LexiaMensagemRow[]) => {
      stop()
      setConversaId(id)
      convRef.current = id
      setMessages(
        mensagens.map((m): ChatMsg =>
          m.role === "user"
            ? { id: nextId(), role: "user", text: m.content, anexos: m.anexos }
            : { id: nextId(), role: "assistant", blocks: (m.blocks as ChatBlock[]) ?? [{ type: "text", text: m.content }] },
        ),
      )
    },
    [stop],
  )

  // Run a streaming turn, mutating the given assistant message's blocks live.
  const runStream = useCallback(
    async (url: string, body: unknown, assistantId: string) => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setStreaming(true)
      const blocks: ChatBlock[] = []

      const flush = () =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, blocks: [...blocks] } : m)))

      const onEvent = (ev: SseEvent) => {
        switch (ev.type) {
          case "start":
            setConversaId(ev.conversaId)
            convRef.current = ev.conversaId
            break
          case "text": {
            const last = blocks[blocks.length - 1]
            if (last && last.type === "text") last.text += ev.delta
            else if (ev.delta) blocks.push({ type: "text", text: ev.delta })
            flush()
            break
          }
          case "tool": {
            if (ev.status === "run") {
              blocks.push({ type: "tool", id: ev.id, name: ev.name, label: ev.label, status: "run" })
            } else {
              const chip = blocks.find((b) => b.type === "tool" && b.id === ev.id) as Extract<ChatBlock, { type: "tool" }> | undefined
              if (chip) chip.status = ev.status
              else blocks.push({ type: "tool", id: ev.id, name: ev.name, label: ev.label, status: ev.status })
            }
            flush()
            break
          }
          case "navigate":
            blocks.push({ type: "navigate", rota: ev.rota })
            flush()
            router.push(ev.rota)
            break
          case "link":
            blocks.push({ type: "link", rota: ev.rota, label: ev.label })
            flush()
            break
          case "confirm":
            blocks.push({
              type: "confirm",
              acaoId: ev.acaoId,
              toolName: ev.toolName,
              resumo: ev.resumo,
              payload: ev.payload,
              detalhes: ev.detalhes,
              status: "pendente",
            })
            flush()
            break
          case "error":
            blocks.push({ type: "notice", text: ev.mensagem })
            flush()
            break
          case "done":
            // Conclusão limpa do turno (não dispara em aborto/erro). `pendente`
            // truthy = pausou esperando confirmação (o usuário ainda precisa agir).
            onCompleteRef.current?.({
              conversaId: convRef.current,
              prompt: lastPromptRef.current,
              pendente: ev.pendente != null,
            })
            break
        }
      }

      try {
        await streamLexia(url, body, onEvent, ctrl.signal)
      } catch (e) {
        if (!ctrl.signal.aborted) {
          blocks.push({ type: "notice", text: e instanceof LexiaStreamError ? e.message : "Erro inesperado na LexIA" })
          flush()
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null
        setStreaming(false)
      }
    },
    [router],
  )

  const send = useCallback(
    (text: string, pagina?: string, anexos?: ClientAnexo[], opts?: SendOpts) => {
      const t = text.trim()
      if ((!t && !anexos?.length) || abortRef.current) return
      lastPromptRef.current = t || "documento anexado"
      const assistantId = nextId()
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text: t, anexos: anexos?.length ? anexos : undefined },
        { id: assistantId, role: "assistant", blocks: [] },
      ])
      const payloadAnexos = anexos?.map((a) => ({ nome: a.nome, mimeType: a.mimeType, dataBase64: a.dataBase64 }))
      void runStream(
        "/api/lexia/chat",
        {
          conversaId: convRef.current,
          mensagem: t,
          pagina,
          anexos: payloadAnexos,
          opus: opts?.opus || undefined,
          modelo: opts?.modelo,
          agentMode: opts?.agentMode,
          autoMode: opts?.autoMode,
        },
        assistantId,
      )
    },
    [runStream],
  )

  const decide = useCallback(
    (acaoId: number, decisao: "confirmar" | "recusar") => {
      if (abortRef.current) return
      // Optimistically reflect the decision on the card.
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant"
            ? {
                ...m,
                blocks: m.blocks.map((b) =>
                  b.type === "confirm" && b.acaoId === acaoId
                    ? { ...b, status: decisao === "confirmar" ? "confirmada" : "recusada" }
                    : b,
                ),
              }
            : m,
        ),
      )
      // Resumo do turno de retomada = o que o card de confirmação descrevia (o
      // `send` original não vale aqui), p/ o aviso de conclusão em segundo plano.
      const card = messagesRef.current
        .flatMap((m) => (m.role === "assistant" ? m.blocks : []))
        .find((b): b is Extract<ChatBlock, { type: "confirm" }> => b.type === "confirm" && b.acaoId === acaoId)
      lastPromptRef.current = card?.resumo ?? "ação da LexIA"
      const assistantId = nextId()
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", blocks: [] }])
      void runStream(`/api/lexia/acoes/${acaoId}`, { decisao }, assistantId)
    },
    [runStream],
  )

  return { messages, streaming, conversaId, send, decide, stop, reset, hydrate }
}
