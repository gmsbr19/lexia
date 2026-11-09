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

/** Domínios de onde o conector do claude.ai legitimamente chama. */
const ORIGENS_CLAUDE = ["claude.ai", "claude.com", "anthropic.com"]

/**
 * Guarda de Origin (o spec do MCP pede validá-lo contra DNS rebinding). ATENÇÃO:
 * aqui o Origin NÃO é a fronteira de segurança — esta rota fica fora do
 * src/proxy.ts e não tem credencial ambiente (sem cookie de sessão): quem
 * autentica é o token. Uma página hostil não conhece o token, então sem ele a
 * resposta já é 401 e o Origin não acrescenta proteção. O ataque que o spec
 * mira (rebinding contra servidor LOCAL que confia no localhost) não se aplica a
 * um endpoint público autenticado por bearer.
 *
 * Por isso a regra é permissiva com quem tem motivo de chamar: sem Origin
 * (servidor-a-servidor) passa; Origin igual ao host real passa; os domínios do
 * Claude passam (o backend do claude.ai manda `Origin: https://claude.ai`, e
 * recusá-lo derruba o conector com 'Problema de conexão'); `extras` (env
 * LEXIA_MCP_ORIGENS, separada por vírgula) permite acrescentar hosts sem deploy.
 * Qualquer outro Origin explícito continua recusado com 403.
 */
export function originOk(req: Request, extras?: string): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return true // servidor-a-servidor não manda Origin
  let originHost: string
  try {
    originHost = new URL(origin).host.toLowerCase()
  } catch {
    return false // Origin malformado
  }
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host).toLowerCase()
  if (originHost === host) return true
  const lista = (extras ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (lista.includes(originHost)) return true
  // `.claude.ai` com o ponto: um host tipo `evilclaude.ai` NÃO casa.
  return ORIGENS_CLAUDE.some((d) => originHost === d || originHost.endsWith(`.${d}`))
}
