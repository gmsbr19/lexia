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
 *
 * `closed` lives in the OUTER scope (not just inside `start`) so `cancel()` —
 * called by the platform when the client disconnects mid-stream — can flip it
 * too (Fase 4, D6a). Without this, a client abort left `closed` stuck at
 * `false`; a later `emit()` (e.g. from the "text" delta handler, which runs
 * outside the awaited chain) could call `controller.enqueue` on an already
 * torn-down controller and throw inside an event callback.
 */
export function sseResponse(run: (emit: Emit) => Promise<void>): Response {
  const encoder = new TextEncoder()
  let closed = false
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit: Emit = (ev) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(encodeSse(ev)))
        } catch {
          // Controller already torn down (client gone) — stop emitting silently.
          closed = true
        }
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
        try {
          controller.close()
        } catch {
          // Already closed/errored (e.g. by cancel()) — nothing to do.
        }
      }
    },
    cancel() {
      // Client disconnected — stop enqueueing on this (already-closing) controller.
      closed = true
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
