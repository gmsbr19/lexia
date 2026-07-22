// Prompt-cache breakpoint placement for the agent loop. Pure (only the Anthropic
// type) so it's unit-testable in isolation. See lib/lexia/agent/loop.ts.
import type Anthropic from "@anthropic-ai/sdk"

const EPHEMERAL = { type: "ephemeral" as const }
// Block kinds that accept cache_control (thinking/redacted_thinking do NOT).
const CACHEAVEL = new Set(["text", "tool_result", "tool_use", "image", "document"])
// Subset of ContentBlockParam that actually accepts cache_control.
type CacheableBlock = Exclude<Anthropic.ContentBlockParam, { type: "thinking" } | { type: "redacted_thinking" }>

/**
 * Return a shallow-cloned `messages` array with cache breakpoints on the recent
 * history, WITHOUT mutating the caller's array (so the snapshot stored by
 * pending.ts stays marker-free). Two breakpoints: the newest message (cache write
 * each call → read on the next) and one a few messages back, to bridge the
 * 20-block lookback window on long agentic turns. With the system block's own
 * breakpoint that is ≤ 3, within the API's 4-breakpoint limit.
 */
export function comCacheBreakpoints(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages
  const out = messages.slice()

  const marcar = (idx: number) => {
    const m = out[idx]
    if (!m) return
    if (typeof m.content === "string") {
      out[idx] = { ...m, content: [{ type: "text", text: m.content, cache_control: EPHEMERAL }] }
      return
    }
    if (!Array.isArray(m.content) || m.content.length === 0) return
    // Mark the last cache-eligible block (skip trailing thinking blocks).
    let i = m.content.length - 1
    while (i >= 0 && !CACHEAVEL.has((m.content[i] as { type: string }).type)) i--
    if (i < 0) return
    const blocks = m.content.slice()
    // i points at a CACHEAVEL block (text/tool_result/tool_use/image/document) — all
    // accept cache_control; the cast bypasses the union's thinking-block members.
    blocks[i] = { ...(blocks[i] as CacheableBlock), cache_control: EPHEMERAL }
    out[idx] = { ...m, content: blocks }
  }

  marcar(out.length - 1)
  if (out.length >= 4) marcar(out.length - 4)
  return out
}

// ── Compactação de resultados de leitura ────────────────────────────────────────
// Nº de mensagens RECENTES preservadas verbatim (o modelo ainda pode estar
// raciocinando sobre dados frescos). ~3 round-trips de tool (assistant+user por vez).
const RECENTES = 6
const COMPACT_MIN = 200 // não vale a pena compactar resultados curtos
const PLACEHOLDER = "[resultado de consulta anterior omitido para economizar contexto — reconsulte se realmente precisar]"

/** Resultados destas ferramentas só valem no momento em que são buscados: são
 *  DUMPS de estado (listagens/detalhes) que, uma vez usados, só inflam o contexto
 *  ao serem reenviados a cada iteração/turno. Mutações (criar_/editar_/…) devolvem
 *  ids pequenos e ÚTEIS (o modelo precisa deles) — nunca são compactadas. */
function ehLeituraCompactavel(name: string | undefined): boolean {
  if (!name) return false
  return name.startsWith("listar_") || name.startsWith("detalhe_") || name === "buscar"
}

/**
 * Substitui o conteúdo de tool_results de LEITURA antigos por um placeholder curto,
 * preservando a estrutura (mesmo tool_use_id) exigida pela API. É a maior alavanca
 * de economia em tarefas de CRUD em massa: o modelo re-lista/re-detalha o estado a
 * cada passo, e esses JSONs pesados eram reenviados em TODA iteração e dentro dos
 * snapshots de retomada. As últimas RECENTES mensagens ficam intactas; erros e
 * resultados de mutação também. Puro — não muta o array recebido.
 */
export function compactarHistorico(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length <= RECENTES) return messages
  // tool_use_id → nome da ferramenta (dos turnos do assistente).
  const nomePorId = new Map<string, string>()
  for (const m of messages) {
    if (m.role !== "assistant" || !Array.isArray(m.content)) continue
    for (const b of m.content) {
      if ((b as { type: string }).type === "tool_use") {
        const tu = b as Anthropic.ToolUseBlock
        nomePorId.set(tu.id, tu.name)
      }
    }
  }
  const limite = messages.length - RECENTES
  let mudou = false
  const out = messages.map((m, idx) => {
    if (idx >= limite || !Array.isArray(m.content)) return m
    let localMudou = false
    const content = m.content.map((b) => {
      const blk = b as { type: string }
      if (blk.type !== "tool_result") return b
      const tr = b as Anthropic.ToolResultBlockParam
      if (tr.is_error || typeof tr.content !== "string" || tr.content.length < COMPACT_MIN) return b
      if (!ehLeituraCompactavel(nomePorId.get(tr.tool_use_id))) return b
      localMudou = true
      return { ...tr, content: PLACEHOLDER }
    })
    if (!localMudou) return m
    mudou = true
    return { ...m, content }
  })
  return mudou ? out : messages
}
