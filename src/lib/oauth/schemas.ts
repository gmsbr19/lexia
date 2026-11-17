// Zod dos endpoints OAuth. Deliberadamente TOLERANTE com campos desconhecidos
// (o Zod os descarta): o RFC 7591 deixa o cliente mandar o que quiser no
// registro, e recusar um campo extra do claude.ai derrubaria a conexão sem
// necessidade. O que importa é validar o que a gente de fato usa.
import { z } from "zod"

/** Registro Dinâmico de Cliente (RFC 7591) — endpoint PÚBLICO. */
export const registrarClienteSchema = z.object({
  redirect_uris: z.array(z.string().url()).min(1).max(10),
  client_name: z.string().min(1).max(200).optional(),
  // "none" = cliente público (só PKCE), que é como o claude.ai opera.
  token_endpoint_auth_method: z.enum(["none", "client_secret_post", "client_secret_basic"]).optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  scope: z.string().max(200).optional(),
  application_type: z.enum(["native", "web"]).optional(),
})

export type RegistrarClienteInput = z.infer<typeof registrarClienteSchema>

/**
 * Corpo do POST da NOSSA tela de consentimento (sessão do Lexia obrigatória).
 * Os parâmetros vêm da query do /oauth/authorize, que a tela repassa intactos.
 */
export const autorizarSchema = z.object({
  client_id: z.string().min(1).max(200),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal("S256"),
  state: z.string().max(500).optional(),
  scope: z.string().max(200).optional(),
  resource: z.string().max(500).optional(),
})

export type AutorizarInput = z.infer<typeof autorizarSchema>
