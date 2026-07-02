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
  const fwdHost = req.headers.get("x-forwarded-host")
  if (fwdHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https"
    return `${proto.split(",")[0].trim()}://${fwdHost.split(",")[0].trim()}`
  }
  return new URL(req.url).origin
}
