// Model routing — pick the cheapest model that fits the request, to economize
// credits. Three tiers: Haiku for trivial chat, Sonnet for the everyday agent
// loop, Opus only for genuine long-form legal drafting. Heuristic-only (no extra
// model call). Each turn is routed on its OWN message — there is no permanent
// "stay on Opus" stickiness (a casual follow-up after a draft drops back to
// Sonnet/Haiku); the budget guard may further downgrade (see lib/consumo/guard).
export type ModelId = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-8"
export type Effort = "low" | "medium" | "high"

export interface RouteDecision {
  model: ModelId
  /** undefined ⇒ omit output_config.effort (Haiku does not support it). */
  effort?: Effort
  maxTokens: number
  /** Trivial smalltalk turns run without the tool surface. */
  useTools: boolean
}

const GREETING = /^\s*(oi|ol[áa]|bom dia|boa tarde|boa noite|tudo bem|obrigad[oa]|valeu|opa|e a[íi]|tchau|at[ée])\b/i
// Only genuine long-form legal DRAFTING earns Opus. Deliberately narrow: everyday
// words like "contrato", "analisar", "comparar", "relatório", "estratégia" route
// to Sonnet (which handles them well) — they appear in trivial queries too.
const REDACAO =
  /\b(rascunh|minuta|redig|parecer|peti[çc][ãa]o|contesta[çc][ãa]o|contrarraz|r[ée]plica|apela[çc][ãa]o|embargos|memorial|sustenta[çc][ãa]o)\b/i

// Opus generation is the same shape as Sonnet's everyday loop, just on the bigger
// model — medium effort and a bounded output cap keep thinking/output spend in check.
const OPUS: RouteDecision = { model: "claude-opus-4-8", effort: "medium", maxTokens: 8000, useTools: true }
const SONNET: RouteDecision = { model: "claude-sonnet-4-6", effort: "medium", maxTokens: 8192, useTools: true }
const HAIKU: RouteDecision = { model: "claude-haiku-4-5", maxTokens: 512, useTools: false }

/**
 * @param mensagem the user's new message
 * @param modeloAnterior the model used on the previous assistant turn — used ONLY
 *        to keep an empty-message resumed turn (confirm/recusar of a proposed
 *        action) on the same tier the proposal used. Real user turns ignore it.
 * @param opts.temAnexos the turn carries image/PDF attachments — forces a
 *        vision-capable tier with tools (never the Haiku no-tools small-talk path)
 */
export function decidirModelo(
  mensagem: string,
  modeloAnterior?: string | null,
  opts?: { temAnexos?: boolean },
): RouteDecision {
  const msg = mensagem.trim()

  // Attachments need a model that can read images/PDFs and still call tools.
  // Skip the greeting path; escalate to Opus only for heavy drafting asks.
  if (opts?.temAnexos) {
    return REDACAO.test(msg) ? OPUS : SONNET
  }

  // Greeting / small talk → Haiku (no tool surface).
  if (msg.length < 80 && GREETING.test(msg)) return HAIKU

  // Empty message = a resumed confirm/recusar turn — narrate on the SAME tier the
  // proposal used (continuity within one logical turn), without re-routing. This
  // is NOT stickiness: every real user message below routes on its own content.
  if (!msg && modeloAnterior) {
    return modeloAnterior === "claude-opus-4-8" ? OPUS : SONNET
  }

  // Genuine long-form drafting → Opus; everything else (queries, edits, analysis,
  // the whole agentic CRUD loop) → Sonnet. 1200-char threshold catches very long
  // pasted briefs that aren't keyword-matched.
  if (REDACAO.test(msg) || msg.length > 1200) return OPUS
  return SONNET
}
