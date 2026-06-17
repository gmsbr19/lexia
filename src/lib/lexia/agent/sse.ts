// Server-Sent Events plumbing for the LexIA streaming endpoints. SERVER ONLY.
import { UserError } from "@/lib/errors"
import type { Emit, SseEvent } from "./types"

/** Pure encoder (unit-tested): one SSE frame per event. */
export function encodeSse(ev: SseEvent): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`
}

/**
 * Wrap an async producer in a streaming `Response`. The producer drives the
 * turn and emits events; if it throws without having emitted its own `error`,
 * we surface a last-resort PT-BR error frame before closing.
 */
export function sseResponse(run: (emit: Emit) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const emit: Emit = (ev) => {
        if (closed) return
        controller.enqueue(encoder.encode(encodeSse(ev)))
      }
      try {
        await run(emit)
      } catch (e) {
        emit({
          type: "error",
          mensagem: e instanceof UserError ? e.message : "Erro inesperado na LexIA",
        })
      } finally {
        closed = true
        controller.close()
      }
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
