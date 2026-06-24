// Validates the server-side .docx import pipeline's core: mammoth-style semantic
// HTML → ProseMirror JSON (via @tiptap/html + our editor schema, using zeed-dom,
// no browser) → canonical LexDoc. This is the runtime path tsc can't prove.
import { describe, expect, it } from "vitest"
import { generateJSON } from "@tiptap/html"
import { editorExtensions } from "@/lib/documents/editor-schema"
import { proseMirrorToLex, type PMNode } from "@/lib/documents/model/tiptap"

describe("docx HTML → LexDoc pipeline", () => {
  it("converts semantic HTML into a canonical LexDoc preserving structure + marks", () => {
    const html = `<h1>Procuração</h1><p>Eu, <strong>João</strong> <em>Silva</em>, nomeio:</p><ul><li>poder a</li><li>poder b</li></ul>`
    const json = generateJSON(html, editorExtensions) as unknown as PMNode
    const lex = proseMirrorToLex(json)

    expect(lex.content[0]).toMatchObject({ type: "heading", attrs: { level: 1 } })

    const p = lex.content[1]
    expect(p.type).toBe("paragraph")
    const bold =
      p.type === "paragraph" && (p.content ?? []).some((n) => n.type === "text" && n.marks?.some((m) => m.type === "bold"))
    const italic =
      p.type === "paragraph" && (p.content ?? []).some((n) => n.type === "text" && n.marks?.some((m) => m.type === "italic"))
    expect(bold).toBe(true)
    expect(italic).toBe(true)

    expect(lex.content[2]).toMatchObject({ type: "bulletList" })
    const list = lex.content[2]
    if (list.type === "bulletList") expect(list.content).toHaveLength(2)
  })
})
