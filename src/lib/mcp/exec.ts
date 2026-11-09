// Execution of one MCP tool call. PURE of framework/DB imports: audit and
// rate-limit are injected (server.ts wires the real ones), so this is unit-testable.
//
// Contract (mirrors runMutation in lib/finance/api.ts, minus the HTTP layer):
//   role gate → rate limit → [mutation: readable summary] → run → [mutation: audit].
// Mutations run DIRECTLY (no LexIA confirmation card): the approval step is the
// Claude chat's own tool-approval prompt, and the audit entry + the pt-BR summary
// returned in the result leave the trail. Reads are never audited (except the SQL
// tools, which audit themselves). Errors map to MCP error results keeping the
// PT-BR message of UserError/ForbiddenError/RateLimitError; anything else is
// logged and answered generically — never a stack or a Prisma message.
import type { CallToolResult } from "@modelcontextprotocol/server"
import type { Role, SessionUser } from "@/lib/auth/session"
import { ForbiddenError, UserError } from "@/lib/errors"
import type { AgentCtx, AgentTool } from "@/lib/lexia/agent/types"
import { log } from "@/lib/log"
import { RateLimitError } from "@/lib/rate-limit"

export const FORBIDDEN_MESSAGE = "Sem permissão para esta ação"
export const MAX_RESULT_CHARS = 100_000

export interface ExecDeps {
  audit: (actorEmail: string, meta: { action: string; entity?: string; entityId?: number | string | null; payload?: unknown }, result: unknown) => Promise<void>
  rateLimit: (email: string, action: string) => void
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

/** Cosmetic pt-BR summary of what a mutation is about to do; never allowed to break it. */
async function resumoDaMutacao(tool: AgentTool, ctx: AgentCtx, input: unknown): Promise<unknown> {
  try {
    if (tool.montarConfirmacao) return await tool.montarConfirmacao(ctx, input)
    if (tool.resumo) return { resumo: tool.resumo(input) }
  } catch {
    /* summary is cosmetic */
  }
  return undefined
}

/** "criar_lancamento" → "lancamento" (audit entity, best effort). */
function entityOf(name: string): string | undefined {
  const rest = name.split("_").slice(1).join("_")
  return rest || undefined
}

export async function executeTool(
  tool: AgentTool,
  input: unknown,
  user: SessionUser,
  signal: AbortSignal,
  deps: ExecDeps,
): Promise<CallToolResult> {
  const ctx: AgentCtx = { user, conversaId: 0, signal }
  try {
    checkRole(user, tool.roles)
    deps.rateLimit(user.email, `mcp.${tool.name}`)
    if (tool.kind !== "mutation") return text(serialize(await tool.run!(ctx, input)))

    const resumo = await resumoDaMutacao(tool, ctx, input)
    const result = await tool.run!(ctx, input)
    await deps.audit(user.email, { action: `mcp.${tool.name}`, entity: entityOf(tool.name), payload: input }, result)
    return text(serialize({ ok: true, resumo, resultado: result }))
  } catch (e) {
    if (e instanceof UserError || e instanceof ForbiddenError || e instanceof RateLimitError) {
      return text(e.message, true)
    }
    log.error({ tool: tool.name, err: e instanceof Error ? e.message : String(e) }, "mcp tool failed")
    return text("Erro interno ao executar a ferramenta.", true)
  }
}
