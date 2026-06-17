// GET /api/notificacoes/stream — Server-Sent Events em tempo real das
// notificações do usuário logado. Reusa o padrão de ReadableStream+TextEncoder
// da LexIA (src/lib/lexia/agent/sse.ts), mas é uma conexão LONGA: assina o bus
// em processo e empurra cada evento até o cliente abortar.
//
// runtime nodejs é OBRIGATÓRIO — o bus EventEmitter vive no processo Node (o
// runtime Edge não o compartilharia). force-dynamic + os headers no-cache evitam
// qualquer buffering/cache (o Caddy auto-desabilita buffering p/ text/event-stream).
import { AuthError, requireUser } from "@/lib/auth/session"
import { subscribe } from "@/lib/notificacoes/bus"
import { contarNaoLidas } from "@/lib/notificacoes/queries"
import type { NotificacaoEvent } from "@/lib/notificacoes/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request): Promise<Response> {
  let email: string
  try {
    email = (await requireUser()).email
  } catch (e) {
    if (e instanceof AuthError) return new Response("Não autenticado", { status: 401 })
    throw e
  }

  const encoder = new TextEncoder()
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let unsub: (() => void) | null = null
  let closed = false

  const send = (s: string) => {
    if (closed || !controllerRef) return
    try {
      controllerRef.enqueue(encoder.encode(s))
    } catch {
      /* controller já fechado */
    }
  }
  const sendEvent = (type: string, data: unknown) => send(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)

  const cleanup = () => {
    if (closed) return
    closed = true
    if (heartbeat) clearInterval(heartbeat)
    if (unsub) unsub()
    try {
      controllerRef?.close()
    } catch {
      /* já fechado */
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controllerRef = controller
      // Frame inicial: contagem de não-lidas → o sino hidrata sem outro fetch.
      const naoLidas = await contarNaoLidas(email).catch(() => 0)
      sendEvent("init", { naoLidas })
      // Assina o bus por usuário (entrega já filtrada por e-mail).
      unsub = subscribe(email, (evt: NotificacaoEvent) => sendEvent("notificacao", evt))
      // Heartbeat (comentário SSE) p/ não cair em timeouts de proxy ociosos.
      heartbeat = setInterval(() => send(": ping\n\n"), 25_000)
      req.signal.addEventListener("abort", cleanup)
      if (req.signal.aborted) cleanup()
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
