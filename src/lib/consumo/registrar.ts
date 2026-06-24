// Single write path for the API usage ledger (LexiaUso). Fire-and-forget: a
// telemetry failure must NEVER break the business call (same philosophy as
// lib/notificacoes/triggers). Called from EVERY Anthropic call site. SERVER ONLY.
import type Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/db"
import { log } from "@/lib/log"

export type RecursoUso = "chat" | "briefing" | "triagem" | "resumo" | "vinculo" | "criterios" | "doc-suggest" | "doc-campos"

/** Record one Anthropic call's token usage. Never throws. */
export async function registrarUso(args: {
  userEmail?: string | null
  recurso: RecursoUso
  modelo: string
  usage: Anthropic.Message["usage"] | null | undefined
}): Promise<void> {
  const u = args.usage
  if (!u) return
  try {
    await prisma.lexiaUso.create({
      data: {
        userEmail: args.userEmail ?? null,
        recurso: args.recurso,
        modelo: args.modelo,
        inputTokens: u.input_tokens ?? 0,
        cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
        cacheReadTokens: u.cache_read_input_tokens ?? 0,
        outputTokens: u.output_tokens ?? 0,
      },
    })
  } catch (e) {
    log.warn({ err: e instanceof Error ? e.message : String(e), recurso: args.recurso }, "registrarUso falhou")
  }
}
