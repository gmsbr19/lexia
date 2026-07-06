"use client"

// The chat engine: owns the thread, drives the streaming endpoints, and turns
// SSE events into render blocks (text deltas, tool chips, navigation, and
// confirmation cards). Shared by the popup and the full /lexia page.
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { SseEvent } from "@/lib/lexia/types"
import type { LexiaMensagemRow } from "@/lib/lexia/types"
import { streamLexia, LexiaStreamError } from "./sse-client"
import type { ClientAnexo } from "./anexos"
import type { LexiaAgentMode, LexiaModelo } from "@/lib/lexia/preferencias-core"
import type { Modificador } from "@/lib/lexia/agent/modificadores"
import type { MentionEntidade } from "./MentionPopover"
import type { ChatBlock, ChatMsg, DocumentoContexto } from "./types"

let seq = 0
const nextId = () => `m${++seq}`

/** Seleções vivas do composer enviadas por turno (a persona/instruções vêm do banco). */
export interface SendOpts {
  /** legado — equivale a modelo:'avancado' */
  opus?: boolean
  modelo?: LexiaModelo
  agentMode?: LexiaAgentMode
  autoMode?: boolean
  /** Contexto do documento aberto (só no painel embutido no editor flexível). */
  documento?: DocumentoContexto
  /** Entidades citadas por "@" no composer (Fase 7, D10). */
  contexto?: { entidades: MentionEntidade[] }
}

export interface UseLexia {
  messages: ChatMsg[]
  streaming: boolean
  conversaId: number | null
  send: (text: string, pagina?: string, anexos?: ClientAnexo[], opts?: SendOpts) => void
  decide: (acaoId: number, decisao: "confirmar" | "recusar") => void
  /** Resolve um ChoiceCard (tool perguntar_usuario, Fase 6). */
  responder: (acaoId: number, resposta: { selecionadas: string[]; outro?: string }) => void
  stop: () => void
  /** Reenvia a última pergunta (erro sem conteúdo útil ainda — Fase 4). */
  retry: () => void
  /** Retomar/Continuar/Reconectar (Fase 4) — mesma chamada p/ os 3 casos: pede
   *  ao servidor pra seguir de onde parou; a resposta vira uma NOVA linha
   *  colada à anterior (meta.continuacao). */
  continuar: () => void
  /** RetryMenu (Fase 5): descarta a última resposta e refaz a MESMA pergunta,
   *  opcionalmente com um ajuste de tom/tamanho ou o modelo avançado. */
  refazer: (modificador?: Modificador, modelo?: LexiaModelo) => void
  /** "Editar pergunta" (Fase 5): substitui o texto da última pergunta do usuário
   *  e refaz a partir dali — os turnos seguintes são descartados. */
  editarUltimaPergunta: (novoTexto: string) => void
  reset: () => void
  hydrate: (conversaId: number, mensagens: LexiaMensagemRow[]) => void
}

/** Disparado quando um turno termina (evento `done`) — NÃO em aborto/erro. Usado
 *  pela barra para avisar o usuário quando ela conclui em segundo plano. */
export interface UseLexiaOpts {
  onComplete?: (info: { conversaId: number | null; prompt: string; pendente: boolean; docPatch: boolean }) => void
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
  // Ref evita recriar runStream a cada render quando o callback muda (atualizada
  // num efeito — o React não permite mutar refs durante o render).
  const onCompleteRef = useRef(opts.onComplete)
  // Espelha as mensagens p/ ler o resumo do card de confirmação dentro de `decide`
  // sem recriar o callback (e sem efeitos colaterais dentro de updaters).
  const messagesRef = useRef(messages)
  useEffect(() => {
    onCompleteRef.current = opts.onComplete
    messagesRef.current = messages
  })
  // Mensagem assistant do turno em andamento — usado por `stop()` p/ marcar
  // "interrompida" otimisticamente (o servidor ainda persiste o texto parcial,
  // mas a conexão já caiu quando ele termina — o cliente nunca vê o `done`).
  const liveAssistantIdRef = useRef<string | null>(null)
  // Mensagem user (client id) recém-criada neste turno — o evento `start` traz o
  // id persistido (userMsgId) p/ gravar em `dbId` (habilita editar/refazer, Fase 5).
  const liveUserIdRef = useRef<string | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    const id = liveAssistantIdRef.current
    if (id) {
      setMessages((prev) => prev.map((m) => (m.id === id && m.role === "assistant" ? { ...m, meta: { ...m.meta, interrompida: true } } : m)))
    }
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
            ? { id: nextId(), role: "user", text: m.content, anexos: m.anexos, dbId: m.id }
            : {
                id: nextId(),
                role: "assistant",
                blocks: (m.blocks as ChatBlock[]) ?? [{ type: "text", text: m.content }],
                dbId: m.id,
                model: m.model,
                feedback: m.feedback,
                meta: m.meta ?? undefined,
              },
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
      liveAssistantIdRef.current = assistantId
      setStreaming(true)
      const blocks: ChatBlock[] = []

      const flush = () =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, blocks: [...blocks] } : m)))

      const onEvent = (ev: SseEvent) => {
        switch (ev.type) {
          case "start":
            setConversaId(ev.conversaId)
            convRef.current = ev.conversaId
            if (ev.userMsgId != null && liveUserIdRef.current) {
              const uid = liveUserIdRef.current
              setMessages((prev) => prev.map((m) => (m.id === uid && m.role === "user" ? { ...m, dbId: ev.userMsgId } : m)))
            }
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
          case "doc-patch":
            // Edições propostas ao documento aberto — o card "Aplicar" no painel do
            // editor aplica no editor vivo (a aplicação não acontece aqui).
            blocks.push({ type: "doc-patch", ops: ev.ops, campos: ev.campos })
            flush()
            break
          case "card":
            // Card de entidade/busca/insight, automático a partir de uma tool de leitura (Fase 3).
            blocks.push({ type: "card", card: ev.card })
            flush()
            break
          case "choice":
            // Pausa esperando o usuário escolher/responder (tool perguntar_usuario, Fase 6).
            blocks.push({
              type: "choice",
              acaoId: ev.acaoId,
              pergunta: ev.pergunta,
              opcoes: ev.opcoes,
              multipla: ev.multipla,
              permitirOutro: ev.permitirOutro,
              status: "pendente",
            })
            flush()
            break
          case "cut":
            // Resposta cortada por limite de tamanho — oferece "Continuar" (Fase 4).
            setMessages((prev) => prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, meta: { ...m.meta, truncada: true } } : m)))
            break
          case "thinking":
            // Delta do raciocínio (extended thinking) — acumulado p/ "Pensou por Xs" (Fase 6).
            break
          case "followups":
            // Chips de próxima ação extraídos do sentinela <sugestoes> (Fase 6).
            break
          case "error":
            blocks.push({ type: "notice", text: ev.mensagem, codigo: ev.codigo })
            flush()
            break
          case "done":
            // Conclusão limpa do turno (não dispara em aborto/erro). `pendente`
            // truthy = pausou esperando confirmação; `docPatch` = propôs edições ao
            // documento que o usuário ainda precisa aplicar (ambos = "ainda há ação").
            // dbId/model → habilitam feedback (PATCH) e o selo do modelo (ModelSeal).
            setMessages((prev) => prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, dbId: ev.mensagemId, model: ev.model } : m)))
            onCompleteRef.current?.({
              conversaId: convRef.current,
              prompt: lastPromptRef.current,
              pendente: ev.pendente != null,
              docPatch: blocks.some((b) => b.type === "doc-patch"),
            })
            break
        }
      }

      try {
        await streamLexia(url, body, onEvent, ctrl.signal)
      } catch (e) {
        if (!ctrl.signal.aborted) {
          blocks.push({
            type: "notice",
            text: e instanceof LexiaStreamError ? e.message : "Erro inesperado na LexIA",
            codigo: e instanceof LexiaStreamError ? e.codigo : "generico",
          })
          flush()
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null
        if (liveAssistantIdRef.current === assistantId) liveAssistantIdRef.current = null
        setStreaming(false)
      }
    },
    [router],
  )

  // Último pedido tentado — permite `retry()` reproduzir exatamente a MESMA
  // operação após um erro que não chegou a produzir conteúdo útil (offline/
  // sobrecarga/timeout/genérico — Fase 4). Cobre as duas origens possíveis:
  // um envio comum (`send`) ou um refazer/editar-pergunta (Fase 5) — sem isso,
  // "Tentar de novo" depois de um refazer que falhou reenviaria a pergunta
  // ERRADA (a última enviada por `send`, não a que acabou de ser refeita).
  type ReplayOp =
    | { kind: "send"; text: string; pagina?: string; anexos?: ClientAnexo[]; opts?: SendOpts }
    | { kind: "refazer"; texto: string; opts?: { modificador?: Modificador; modelo?: LexiaModelo } }
  const lastReplayRef = useRef<ReplayOp | null>(null)

  const send = useCallback(
    (text: string, pagina?: string, anexos?: ClientAnexo[], opts?: SendOpts) => {
      const t = text.trim()
      if ((!t && !anexos?.length) || abortRef.current) return
      lastPromptRef.current = t || "documento anexado"
      lastReplayRef.current = { kind: "send", text: t, pagina, anexos, opts }
      const userId = nextId()
      const assistantId = nextId()
      liveUserIdRef.current = userId
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", text: t, anexos: anexos?.length ? anexos : undefined },
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
          documento: opts?.documento,
          contexto: opts?.contexto,
        },
        assistantId,
      )
    },
    [runStream],
  )

  // Base comum de "Editar pergunta" e do RetryMenu (Fase 5): trunca localmente a
  // partir da última mensagem do usuário (removendo-a e tudo depois — a resposta
  // que ela gerou) e reenvia com o texto dado + um ajuste/modelo opcional. O
  // servidor descarta o mesmo trecho da conversa persistida (truncarConversaDesde)
  // antes de gravar o turno novo — sem branching, "reenviar substitui".
  const truncarERefazer = useCallback(
    (texto: string, opts?: { modificador?: Modificador; modelo?: LexiaModelo }) => {
      if (abortRef.current) return
      const msgs = messagesRef.current
      let idx = -1
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "user") {
          idx = i
          break
        }
      }
      if (idx < 0) return
      const alvo = msgs[idx] as Extract<ChatMsg, { role: "user" }>
      if (alvo.dbId == null) return // turno ainda não persistido — nada pra truncar
      const t = texto.trim()
      const anexosReenviar = alvo.anexos?.filter((a) => !!a.dataBase64)
      if (!t && !anexosReenviar?.length) return
      lastPromptRef.current = t || "documento anexado"
      lastReplayRef.current = { kind: "refazer", texto: t, opts }
      const userId = nextId()
      const assistantId = nextId()
      liveUserIdRef.current = userId
      setMessages((prev) => [
        ...prev.slice(0, idx),
        { id: userId, role: "user", text: t, anexos: anexosReenviar?.length ? anexosReenviar : undefined },
        { id: assistantId, role: "assistant", blocks: [] },
      ])
      void runStream(
        "/api/lexia/chat",
        {
          conversaId: convRef.current,
          mensagem: t,
          refazerDesdeMensagemId: alvo.dbId,
          modificador: opts?.modificador,
          modelo: opts?.modelo,
          anexos: anexosReenviar?.map((a) => ({ nome: a.nome, mimeType: a.mimeType, dataBase64: a.dataBase64! })),
        },
        assistantId,
      )
    },
    [runStream],
  )

  const retry = useCallback(() => {
    if (abortRef.current || !lastReplayRef.current) return
    const op = lastReplayRef.current
    if (op.kind === "send") send(op.text, op.pagina, op.anexos, op.opts)
    else truncarERefazer(op.texto, op.opts)
  }, [send, truncarERefazer])

  const refazer = useCallback(
    (modificador?: Modificador, modelo?: LexiaModelo) => {
      const alvo = [...messagesRef.current].reverse().find((m): m is Extract<ChatMsg, { role: "user" }> => m.role === "user")
      if (!alvo) return
      truncarERefazer(alvo.text, { modificador, modelo })
    },
    [truncarERefazer],
  )

  const editarUltimaPergunta = useCallback((novoTexto: string) => truncarERefazer(novoTexto), [truncarERefazer])

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

  // ChoiceCard (tool perguntar_usuario, Fase 6, D3) — mesmo padrão de decide(),
  // mas resolve com a RESPOSTA do usuário (nada é executado; o tool_result é o
  // JSON da escolha) via decisao:"responder".
  const responder = useCallback(
    (acaoId: number, resposta: { selecionadas: string[]; outro?: string }) => {
      if (abortRef.current) return
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant"
            ? { ...m, blocks: m.blocks.map((b) => (b.type === "choice" && b.acaoId === acaoId ? { ...b, status: "respondida", resposta } : b)) }
            : m,
        ),
      )
      const card = messagesRef.current
        .flatMap((m) => (m.role === "assistant" ? m.blocks : []))
        .find((b): b is Extract<ChatBlock, { type: "choice" }> => b.type === "choice" && b.acaoId === acaoId)
      lastPromptRef.current = card?.pergunta ?? "resposta da LexIA"
      const assistantId = nextId()
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", blocks: [] }])
      void runStream(`/api/lexia/acoes/${acaoId}`, { decisao: "responder", resposta }, assistantId)
    },
    [runStream],
  )

  const continuar = useCallback(() => {
    if (abortRef.current || !convRef.current) return
    lastPromptRef.current = "continuar a resposta"
    const assistantId = nextId()
    // meta.continuacao já nasce marcado (sabemos que é colada assim que a
    // criamos — sem esperar o servidor confirmar): o LexiaBubble a renderiza
    // sem Orb/cabeçalho, colada à mensagem anterior.
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", blocks: [], meta: { continuacao: true } }])
    void runStream(`/api/lexia/conversas/${convRef.current}/continuar`, {}, assistantId)
  }, [runStream])

  return { messages, streaming, conversaId, send, decide, responder, stop, retry, continuar, refazer, editarUltimaPergunta, reset, hydrate }
}
