// Guarda de HTTP Basic Auth para os feeds CSV públicos que o Google Ads lê
// (GET /feeds/google-ads/*.csv) — nada de sessão, nada de credencial do
// Google no app. Usuário/senha só em variável de ambiente (GADS_FEED_USER/
// GADS_FEED_PASS); sem elas configuradas, o feed fica 404 (mesmo padrão de
// JOBS_TOKEN em src/lib/jobs/guard.ts — nunca serve sem estar propositalmente
// configurado). Comparação em tempo constante. SERVER ONLY.
import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Retorna uma Response p/ curto-circuitar (404 desabilitado, 401 credencial
 *  errada/ausente), ou null quando autorizado. */
export function guardFeedBasicAuth(req: Request): NextResponse | null {
  if (!env.GADS_FEED_USER || !env.GADS_FEED_PASS) {
    return NextResponse.json({ error: "Feed desabilitado (defina GADS_FEED_USER/GADS_FEED_PASS)" }, { status: 404 })
  }
  const header = req.headers.get("authorization") ?? ""
  const unauthorized = () =>
    new NextResponse("Não autorizado", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Lexia feeds"' } })
  if (!header.startsWith("Basic ")) return unauthorized()
  let decoded: string
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf-8")
  } catch {
    return unauthorized()
  }
  const sep = decoded.indexOf(":")
  if (sep < 0) return unauthorized()
  const user = decoded.slice(0, sep)
  const pass = decoded.slice(sep + 1)
  if (!safeEqual(user, env.GADS_FEED_USER) || !safeEqual(pass, env.GADS_FEED_PASS)) return unauthorized()
  return null
}
