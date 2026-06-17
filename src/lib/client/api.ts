"use client"

// Shared client mutation helper — the promotion of the per-component `send()`
// copies. Adds, on top of the plain fetch:
//   • in-flight lock keyed by method+url+body-hash (double-submit protection —
//     a second identical click joins the first request instead of repeating it)
//   • one automatic retry on network failure (safe: create payloads carry a
//     `requestId` the server uses for idempotency)
//   • network failure → toast "Sem conexão" with a "Tentar novamente" action
//   • 401 → redirect to /login
// Server validation errors (400 etc.) still throw, so callers keep their local
// inline error handling.
import { toast } from "@/lib/client/toast"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Idempotency key for create payloads — generate ONCE per form/modal instance
 *  (not per click) so double-clicks and retries map to the same server row. */
export function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

const inflight = new Map<string, Promise<unknown>>()

function bodyHash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

type SendOpts = {
  /** Send `body` as-is with this content type (e.g. "text/csv") instead of JSON. */
  contentType?: string
}

export async function apiSend<T = Record<string, unknown>>(
  url: string,
  method: string,
  body?: unknown,
  opts?: SendOpts,
): Promise<T> {
  const raw =
    body === undefined ? undefined : opts?.contentType && typeof body === "string" ? body : JSON.stringify(body)
  const key = `${method} ${url} ${raw === undefined ? "" : bodyHash(raw)}`

  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>

  const doFetch = () =>
    fetch(url, {
      method,
      headers: raw === undefined ? undefined : { "Content-Type": opts?.contentType ?? "application/json" },
      body: raw,
    })

  const exec = async (): Promise<T> => {
    let res: Response
    try {
      res = await doFetch()
    } catch {
      try {
        res = await doFetch() // auto-retry once — idempotent server-side
      } catch {
        toast("Sem conexão — tente novamente", {
          kind: "error",
          retry: () => {
            void apiSend(url, method, body, opts).catch(() => {})
          },
        })
        throw new ApiError("Sem conexão — tente novamente", 0)
      }
    }

    if (res.status === 401) {
      toast("Sessão expirada — faça login novamente", { kind: "error" })
      window.location.assign("/login")
      throw new ApiError("Não autenticado", 401)
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok || (data && typeof data.error === "string" && data.error)) {
      throw new ApiError(typeof data.error === "string" ? data.error : `Falha (${res.status})`, res.status)
    }
    return data as T
  }

  const p = exec().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
