// Token guard for the MCP endpoint (/api/mcp). PURE (the expected token is a
// parameter; the route reads it from env.LEXIA_MCP_TOKEN), so it is unit-testable.
//
// The claude.ai "Add custom connector" dialog may or may not offer a "Request
// headers" field (beta, limited orgs), so the token is accepted in two forms:
//   1. headers: `authorization` (with or without "Bearer "), `x-api-key`, `x-auth-token`;
//   2. the LAST path segment (…/api/mcp/<token>) — hence the catch-all route.
// Rules (same as site-auth.ts / jobs/guard.ts): constant-time compare with the
// length check BEFORE timingSafeEqual (it throws on different lengths); an
// absent/empty expected token ALWAYS denies; never log the token or the path.
// SERVER ONLY.
import { timingSafeEqual } from "node:crypto"

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf-8")
  const bb = Buffer.from(b, "utf-8")
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Every token candidate the request carries, in precedence order. */
export function tokenCandidates(req: Request): string[] {
  const out: string[] = []
  const auth = req.headers.get("authorization")
  if (auth) out.push(auth.replace(/^Bearer\s+/i, "").trim())
  for (const h of ["x-api-key", "x-auth-token"]) {
    const v = req.headers.get(h)
    if (v) out.push(v.trim())
  }
  try {
    const segs = new URL(req.url).pathname.split("/").filter(Boolean)
    const last = segs[segs.length - 1]
    if (last) out.push(decodeURIComponent(last))
  } catch {
    /* malformed URL/percent-encoding → no path candidate */
  }
  return out.filter((c) => c.length > 0)
}

/** Does the request carry the expected token (any accepted form)? */
export function mcpTokenOk(req: Request, expected: string | undefined): boolean {
  if (!expected) return false // disabled: never authenticate against an empty token
  // Evaluate every candidate (no early exit) so timing doesn't reveal which form matched.
  let ok = false
  for (const c of tokenCandidates(req)) if (safeEqual(c, expected)) ok = true
  return ok
}

/**
 * DNS-rebinding / CSRF belt (MCP spec: servers MUST validate Origin). The route is
 * outside src/proxy.ts, so this replaces the proxy's check. No Origin header
 * (server-to-server from Anthropic) ⇒ allowed; present ⇒ must match the real host.
 */
export function originOk(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return true
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host
  return originHost === host
}
