// PURE half of the AgentTool → MCP adapter: which tools are exposed and how
// they are described. Execution (rate-limit, audit, error mapping) lives in
// server.ts. The role/kill-switch filtering is NOT duplicated here — it comes
// from `selectTools` (registry.ts), the single source of truth shared with the
// LexIA chat. SERVER ONLY.
import { z } from "zod"
import type { AgentTool } from "@/lib/lexia/agent/types"
import { selectTools } from "@/lib/lexia/agent/registry"

/** Names that are destructive by convention (hint for the client's approval UI). */
export const DESTRUCTIVE_RE = /^(excluir|anonimizar)/

/**
 * `client` tools (navigate / open-document edits) and `pergunta` only make sense
 * with the LexIA UI, so they never reach MCP.
 */
export function exposableKind(tool: AgentTool): boolean {
  return tool.kind === "readonly" || tool.kind === "mutation"
}

/** Registry tools this user may call over MCP (role + Processos kill-switch applied). */
export function selectMcpTools(role: string, processosHabilitado: boolean): AgentTool[] {
  return selectTools(role, undefined, false, processosHabilitado).filter(exposableKind)
}

/** "criar_lancamento" → "Criar lançamento". */
export function titleFor(name: string): string {
  const s = name.replace(/_/g, " ")
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export type McpAnnotations = {
  title: string
  readOnlyHint: boolean
  destructiveHint: boolean
  openWorldHint: false
}

export function annotationsFor(tool: AgentTool): McpAnnotations {
  return {
    title: titleFor(tool.name),
    readOnlyHint: tool.kind === "readonly",
    destructiveHint: tool.kind === "mutation" && DESTRUCTIVE_RE.test(tool.name),
    openWorldHint: false,
  }
}

/** JSON Schema for the tool input (same call `toApiTools` uses). */
export function inputJsonSchema(tool: AgentTool): unknown {
  return z.toJSONSchema(tool.schema)
}
