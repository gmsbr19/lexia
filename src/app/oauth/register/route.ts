// Registro Dinâmico de Cliente (RFC 7591) — endpoint PÚBLICO: é assim que o
// claude.ai registra a si mesmo ao adicionar o conector, sem ninguém colar
// client_id à mão. Excluído do gate em src/proxy.ts (não há sessão, e o POST
// cross-origin do claude.ai bateria no cinto anti-CSRF do proxy).
//
// Como um endpoint aberto na internet, ele tem duas contenções:
//   1. allowlist de redirect_uri (lib/oauth/core.ts) — sem ela o /oauth/authorize
//      viraria um open redirector capaz de vazar código de autorização;
//   2. rate-limit por IP — registrar cliente é barato, encher a tabela não pode ser.
// Registrar um cliente NÃO dá acesso a nada: sem alguém autorizar com o próprio
// login na tela de consentimento, nenhum token é emitido.
import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { readJson } from "@/lib/finance/api"
import { log } from "@/lib/log"
import { OAuthError, oauthLigado, registrarCliente } from "@/lib/oauth/fluxo"
import { registrarClienteSchema } from "@/lib/oauth/schemas"
import { rateLimit } from "@/lib/rate-limit"
import { UserError } from "@/lib/errors"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  if (!oauthLigado()) return NextResponse.json({ error: "not_found" }, { status: 404 })
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon"
  if (!rateLimit(`oauth-register:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "invalid_request", error_description: "Muitas tentativas — aguarde um instante" }, { status: 429 })
  }

  const body = await readJson(req)
  try {
    const input = parseBody(registrarClienteSchema, body)
    const cliente = await registrarCliente(input, env.LEXIA_OAUTH_REDIRECTS)
    log.info({ clientId: cliente.client_id, nome: cliente.client_name }, "oauth: cliente registrado")
    return NextResponse.json(cliente, { status: 201 })
  } catch (e) {
    if (e instanceof OAuthError) {
      return NextResponse.json({ error: e.code, error_description: e.message }, { status: e.status })
    }
    if (e instanceof UserError) {
      return NextResponse.json({ error: "invalid_request", error_description: e.message }, { status: 400 })
    }
    log.error({ err: e instanceof Error ? e.message : String(e) }, "oauth: registro de cliente falhou")
    return NextResponse.json({ error: "server_error", error_description: "Erro ao registrar o cliente" }, { status: 500 })
  }
}
