// Endpoint de token (OAuth 2.1) — PÚBLICO, excluído do gate em src/proxy.ts
// (o claude.ai chama servidor-a-servidor, sem cookie, e com Origin próprio).
// Aceita os dois grant types do fluxo: authorization_code (com PKCE) e
// refresh_token (rotativo). Nunca devolve mensagem interna: só os códigos de
// erro da RFC 6749, que é o que o cliente sabe interpretar.
import { NextResponse } from "next/server"
import { log } from "@/lib/log"
import { OAuthError, oauthLigado, renovar, trocarCodigo } from "@/lib/oauth/fluxo"
import { rateLimit } from "@/lib/rate-limit"
import { resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** O corpo é form-urlencoded pelo spec; aceitamos JSON também por tolerância. */
async function lerParams(req: Request): Promise<URLSearchParams> {
  const tipo = req.headers.get("content-type") ?? ""
  const texto = await req.text()
  if (tipo.includes("application/json")) {
    try {
      const obj = JSON.parse(texto || "{}") as Record<string, unknown>
      const sp = new URLSearchParams()
      for (const [k, v] of Object.entries(obj)) if (typeof v === "string") sp.set(k, v)
      return sp
    } catch {
      return new URLSearchParams()
    }
  }
  return new URLSearchParams(texto)
}

/** client_secret_basic: Authorization: Basic base64(client_id:client_secret). */
function credenciaisBasic(header: string | null): { clientId?: string; clientSecret?: string } {
  const m = /^Basic\s+(.+)$/i.exec(header?.trim() ?? "")
  if (!m) return {}
  try {
    const [id, ...resto] = Buffer.from(m[1], "base64").toString("utf-8").split(":")
    return { clientId: decodeURIComponent(id), clientSecret: resto.length ? decodeURIComponent(resto.join(":")) : undefined }
  } catch {
    return {}
  }
}

function erro(code: string, descricao: string, status = 400) {
  return NextResponse.json({ error: code, error_description: descricao }, { status, headers: { "cache-control": "no-store" } })
}

export async function POST(req: Request) {
  if (!oauthLigado()) return NextResponse.json({ error: "not_found" }, { status: 404 })
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon"
  if (!rateLimit(`oauth-token:${ip}`, 60, 60_000)) {
    return erro("invalid_request", "Muitas tentativas — aguarde um instante", 429)
  }

  const p = await lerParams(req)
  const basic = credenciaisBasic(req.headers.get("authorization"))
  const clientId = p.get("client_id") ?? basic.clientId
  const clientSecret = p.get("client_secret") ?? basic.clientSecret
  const grant = p.get("grant_type")
  if (!clientId) return erro("invalid_client", "client_id é obrigatório", 401)

  const base = resolveRequestOrigin(req)
  try {
    if (grant === "authorization_code") {
      const code = p.get("code")
      const redirectUri = p.get("redirect_uri")
      const codeVerifier = p.get("code_verifier")
      if (!code || !redirectUri || !codeVerifier) {
        return erro("invalid_request", "code, redirect_uri e code_verifier são obrigatórios")
      }
      const tokens = await trocarCodigo(
        { code, clientId, clientSecret, redirectUri, codeVerifier, resource: p.get("resource") ?? undefined },
        base,
      )
      return NextResponse.json(tokens, { headers: { "cache-control": "no-store" } })
    }

    if (grant === "refresh_token") {
      const refreshToken = p.get("refresh_token")
      if (!refreshToken) return erro("invalid_request", "refresh_token é obrigatório")
      const tokens = await renovar({ refreshToken, clientId, clientSecret })
      return NextResponse.json(tokens, { headers: { "cache-control": "no-store" } })
    }

    return erro("unsupported_grant_type", "Use authorization_code ou refresh_token")
  } catch (e) {
    if (e instanceof OAuthError) {
      // Sem PII e sem o token/código: só o cliente e o motivo estruturado.
      log.warn({ clientId, grant, code: e.code }, "oauth: troca de token recusada")
      return erro(e.code, e.message, e.status)
    }
    log.error({ grant, err: e instanceof Error ? e.message : String(e) }, "oauth: endpoint de token falhou")
    return erro("server_error", "Erro ao emitir o token", 500)
  }
}
