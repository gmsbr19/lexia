// GET /api/whatsapp/eventos — Server-Sent Events da conexão DO USUÁRIO LOGADO.
// É por aqui que o QR (que se renova a cada ~20 s) e o código de pareamento
// chegam à página sem polling. Mesmo molde do stream de notificações
// (src/app/api/notificacoes/stream/route.ts): conexão longa, heartbeat, limpeza
// no abort.
//
// runtime nodejs é OBRIGATÓRIO: o bus mantém uma conexão LISTEN do Postgres no
// processo Node (ver src/lib/whatsapp/bus.ts).
import { AuthError, requireUser } from "@/lib/auth/session"
import { userIdPorEmail } from "@/lib/notificacoes/recipients"
import { assinarEventos } from "@/lib/whatsapp/bus"
import { getSessaoView, whatsappHabilitado } from "@/lib/whatsapp/sessoes"
import type { WhatsappEvento } from "@/lib/whatsapp/tipos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request): Promise<Response> {
  if (!whatsappHabilitado()) return new Response("Módulo de WhatsApp não configurado", { status: 404 })

  let userId: number | null = null
  try {
    const user = await requireUser()
    userId = await userIdPorEmail(user.email)
  } catch (e) {
    if (e instanceof AuthError) return new Response("Não autenticado", { status: 401 })
    throw e
  }
  if (!userId) return new Response("Não autenticado", { status: 401 })
  const uid = userId

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
  const sendEvent = (type: string, data: unknown) => send("event: " + type + "\ndata: " + JSON.stringify(data) + "\n\n")

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
      // Frame inicial: o estado atual, para a página hidratar sem outro fetch
      // (e para quem abriu a aba DEPOIS do último QR saber que está esperando).
      sendEvent("init", await getSessaoView(uid).catch(() => null))
      unsub = assinarEventos(uid, (evt: WhatsappEvento) => sendEvent("whatsapp", evt))
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
