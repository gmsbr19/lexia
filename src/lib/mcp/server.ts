// MCP server wiring: exposes the LexIA tool registry (+ SQL diagnostics) to the
// claude.ai connector, executing as the dedicated service user. SERVER ONLY.
// Execution semantics live in exec.ts (pure, tested).
import type { McpServer, ServerContext, StandardSchemaWithJSON } from "@modelcontextprotocol/server"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { writeAudit } from "@/lib/finance/api"
import type { AgentTool } from "@/lib/lexia/agent/types"
import { assertRateLimit } from "@/lib/rate-limit"
import { getModulosConfig, processosHabilitado } from "@/lib/settings"
import { executeTool, type ExecDeps } from "./exec"
import { sqlTools } from "./sql"
import { annotationsFor, selectMcpTools } from "./tools"

const deps: ExecDeps = { audit: writeAudit, rateLimit: assertRateLimit }

/** The service user; null when it hasn't been created / is deactivated. */
export async function loadServiceUser(): Promise<SessionUser | null> {
  const u = await prisma.user.findUnique({ where: { email: env.LEXIA_MCP_USER.toLowerCase() } })
  if (!u || !u.ativo) return null
  return { email: u.email, nome: u.nome, role: u.role }
}

/** Registers the tools on a fresh McpServer (called per request by mcp-handler). */
export async function registerLexiaTools(server: McpServer): Promise<void> {
  const user = await loadServiceUser()
  const processosOk = processosHabilitado(await getModulosConfig())
  const registry = user ? selectMcpTools(user.role, processosOk) : []
  const tools: AgentTool[] = [...registry, ...(env.LEXIA_MCP_SQL === "on" ? sqlTools : [])]

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.schema as unknown as StandardSchemaWithJSON, annotations: annotationsFor(tool) },
      async (args: unknown, ctx: ServerContext) => {
        if (!user) {
          return {
            content: [
              {
                type: "text" as const,
                text: `O usuário de serviço ${env.LEXIA_MCP_USER} não existe ou está desativado. Rode "npm run mcp:user" no servidor.`,
              },
            ],
            isError: true,
          }
        }
        return executeTool(tool, args, user, ctx.mcpReq.signal, deps)
      },
    )
  }
}
