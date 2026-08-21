// Autenticação por segredo compartilhado do site institucional (ncm.adv.br) —
// usada SÓ por POST /api/lead. O site é público e anônimo: quem preenche o
// formulário nunca terá sessão. Em vez de expor a API do Lexia na internet, o
// site recebe o POST do navegador (same-origin), valida/rate-limita/honeypot,
// e repassa pela rede interna do projeto (http://lexia:3000) com o header
// `x-ncm-secret`.
//
// Regras (§ pedido do usuário):
//  - o segredo vem SÓ de process.env (via env.ts) — nunca hardcoded, nunca logado;
//  - comparação em tempo constante, com checagem de tamanho ANTES (timingSafeEqual
//    lança se os buffers têm tamanhos diferentes);
//  - LEXIA_SECRET ausente/vazia ⇒ a checagem SEMPRE falha (nunca autentica com
//    segredo vazio dos dois lados). Mesmo padrão de JOBS_TOKEN (lib/jobs/guard.ts)
//    e GADS_FEED_* (lib/captacao/feed-auth.ts).
// SERVER ONLY.
import { timingSafeEqual } from "node:crypto"
import { env } from "@/lib/env"

export const SITE_SECRET_HEADER = "x-ncm-secret"

/** Comparação em tempo constante de dois segredos (tamanhos podem diferir). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf-8")
  const bb = Buffer.from(b, "utf-8")
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/**
 * A requisição traz o segredo compartilhado do site? `false` quando o header
 * não veio, quando `LEXIA_SECRET` não está configurada, ou quando não bate.
 * Nunca lança e nunca loga o valor recebido.
 */
export function autenticadoPeloSite(req: Request): boolean {
  const segredo = env.LEXIA_SECRET
  if (!segredo) return false // nunca autentica com segredo vazio dos dois lados
  const enviado = req.headers.get(SITE_SECRET_HEADER)
  if (!enviado) return false
  return safeEqual(enviado, segredo)
}
