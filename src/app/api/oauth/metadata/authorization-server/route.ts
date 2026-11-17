// Metadados do servidor de autorização (RFC 8414). Servido em
// /.well-known/oauth-authorization-server por um rewrite em next.config.ts
// (pasta com ponto no app router é frágil; o rewrite é explícito e testável).
//
// O `issuer` é derivado do ORIGIN DA REQUISIÇÃO, não de APP_BASE_URL: o spec diz
// que o issuer do documento MUST ser idêntico à base que o cliente usou para
// montar a URL do well-known — se divergir, o cliente MUST NOT usar o documento
// (e o conector morre sem explicação). Isso também faz o fluxo funcionar atrás
// do ngrok em desenvolvimento, sem variável nova.
import { NextResponse } from "next/server"
import { metadataServidorAutorizacao } from "@/lib/oauth/core"
import { oauthLigado } from "@/lib/oauth/fluxo"
import { resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  if (!oauthLigado()) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json(metadataServidorAutorizacao(resolveRequestOrigin(req)), {
    headers: { "cache-control": "public, max-age=300" },
  })
}
