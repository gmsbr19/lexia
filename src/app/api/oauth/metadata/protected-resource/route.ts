// Metadados do recurso protegido (RFC 9728) — o documento que o header
// WWW-Authenticate do 401 do /api/mcp aponta. O spec do MCP exige que o servidor
// MCP o implemente, com `authorization_servers` contendo pelo menos um item.
//
// Servido por rewrite (next.config.ts) nas DUAS formas que o cliente tenta:
//   /.well-known/oauth-protected-resource/api/mcp   (path-aware, a preferida)
//   /.well-known/oauth-protected-resource            (raiz, fallback)
import { NextResponse } from "next/server"
import { metadataRecursoProtegido } from "@/lib/oauth/core"
import { oauthLigado } from "@/lib/oauth/fluxo"
import { resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  if (!oauthLigado()) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json(metadataRecursoProtegido(resolveRequestOrigin(req)), {
    headers: { "cache-control": "public, max-age=300" },
  })
}
