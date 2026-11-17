// MCP server wiring: exposes the LexIA tool registry (+ SQL diagnostics and
// `quem_sou_eu`) to the claude.ai connector. SERVER ONLY. Execution semantics
// live in exec.ts (pure, tested).
//
// WHO the tools run as depends on how the request authenticated (the route
// decides, see src/app/api/mcp):
//   • OAuth bearer  → the REAL person behind the connector, with their role;
//   • static token  → the shared service user (LEXIA_MCP_USER, admin), which is
//     the legacy behaviour kept working during the transition.
// The registration happens per request, so the user is a closure over this
// request only — it never leaks between callers.
import type { McpServer, ServerContext, StandardSchemaWithJSON } from "@modelcontextprotocol/server"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { writeAudit } from "@/lib/finance/api"
import type { AgentTool } from "@/lib/lexia/agent/types"
import { assertRateLimit } from "@/lib/rate-limit"
import { getModulosConfig, processosHabilitado } from "@/lib/settings"
import { whatsappHabilitado } from "@/lib/whatsapp/sessoes"
import { executeTool, type ExecDeps } from "./exec"
import { identidadeTools, type IdentidadeDaChamada } from "./identidade"
import { sqlTools } from "./sql"
import { annotationsFor, expoeWhatsapp, selectMcpTools } from "./tools"
import { whatsappTools } from "./whatsapp"

const deps: ExecDeps = { audit: writeAudit, rateLimit: assertRateLimit }

/** The service user; null when it hasn't been created / is deactivated. */
export async function loadServiceUser(): Promise<SessionUser | null> {
  const u = await prisma.user.findUnique({ where: { email: env.LEXIA_MCP_USER.toLowerCase() } })
  if (!u || !u.ativo) return null
  return { email: u.email, nome: u.nome, role: u.role }
}

export interface ChamadaMcp {
  /** Resolved caller; null only on the legacy path when the service user is missing. */
  user: SessionUser | null
  /**
   * `User.id` do chamador — só existe no caminho OAuth (o token resolve para uma
   * PESSOA). É a condição para as ferramentas de WhatsApp aparecerem: no caminho
   * legado a chamada roda como o usuário de serviço admin, e expor o WhatsApp de
   * alguém ali é justamente o que o brief proíbe (docs/whatsapp-baileys.md).
   */
  userId?: number | null
  identidade: IdentidadeDaChamada
}

/**
 * Builds the per-request tool registrar for `createMcpHandler`. The tool list is
 * cut by the caller's role (`selectMcpTools`), so a connector authorized by an
 * estagiário simply doesn't see the tools their role can't call.
 */
export function criarRegistrador(chamada: ChamadaMcp): (server: McpServer) => Promise<void> {
  return async function registerLexiaTools(server: McpServer): Promise<void> {
    const { user, userId, identidade } = chamada
    const processosOk = processosHabilitado(await getModulosConfig())
    const registry = user ? selectMcpTools(user.role, processosOk) : []
    const tools: AgentTool[] = [
      ...registry,
      ...(env.LEXIA_MCP_SQL === "on" ? sqlTools : []),
      // Fase 4: só com usuário REAL (OAuth) e com o módulo configurado.
      ...(expoeWhatsapp(userId, whatsappHabilitado()) ? whatsappTools(userId!, deps.audit) : []),
      ...identidadeTools(identidade),
    ]

    for (const tool of tools) {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.schema as unknown as StandardSchemaWithJSON,
          annotations: annotationsFor(tool),
        },
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
}
