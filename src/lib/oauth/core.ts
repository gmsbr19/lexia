// Metade PURA do servidor de autorização OAuth 2.1 do MCP: hashes, PKCE,
// allowlist de redirect_uri, URIs canônicas, documentos de metadados e o header
// WWW-Authenticate. Sem Prisma, sem next/server e sem ler env (o chamador passa
// os extras), então é unit-testável — mesmo padrão de lib/mcp/auth.ts.
//
// Decisões que valem registrar:
//  • Token OPACO (não JWT). A linha em OAuthToken carrega usuário, cliente e
//    `resource`, então a validação de audiência que o spec do MCP exige é a
//    própria consulta — não há assinatura para verificar nem chave para rodar.
//  • Só o sha256 do segredo é persistido (igual a ConviteAcesso.tokenHash).
//  • PKCE S256 obrigatório: `plain` é recusado, mesmo que o cliente peça.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

/** Vida útil dos artefatos. O spec pede access token curto; o refresh é rotativo. */
export const CODE_TTL_S = 300 // 5 min — só precisa cobrir o redirect + a troca
export const ACCESS_TTL_S = 3600 // 1 h (o brief fixou "cerca de 1 h")
export const REFRESH_TTL_S = 60 * 60 * 24 * 30 // 30 dias

/** O único escopo que existe hoje: agir no Lexia como o dono do token. */
export const SCOPE_PADRAO = "lexia.mcp"

/** sha256 hex — usado para code, access token, refresh token e client_secret. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

/** Segredo aleatório url-safe de alta entropia (32 bytes → base64url). */
export function gerarSegredo(bytes = 32): string {
  return randomBytes(bytes).toString("base64url")
}

/** Comparação em tempo constante com checagem de tamanho ANTES (timingSafeEqual lança). */
export function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf-8")
  const bb = Buffer.from(b, "utf-8")
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Já passou da validade? */
export function expirou(expiraEm: Date, agora: Date = new Date()): boolean {
  return expiraEm.getTime() <= agora.getTime()
}

/** `expiraEm` a partir de agora + segundos. */
export function expiraEmSegundos(segundos: number, agora: Date = new Date()): Date {
  return new Date(agora.getTime() + segundos * 1000)
}

// ── PKCE (RFC 7636, só S256) ────────────────────────────────────────────────

/** base64url(sha256(verifier)) — o valor que o cliente manda como code_challenge. */
export function desafioS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url")
}

/**
 * O `code_verifier` apresentado na troca casa com o `code_challenge` guardado?
 * Só S256. O RFC exige verifier de 43–128 caracteres do alfabeto url-safe — um
 * verifier fora disso é recusado antes de qualquer hash.
 */
export function pkceConfere(verifier: string, challengeGuardado: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false
  return igualSeguro(desafioS256(verifier), challengeGuardado)
}

// ── URIs canônicas ──────────────────────────────────────────────────────────

/** Remove a barra final para a comparação de issuer/resource ser exata. */
export function semBarraFinal(url: string): string {
  return url.replace(/\/+$/, "")
}

/** O recurso protegido (RFC 8707): a URI canônica do endpoint MCP. */
export function recursoCanonico(base: string): string {
  return `${semBarraFinal(base)}/api/mcp`
}

/**
 * O `resource` que o cliente mandou aponta para este servidor? Aceita a URI
 * canônica, a mesma com barra final e a raiz do host (clientes normalizam de
 * formas diferentes); outro host/caminho é recusado. Ausente passa: na v1
 * existe um único recurso, e recusar derrubaria cliente que não manda o campo.
 */
export function recursoConfere(resource: string | null | undefined, base: string): boolean {
  if (!resource) return true
  const alvo = semBarraFinal(resource)
  return alvo === recursoCanonico(base) || alvo === semBarraFinal(base)
}

// ── Allowlist de redirect_uri ───────────────────────────────────────────────
// O endpoint de Registro Dinâmico é PÚBLICO (é assim que o claude.ai registra o
// cliente sozinho). Sem allowlist, qualquer um na internet registraria um
// redirect_uri próprio e o /oauth/authorize viraria um open redirector capaz de
// vazar o código de autorização. Então: domínios do Claude com o caminho exato
// de callback, loopback (clientes locais, ex. Claude Code), e o que o
// administrador acrescentar em LEXIA_OAUTH_REDIRECTS.

/** Caminho de callback publicado pela Anthropic para os apps hospedados do Claude. */
const CALLBACK_CLAUDE = "/api/mcp/auth_callback"
const DOMINIOS_CLAUDE = ["claude.ai", "claude.com", "anthropic.com"]
const HOSTS_LOOPBACK = ["localhost", "127.0.0.1", "::1"]

function dominioDoClaude(host: string): boolean {
  return DOMINIOS_CLAUDE.some((d) => host === d || host.endsWith(`.${d}`))
}

/**
 * O redirect_uri pode ser registrado? `extras` é a lista crua da env (separada
 * por vírgula) com URIs permitidas literalmente.
 */
export function redirectUriPermitido(uri: string, extras?: string): boolean {
  const lista = (extras ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (lista.includes(uri)) return true

  let u: URL
  try {
    u = new URL(uri)
  } catch {
    return false
  }
  // O spec proíbe fragmento e exige HTTPS ou loopback.
  if (u.hash) return false
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (HOSTS_LOOPBACK.includes(host)) return u.protocol === "http:" || u.protocol === "https:"
  if (u.protocol !== "https:") return false
  return dominioDoClaude(host) && u.pathname === CALLBACK_CLAUDE
}

/** Guardadas separadas por espaço (nenhuma URI válida contém espaço). */
export function serializarRedirects(uris: string[]): string {
  return uris.join(" ")
}

export function parsearRedirects(s: string): string[] {
  return s.split(/\s+/).filter(Boolean)
}

/** Comparação EXATA contra as registradas, como o spec exige (nunca por prefixo). */
export function redirectRegistrado(uri: string, registradas: string): boolean {
  return parsearRedirects(registradas).some((r) => igualSeguro(r, uri))
}

/** Monta a URL de retorno com code+state (ou com erro), preservando a query da própria URI. */
export function urlDeRetorno(redirectUri: string, params: Record<string, string | undefined>): string {
  const u = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v)
  return u.toString()
}

// ── Metadados ───────────────────────────────────────────────────────────────

/**
 * RFC 9728. `authorization_servers` aponta para o próprio Lexia: aqui o Resource
 * Server e o Authorization Server são o mesmo app.
 */
export function metadataRecursoProtegido(base: string): Record<string, unknown> {
  const raiz = semBarraFinal(base)
  return {
    resource: recursoCanonico(raiz),
    authorization_servers: [raiz],
    scopes_supported: [SCOPE_PADRAO],
    bearer_methods_supported: ["header"],
    resource_name: "Lexia — NCM Advogados",
  }
}

/**
 * RFC 8414. ATENÇÃO: `issuer` tem de ser idêntico à base usada para montar a URL
 * do well-known, senão o cliente MUST NOT usar o documento.
 */
export function metadataServidorAutorizacao(base: string): Record<string, unknown> {
  const raiz = semBarraFinal(base)
  return {
    issuer: raiz,
    authorization_endpoint: `${raiz}/oauth/authorize`,
    token_endpoint: `${raiz}/oauth/token`,
    registration_endpoint: `${raiz}/oauth/register`,
    revocation_endpoint: `${raiz}/oauth/revoke`,
    scopes_supported: [SCOPE_PADRAO],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    // S256 e nada mais: `plain` é recusado na troca (ver pkceConfere).
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
  }
}

/** URL do documento de recurso protegido, na forma path-aware do RFC 9728. */
export function urlMetadataRecurso(base: string): string {
  return `${semBarraFinal(base)}/.well-known/oauth-protected-resource/api/mcp`
}

/**
 * Header do 401 que inicia o fluxo no cliente. Exemplo:
 *   Bearer resource_metadata="https://host/.well-known/oauth-protected-resource/api/mcp", scope="lexia.mcp"
 */
export function wwwAuthenticate(
  base: string,
  erro?: "invalid_token" | "insufficient_scope",
  descricao?: string,
): string {
  const partes = [`resource_metadata="${urlMetadataRecurso(base)}"`, `scope="${SCOPE_PADRAO}"`]
  if (erro) partes.unshift(`error="${erro}"`)
  if (descricao) partes.push(`error_description="${descricao.replace(/"/g, "")}"`)
  return `Bearer ${partes.join(", ")}`
}

/** Extrai o bearer do header Authorization (o spec proíbe token na query string). */
export function bearerDoHeader(header: string | null): string | null {
  if (!header) return null
  const m = /^Bearer\s+(.+)$/i.exec(header.trim())
  const t = m?.[1]?.trim()
  return t ? t : null
}
