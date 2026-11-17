// Async-context store for the current HTTP request origin. Set by route handlers
// via withRequestOrigin so that notification email links auto-derive the public
// URL without needing to thread it through every mutation and trigger call.
// Cron jobs and other non-request contexts will see null (→ fall back to AUTH_URL).
import { AsyncLocalStorage } from "node:async_hooks"

const store = new AsyncLocalStorage<string>()

/** Run `fn` with `origin` available to any async code it spawns.
 *  Works for both sync (returns Response) and async (returns Promise<Response>) callers. */
export function withRequestOrigin<T>(origin: string, fn: () => T): T {
  return store.run(origin, fn)
}

/** Returns the origin of the current request, or null outside a request context. */
export function currentRequestOrigin(): string | null {
  return store.getStore() ?? null
}

/**
 * Extracts the real public origin from an HTTP request, respecting reverse-proxy
 * headers set by ngrok, Caddy, or nginx (x-forwarded-host / x-forwarded-proto).
 * Falls back to req.url origin when no forwarded headers are present (direct access).
 */
export function resolveRequestOrigin(req: Request): string {
  return originFromHeaders(req.headers) ?? new URL(req.url).origin
}

/**
 * Mesma derivação a partir de um `Headers` solto — para Server Components, que
 * têm `headers()` mas não um Request. Usada pela tela de autorização OAuth, onde
 * a origem precisa bater EXATAMENTE com o issuer dos metadados.
 * Sem `x-forwarded-host` cai no `host` (acesso direto, ex.: dev em localhost),
 * e o protocolo só assume http quando o host é claramente local.
 */
export function originFromHeaders(h: Headers): string | null {
  const host = (h.get("x-forwarded-host") ?? h.get("host"))?.split(",")[0]?.trim()
  if (!host) return null
  const fwdProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)
  return `${fwdProto ?? (local ? "http" : "https")}://${host}`
}
