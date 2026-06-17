// Microsoft Graph — token de aplicação (OAuth client credentials). SERVER ONLY.
// Reaproveitável por qualquer chamada Graph (e-mail agora; OneDrive depois).
// Usa o `fetch` global (Node 22) — sem dependências externas.

export interface GraphCreds {
  tenantId: string
  clientId: string
  clientSecret: string
}

interface CachedToken {
  token: string
  exp: number // epoch ms em que o token deixa de ser usável (com folga)
}

const cache = new Map<string, CachedToken>()
const SKEW_MS = 60_000 // renova ~60s antes de expirar

/** Obtém (e cacheia por tenant:client) um access token de aplicação do Graph. */
export async function getGraphToken(creds: GraphCreds): Promise<string> {
  const key = `${creds.tenantId}:${creds.clientId}`
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now()) return hit.token

  const url = `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: "https://graph.microsoft.com/.default",
  })
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Graph token falhou (${res.status}): ${detail.slice(0, 300)}`)
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error("Graph token: resposta sem access_token")
  const ttlMs = (data.expires_in ?? 3600) * 1000
  cache.set(key, { token: data.access_token, exp: Date.now() + ttlMs - SKEW_MS })
  return data.access_token
}

/** Limpa o cache de tokens (uso em testes). */
export function _resetGraphTokenCache(): void {
  cache.clear()
}
