// Fluxo OAuth 2.1 contra o banco: registro dinâmico, emissão de código,
// troca por token, rotação de refresh e resolução de access token. SERVER ONLY.
// A aritmética pura (hash, PKCE, allowlist, validade) vive em ./core.ts.
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import {
  ACCESS_TTL_S,
  CODE_TTL_S,
  REFRESH_TTL_S,
  SCOPE_PADRAO,
  expiraEmSegundos,
  expirou,
  gerarSegredo,
  hashToken,
  igualSeguro,
  parsearRedirects,
  pkceConfere,
  recursoCanonico,
  recursoConfere,
  redirectRegistrado,
  redirectUriPermitido,
  serializarRedirects,
} from "./core"
import type { AutorizarInput, RegistrarClienteInput } from "./schemas"

/**
 * Erro com código OAuth (RFC 6749 §5.2). O endpoint devolve
 * `{error, error_description}` com o status certo — nunca uma mensagem interna.
 */
export class OAuthError extends Error {
  constructor(
    readonly code:
      | "invalid_request"
      | "invalid_client"
      | "invalid_grant"
      | "unauthorized_client"
      | "unsupported_grant_type"
      | "invalid_scope"
      | "invalid_target"
      | "server_error",
    descricao: string,
    readonly status = 400,
  ) {
    super(descricao)
  }
}

/**
 * O servidor de autorização está ligado? (LEXIA_MCP_OAUTH, default "on"). Com
 * "off" as rotas OAuth respondem 404 e só o token estático autentica o MCP —
 * é o caminho de volta sem deploy.
 */
export function oauthLigado(): boolean {
  return env.LEXIA_MCP_OAUTH === "on"
}

// ── Registro Dinâmico (RFC 7591) ────────────────────────────────────────────

export interface ClienteRegistrado {
  client_id: string
  client_secret?: string
  client_id_issued_at: number
  client_name: string
  redirect_uris: string[]
  token_endpoint_auth_method: "none" | "client_secret_post"
  grant_types: string[]
  response_types: string[]
  scope: string
}

/**
 * Registra um cliente. TODO redirect_uri passa pela allowlist de core.ts — o
 * endpoint é público, então sem isso ele viraria um open redirector.
 * `token_endpoint_auth_method: "none"` (o padrão do claude.ai) nasce sem
 * segredo; qualquer outro recebe um client_secret devolvido UMA única vez.
 */
export async function registrarCliente(input: RegistrarClienteInput, extras?: string): Promise<ClienteRegistrado> {
  const recusada = input.redirect_uris.find((u) => !redirectUriPermitido(u, extras))
  if (recusada) {
    throw new OAuthError(
      "invalid_request",
      "redirect_uri não permitida por este servidor. Aceitamos o callback dos aplicativos do Claude " +
        "(https://claude.ai/api/mcp/auth_callback), endereços de loopback e o que estiver em LEXIA_OAUTH_REDIRECTS.",
    )
  }

  const publico = (input.token_endpoint_auth_method ?? "none") === "none"
  const clientId = `lexia-${gerarSegredo(16)}`
  const clientSecret = publico ? undefined : gerarSegredo(32)

  const cliente = await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: clientSecret ? hashToken(clientSecret) : null,
      nome: input.client_name?.trim() || "Cliente MCP",
      redirectUris: serializarRedirects(input.redirect_uris),
    },
  })

  return {
    client_id: cliente.clientId,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
    client_id_issued_at: Math.floor(cliente.criadoEm.getTime() / 1000),
    client_name: cliente.nome,
    redirect_uris: parsearRedirects(cliente.redirectUris),
    token_endpoint_auth_method: publico ? "none" : "client_secret_post",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: SCOPE_PADRAO,
  }
}

// ── Consentimento → código de autorização ───────────────────────────────────

export interface ClienteParaTela {
  clientId: string
  nome: string
  redirectUris: string
}

/** Dados do cliente para a tela de consentimento (ou null se não existe). */
export async function clientePorId(clientId: string): Promise<ClienteParaTela | null> {
  const c = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: { clientId: true, nome: true, redirectUris: true },
  })
  return c
}

/**
 * Valida os parâmetros do /oauth/authorize ANTES de desenhar a tela: cliente
 * existe e o redirect_uri é um dos registrados (comparação exata). Erro aqui é
 * mostrado na própria tela, nunca redirecionado — redirecionar para uma URI não
 * validada é justamente o que se quer evitar.
 */
export async function validarPedidoAutorizacao(
  params: AutorizarInput,
  base: string,
): Promise<{ cliente: ClienteParaTela } | { erro: string }> {
  const cliente = await clientePorId(params.client_id)
  if (!cliente) return { erro: "Aplicativo desconhecido (client_id não registrado neste servidor)." }
  if (!redirectRegistrado(params.redirect_uri, cliente.redirectUris)) {
    return { erro: "O endereço de retorno informado não está registrado para este aplicativo." }
  }
  if (!recursoConfere(params.resource, base)) {
    return { erro: "O recurso solicitado não é este servidor." }
  }
  return { cliente }
}

/**
 * Grava o código de autorização (uso único, 5 min) e devolve o código BRUTO,
 * que só existe nesta resposta — no banco fica apenas o sha256.
 */
export async function emitirCodigo(user: SessionUser, params: AutorizarInput, base: string): Promise<string> {
  const dono = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { id: true, ativo: true } })
  if (!dono || !dono.ativo) throw new OAuthError("invalid_request", "Usuário inativo", 403)

  const valido = await validarPedidoAutorizacao(params, base)
  if ("erro" in valido) throw new OAuthError("invalid_request", valido.erro)

  const raw = gerarSegredo(32)
  await prisma.oAuthCode.create({
    data: {
      codeHash: hashToken(raw),
      clientId: params.client_id,
      userId: dono.id,
      redirectUri: params.redirect_uri,
      codeChallenge: params.code_challenge,
      resource: params.resource ? params.resource : recursoCanonico(base),
      scope: params.scope ?? SCOPE_PADRAO,
      expiraEm: expiraEmSegundos(CODE_TTL_S),
    },
  })
  // Faxina oportunista: códigos vencidos deste usuário não servem para nada.
  await prisma.oAuthCode
    .deleteMany({ where: { userId: dono.id, expiraEm: { lt: new Date() } } })
    .catch(() => undefined)
  return raw
}

// ── Troca de código / renovação ─────────────────────────────────────────────

export interface TokensEmitidos {
  access_token: string
  token_type: "Bearer"
  expires_in: number
  refresh_token: string
  scope: string
}

/** Autentica o cliente: público (sem segredo) passa só com o client_id. */
async function autenticarCliente(clientId: string, segredo: string | undefined) {
  const cliente = await prisma.oAuthClient.findUnique({ where: { clientId } })
  if (!cliente) throw new OAuthError("invalid_client", "client_id desconhecido", 401)
  if (cliente.clientSecretHash) {
    if (!segredo || !igualSeguro(hashToken(segredo), cliente.clientSecretHash)) {
      throw new OAuthError("invalid_client", "client_secret inválido", 401)
    }
  }
  return cliente
}

/** Emite o par access+refresh para (cliente, usuário), guardando só os hashes. */
async function emitirPar(clientId: string, userId: number, scope: string, resource: string | null): Promise<TokensEmitidos> {
  const access = gerarSegredo(32)
  const refresh = gerarSegredo(32)
  await prisma.$transaction([
    prisma.oAuthToken.create({
      data: {
        tokenHash: hashToken(access),
        tipo: "access",
        clientId,
        userId,
        scope,
        resource,
        expiraEm: expiraEmSegundos(ACCESS_TTL_S),
      },
    }),
    prisma.oAuthToken.create({
      data: {
        tokenHash: hashToken(refresh),
        tipo: "refresh",
        clientId,
        userId,
        scope,
        resource,
        expiraEm: expiraEmSegundos(REFRESH_TTL_S),
      },
    }),
    prisma.oAuthClient.update({ where: { clientId }, data: { ultimoUsoEm: new Date() } }),
  ])
  // Faxina oportunista: sem isto a tabela só cresce (um access token morre em 1 h
  // mas a linha fica). Mantém 7 dias de folga para o histórico recente servir de
  // diagnóstico, e nunca derruba a emissão se falhar.
  const corte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await prisma.oAuthToken
    .deleteMany({ where: { userId, expiraEm: { lt: corte } } })
    .catch(() => undefined)
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_S, refresh_token: refresh, scope }
}

export interface TrocaCodigoInput {
  code: string
  clientId: string
  clientSecret?: string
  redirectUri: string
  codeVerifier: string
  resource?: string
}

/**
 * grant_type=authorization_code. Reivindica o código de forma atômica
 * (updateMany com `usadoEm: null`, como o convite), confere PKCE, redirect_uri
 * e dono do código antes de emitir.
 */
export async function trocarCodigo(input: TrocaCodigoInput, base: string): Promise<TokensEmitidos> {
  await autenticarCliente(input.clientId, input.clientSecret)

  const code = await prisma.oAuthCode.findUnique({
    where: { codeHash: hashToken(input.code) },
    include: { user: { select: { id: true, ativo: true } } },
  })
  if (!code || code.usadoEm || expirou(code.expiraEm)) throw new OAuthError("invalid_grant", "Código inválido ou expirado")
  if (!igualSeguro(code.clientId, input.clientId)) throw new OAuthError("invalid_grant", "Código emitido para outro cliente")
  if (!igualSeguro(code.redirectUri, input.redirectUri)) throw new OAuthError("invalid_grant", "redirect_uri diferente da usada na autorização")
  if (!pkceConfere(input.codeVerifier, code.codeChallenge)) throw new OAuthError("invalid_grant", "code_verifier não confere")
  if (!recursoConfere(input.resource, base)) throw new OAuthError("invalid_target", "Recurso solicitado não é este servidor")
  if (!code.user.ativo) throw new OAuthError("invalid_grant", "Usuário inativo")

  const claim = await prisma.oAuthCode.updateMany({ where: { id: code.id, usadoEm: null }, data: { usadoEm: new Date() } })
  if (claim.count === 0) throw new OAuthError("invalid_grant", "Código já utilizado")

  return emitirPar(code.clientId, code.userId, code.scope ?? SCOPE_PADRAO, code.resource)
}

export interface RenovarInput {
  refreshToken: string
  clientId: string
  clientSecret?: string
}

/**
 * grant_type=refresh_token com ROTAÇÃO (OAuth 2.1 exige em cliente público).
 * Reusar um refresh já rotacionado é sinal de token vazado: revoga a família
 * inteira (todos os tokens daquele cliente para aquele usuário).
 */
export async function renovar(input: RenovarInput): Promise<TokensEmitidos> {
  await autenticarCliente(input.clientId, input.clientSecret)

  const token = await prisma.oAuthToken.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
    include: { user: { select: { id: true, ativo: true } } },
  })
  if (!token || token.tipo !== "refresh") throw new OAuthError("invalid_grant", "refresh_token inválido")
  if (!igualSeguro(token.clientId, input.clientId)) throw new OAuthError("invalid_grant", "refresh_token de outro cliente")

  if (token.rotacionadoEm || token.revogadoEm) {
    await prisma.oAuthToken.updateMany({
      where: { clientId: token.clientId, userId: token.userId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    })
    throw new OAuthError("invalid_grant", "refresh_token reutilizado — a sessão foi revogada por segurança")
  }
  if (expirou(token.expiraEm)) throw new OAuthError("invalid_grant", "refresh_token expirado")
  if (!token.user.ativo) throw new OAuthError("invalid_grant", "Usuário inativo")

  const claim = await prisma.oAuthToken.updateMany({
    where: { id: token.id, rotacionadoEm: null, revogadoEm: null },
    data: { rotacionadoEm: new Date() },
  })
  if (claim.count === 0) throw new OAuthError("invalid_grant", "refresh_token já utilizado")

  return emitirPar(token.clientId, token.userId, token.scope ?? SCOPE_PADRAO, token.resource)
}

/** Revoga um token (RFC 7009). Idempotente: token desconhecido também é "ok". */
export async function revogar(raw: string): Promise<void> {
  await prisma.oAuthToken.updateMany({ where: { tokenHash: hashToken(raw), revogadoEm: null }, data: { revogadoEm: new Date() } })
}

// ── Resolução do access token (lado Resource Server) ────────────────────────

export interface AcessoResolvido {
  user: SessionUser
  userId: number
  clientId: string
  scope: string
}

/**
 * Quem está do outro lado desta chamada MCP? Devolve null para token ausente,
 * desconhecido, expirado, revogado, de outro recurso, ou de usuário desativado
 * — desativar a pessoa em Configurações → Usuários corta o acesso na hora.
 */
export async function resolverAccessToken(raw: string, base: string): Promise<AcessoResolvido | null> {
  const token = await prisma.oAuthToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: { select: { id: true, email: true, nome: true, role: true, ativo: true } } },
  })
  if (!token || token.tipo !== "access" || token.revogadoEm || expirou(token.expiraEm)) return null
  if (!recursoConfere(token.resource, base)) return null
  if (!token.user.ativo) return null
  return {
    user: { email: token.user.email, nome: token.user.nome, role: token.user.role },
    userId: token.user.id,
    clientId: token.clientId,
    scope: token.scope ?? SCOPE_PADRAO,
  }
}
