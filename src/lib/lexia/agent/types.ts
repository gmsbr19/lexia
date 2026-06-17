// LexIA agent — shared types. SERVER ONLY (tools call query/mutation layers).
//
// A tool wraps an existing query (readonly), mutation (confirmation-gated) or a
// client-side action (navigation). The loop in `loop.ts` parses the model's
// tool input against `schema`, then: runs readonly/client tools inline; pauses
// on mutation tools to ask the user for confirmation.
import type { z } from "zod"
import type { Role, SessionUser } from "@/lib/auth/session"
import type { Emit, SseEvent, UiBlock } from "../types"

export type { Emit, SseEvent, UiBlock }

/** Cartão de confirmação legível: título + linhas (nomes resolvidos, datas/$ pt-BR). */
export interface Confirmacao {
  resumo: string
  detalhes?: { label: string; valor: string }[]
}

export type ToolKind = "readonly" | "mutation" | "client"

export interface AgentCtx {
  user: SessionUser
  conversaId: number
  /** Current app route the user is on, e.g. "/financeiro" — context only. */
  page?: string
  /** Aborts when the HTTP client disconnects. */
  signal: AbortSignal
}

export interface AgentTool {
  name: string
  description: string
  schema: z.ZodType
  kind: ToolKind
  /**
   * client tools only: which SSE event the loop emits from this tool's output.
   * "navigate" (default) → the run() returns a route string and the browser
   * router.pushes it. "doc-patch" → the run() returns { sugestoes } and the
   * editor renders "Aceitar" cards over the live document. Omit ⇒ "navigate".
   */
  clientEvent?: "navigate" | "doc-patch"
  /** Roles allowed to invoke this tool ('admin' always passes). Omit = any user. */
  roles?: Role[]
  /** Mutation tools: PT-BR one-line summary for the confirmation card (sync fallback). */
  resumo?: (input: unknown) => string
  /**
   * Mutation tools (preferido): monta o cartão de confirmação LEGÍVEL — resolve
   * ids→nomes e formata datas/$ em pt-BR. Chamado no momento da proposta (async).
   * Se ausente, cai no `resumo` síncrono.
   */
  montarConfirmacao?: (ctx: AgentCtx, input: unknown) => Promise<Confirmacao>
  /**
   * readonly/client: execute and return a JSON-serializable result.
   * mutation: the same fn, executed at confirm time (not at propose time).
   */
  run?: (ctx: AgentCtx, input: unknown) => Promise<unknown>
}

/** Type-safe tool definition; erases to the uniform `AgentTool` for the registry. */
export function defineTool<S extends z.ZodType>(def: {
  name: string
  description: string
  schema: S
  kind: ToolKind
  clientEvent?: "navigate" | "doc-patch"
  roles?: Role[]
  resumo?: (input: z.infer<S>) => string
  montarConfirmacao?: (ctx: AgentCtx, input: z.infer<S>) => Promise<Confirmacao>
  run?: (ctx: AgentCtx, input: z.infer<S>) => Promise<unknown>
}): AgentTool {
  return def as unknown as AgentTool
}

