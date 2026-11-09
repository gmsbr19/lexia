// MCP server wiring: exposes the LexIA tool registry (+ SQL diagnostics) to the
// claude.ai connector, executing as the dedicated service user. SERVER ONLY.
//
// Execution contract (mirrors runMutation in lib/finance/api.ts, minus the HTTP
// layer): role gate → rate limit → run → (mutations) audit. Errors are mapped to
// MCP error results keeping the PT-BR message of UserError/ForbiddenError/
// RateLimitError; anything else is logged and answered generically — never a
// stack or a Prisma message.
import type { CallToolResult, McpServer, ServerContext, StandardSchemaWithJSON } from "@modelcontextprotocol/server"
import type { Role, SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { ForbiddenError, UserError } from "@/lib/errors"
import type { AgentCtx, AgentTool } from "@/lib/lexia/agent/types"
import { log } from "@/lib/log"
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit"
import { getModulosConfig, processosHabilitado } from "@/lib/settings"
import { sqlTools } from "./sql"
import { annotationsFor, selectMcpTools } from "./tools"

const FORBIDDEN_MESSAGE = "Sem permissão para esta ação"
const MAX_RESULT_CHARS = 100_000

/** The service user; null when it hasn't been created / is deactivated. */
export async function loadServiceUser(): Promise<SessionUser | null> {
  const u = await prisma.user.findUnique({ where: { email: env.LEXIA_MCP_USER.toLowerCase() } })
  if (!u || !u.ativo) return null
  return { email: u.email, nome: u.nome, role: u.role }
}

/** Defense in depth: same rule as assertRole, without importing the session module. */
function checkRole(user: SessionUser, roles?: Role[]) {
  if (!roles || user.role === "admin") return
  if (!roles.includes(user.role as Role)) throw new ForbiddenError(FORBIDDEN_MESSAGE)
}

function text(s: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text: s }], ...(isError ? { isError: true } : {}) }
}

function serialize(value: unknown): string {
  let s = JSON.stringify(value ?? null, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  if (s.length > MAX_RESULT_CHARS) {
    s = `${s.slice(0, MAX_RESULT_CHARS)}… [resultado truncado: ${s.length - MAX_RESULT_CHARS} caracteres a mais; refine o filtro]`
  }
  return s
}

export async function executeTool(
  tool: AgentTool,
  input: unknown,
  user: SessionUser,
  signal: AbortSignal,
): Promise<CallToolResult> {
  const ctx: AgentCtx = { user, conversaId: 0, signal }
  try {
    checkRole(user, tool.roles)
    assertRateLimit(user.email, `mcp.${tool.name}`)
    const result = await tool.run!(ctx, input)
    return text(serialize(result))
  } catch (e) {
    if (e instanceof UserError || e instanceof ForbiddenError || e instanceof RateLimitError) {
      return text(e.message, true)
    }
    log.error({ tool: tool.name, err: e instanceof Error ? e.message : String(e) }, "mcp tool failed")
    return text("Erro interno ao executar a ferramenta.", true)
  }
}

/**
 * Registers the tools on a fresh McpServer (called per request by mcp-handler).
 * Phase 1: read-only tools only (registry `readonly` + SQL diagnostics).
 */
export async function registerLexiaTools(server: McpServer): Promise<void> {
  const user = await loadServiceUser()
  const processosOk = processosHabilitado(await getModulosConfig())
  const registry = user ? selectMcpTools(user.role, processosOk).filter((t) => t.kind === "readonly") : []
  const tools: AgentTool[] = [...registry, ...(env.LEXIA_MCP_SQL === "on" ? sqlTools : [])]

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.schema as unknown as StandardSchemaWithJSON, annotations: annotationsFor(tool) },
      async (args: unknown, ctx: ServerContext) => {
        if (!user) {
          return text(
            `O usuário de serviço ${env.LEXIA_MCP_USER} não existe ou está desativado. Rode "npm run mcp:user" no servidor.`,
            true,
          )
        }
        return executeTool(tool, args, user, ctx.mcpReq.signal)
      },
    )
  }
}
