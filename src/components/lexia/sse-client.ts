"use client"

// Browser SSE client for the LexIA streaming endpoints. apiSend is JSON-only;
// this is its streaming sibling — POST a body, read the event stream, 401 →
// /login (parity), AbortController for the Parar button.
import type { ErroCodigo, SseEvent } from "@/lib/lexia/types"

export class LexiaStreamError extends Error {
  codigo?: ErroCodigo
  constructor(message: string, codigo?: ErroCodigo) {
    super(message)
    this.codigo = codigo
  }
}

/**
 * POST `body` to `url` and invoke `onEvent` for each SSE frame until the stream
 * ends or `signal` aborts. Resolves when the stream closes.
 */
export async function streamLexia(
  url: string,
  body: unknown,
  onEvent: (ev: SseEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
  } catch {
    if (signal.aborted) return
    throw new LexiaStreamError("Você está offline. Verifique a rede e tente de novo.", "offline")
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.assign("/login")
    throw new LexiaStreamError("Por segurança, sua sessão terminou. Entre de novo para continuar.", "sessao")
  }
  if (!res.ok || !res.body) {
    // Non-stream error (e.g. 429 JSON) — surface its message.
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    onEvent({ type: "error", mensagem: data.error || `Falha (${res.status})`, codigo: "generico" })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ""
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        const dataLine = frame.split("\n").find((l) => l.startsWith("data:"))
        if (!dataLine) continue
        try {
          onEvent(JSON.parse(dataLine.slice(5).trim()) as SseEvent)
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  } catch {
    if (!signal.aborted) throw new LexiaStreamError("Salvei o trecho acima. Reconecte para continuar de onde parei.", "stream")
  }
}
