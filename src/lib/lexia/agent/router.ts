// Model routing — pick the cheapest model that fits the request, to economize
// credits. Three tiers: Haiku for trivial chat, Sonnet for the everyday agent
// loop (the DEFAULT), and Opus ONLY when the user explicitly opts in via the UI
// "Usar Opus" toggle (it costs more credits). There is no keyword/length
// auto-escalation to Opus anymore. Heuristic-only (no extra model call); the
// budget guard may still downgrade Opus→Sonnet (see lib/consumo/guard).
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
 * @param opts.forcarOpus the user toggled "Usar Opus" (legado) — equivale a
 *        modelo:'avancado'. ONE of the two Opus paths.
 * @param opts.modelo the chat model selector: 'avancado' → Opus (the ONLY Opus
 *        path besides forcarOpus); 'rapido'/'auto' use the default Haiku/Sonnet
 *        routing (no auto-escalation to Opus).
 */
export function decidirModelo(
  mensagem: string,
  modeloAnterior?: string | null,
  opts?: { temAnexos?: boolean; forcarOpus?: boolean; modelo?: "auto" | "rapido" | "avancado" },
): RouteDecision {
  const msg = mensagem.trim()

  // Opus is OPT-IN ONLY (the "Avançado" model / legacy "Usar Opus" toggle). No
  // keyword/length auto-escalation.
  if (opts?.forcarOpus || opts?.modelo === "avancado") return OPUS

  // Attachments need a vision-capable tier that can still call tools → Sonnet.
  if (opts?.temAnexos) return SONNET

  // Greeting / small talk → Haiku (no tool surface).
  if (msg.length < 80 && GREETING.test(msg)) return HAIKU

  // Empty message = a resumed confirm/recusar turn — narrate on the SAME tier the
  // proposal used (continuity within one logical turn), without re-routing.
  if (!msg && modeloAnterior) {
    return modeloAnterior === "claude-opus-4-8" ? OPUS : SONNET
  }

  // Everything else → Sonnet (the default).
  return SONNET
}
