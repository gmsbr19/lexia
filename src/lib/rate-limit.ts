// In-memory sliding-window rate limiter. No deps — correct for a single Node
// process (the production topology: one systemd service). Keys are
// `email:routeGroup`; buckets are derived from the mutation action.
export class RateLimitError extends Error {}

export const RATE_LIMIT_MESSAGE = "Muitas requisições — aguarde um instante"

const hits = new Map<string, number[]>()

/** True when the call is allowed; false when the window is exhausted. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 2000) {
    for (const [k, v] of hits) if (v.every((t) => t <= windowStart)) hits.delete(k)
  }
  return true
}

type Bucket = { group: string; limit: number; windowMs: number }

/** Strict buckets for the expensive operations; everything else 60 writes/min. */
function bucketFor(action: string): Bucket {
  if (action.includes("bulk")) return { group: "bulk", limit: 10, windowMs: 60_000 }
  if (action.includes("reimport")) return { group: "reimport", limit: 2, windowMs: 600_000 }
  if (action.includes("import")) return { group: "import", limit: 5, windowMs: 60_000 }
  if (action.includes("generate")) return { group: "generate", limit: 6, windowMs: 60_000 }
  return { group: "write", limit: 60, windowMs: 60_000 }
}

/** Throws RateLimitError (→ 429) when `email` exhausted the action's bucket. */
export function assertRateLimit(email: string, action: string): void {
  const { group, limit, windowMs } = bucketFor(action)
  if (!rateLimit(`${email}:${group}`, limit, windowMs)) {
    throw new RateLimitError(RATE_LIMIT_MESSAGE)
  }
}
