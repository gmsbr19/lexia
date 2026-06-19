// Prompt-cache breakpoint placement for the agent loop. Pure (only the Anthropic
// type) so it's unit-testable in isolation. See lib/lexia/agent/loop.ts.
import type Anthropic from "@anthropic-ai/sdk"

const EPHEMERAL = { type: "ephemeral" as const }
// Block kinds that accept cache_control (thinking/redacted_thinking do NOT).
const CACHEAVEL = new Set(["text", "tool_result", "tool_use", "image", "document"])

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
    blocks[i] = { ...(blocks[i] as Anthropic.ContentBlockParam), cache_control: EPHEMERAL } as Anthropic.ContentBlockParam
    out[idx] = { ...m, content: blocks }
  }

  marcar(out.length - 1)
  if (out.length >= 4) marcar(out.length - 4)
  return out
}
