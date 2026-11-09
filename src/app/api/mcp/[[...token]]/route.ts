// MCP server (Streamable HTTP) for the claude.ai "custom connector".
//
// This route is OUTSIDE src/proxy.ts (see its matcher): the claude.ai backend has
// no session cookie. Protection is the guards below, in order:
//   1. LEXIA_MCP_TOKEN unset/empty → 404 (feature off by default, like guardJob);
//   2. Origin validation → 403 (MCP spec: DNS-rebinding; also replaces the proxy's
//      CSRF belt). Anthropic's server-to-server calls send no Origin, so they pass;
//   3. token in header or last path segment → 401 (constant time, see mcp/auth.ts).
// Actions run as the dedicated service user (LEXIA_MCP_USER, role admin).
// Stateless (mcp-handler 2.x): no sessions; GET/DELETE session ops answer 405.
import { createMcpHandler } from "mcp-handler"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { mcpTokenOk, originOk } from "@/lib/mcp/auth"
import { registerLexiaTools } from "@/lib/mcp/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const mcp = createMcpHandler(registerLexiaTools, {
  serverInfo: { name: "lexia", version: "1.0.0" },
  instructions:
    "Servidor MCP do Lexia (NCM Advogados). Dinheiro em centavos inteiros. Use sql_schema/sql_consultar para diagnóstico somente leitura e as ferramentas tipadas para consultar os dados.",
})

async function handle(req: Request): Promise<Response> {
  if (!env.LEXIA_MCP_TOKEN) return NextResponse.json({ error: "MCP desabilitado (defina LEXIA_MCP_TOKEN)" }, { status: 404 })
  if (!originOk(req)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 })
  if (!mcpTokenOk(req, env.LEXIA_MCP_TOKEN)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  return mcp(req)
}

export { handle as GET, handle as POST, handle as DELETE }
