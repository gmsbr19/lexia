import { describe, expect, it } from "vitest"
import type Anthropic from "@anthropic-ai/sdk"
import { comCacheBreakpoints } from "@/lib/lexia/agent/cache"

const cc = (b: unknown) => (b as { cache_control?: unknown }).cache_control

describe("comCacheBreakpoints — history cache markers", () => {
  it("does not mutate the caller's array (snapshot stays marker-free)", () => {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: "oi" }]
    const out = comCacheBreakpoints(messages)
    expect(messages[0].content).toBe("oi") // original untouched
    expect(out).not.toBe(messages)
  })

  it("marks the last block of the last message (string content → text block)", () => {
    const out = comCacheBreakpoints([{ role: "user", content: "olá" }])
    const blocks = out[0].content as Anthropic.ContentBlockParam[]
    expect(Array.isArray(blocks)).toBe(true)
    expect(blocks[0].type).toBe("text")
    expect(cc(blocks[0])).toEqual({ type: "ephemeral" })
  })

  it("marks the last cache-eligible block, skipping trailing thinking blocks", () => {
    const assistant: Anthropic.MessageParam = {
      role: "assistant",
      content: [
        { type: "text", text: "resposta" } as Anthropic.ContentBlockParam,
        { type: "thinking", thinking: "...", signature: "x" } as unknown as Anthropic.ContentBlockParam,
      ],
    }
    const out = comCacheBreakpoints([{ role: "user", content: "q" }, assistant])
    const blocks = out[1].content as Anthropic.ContentBlockParam[]
    expect(cc(blocks[0])).toEqual({ type: "ephemeral" }) // text marked
    expect(cc(blocks[1])).toBeUndefined() // thinking left alone
  })

  it("adds a second breakpoint a few messages back on long turns (≤ 2 markers here)", () => {
    const msgs: Anthropic.MessageParam[] = Array.from({ length: 6 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: `m${i}`,
    }))
    const out = comCacheBreakpoints(msgs)
    const marked = out.filter((m) => {
      const c = m.content
      return Array.isArray(c) && c.some((b) => cc(b))
    })
    expect(marked.length).toBe(2) // out[last] and out[last-4]
  })

  it("returns the empty array unchanged", () => {
    expect(comCacheBreakpoints([])).toEqual([])
  })
})
