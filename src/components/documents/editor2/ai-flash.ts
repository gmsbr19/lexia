// Transient "the LexIA just changed this" highlight for the flexible editor.
//
// When an AI-proposed edit is applied to the LIVE document (a position op, or a
// freshly inserted paragraph after a remount), we briefly wrap the affected
// range in a `.doc-ai-ins` inline decoration — a gold fade that draws the eye to
// what changed, then clears itself. Purely presentational: the decoration never
// touches the document, maps through subsequent edits, and is dropped by a
// scheduled `clear` meta (owned by the caller) or the next `flash`.
import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const aiFlashKey = new PluginKey("lexAiFlash")

type FlashMeta = { type: "flash"; from: number; to: number } | { type: "clear" }

export const AiFlash = Extension.create({
  name: "lexAiFlash",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiFlashKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(aiFlashKey) as FlashMeta | undefined
            if (meta?.type === "clear") return DecorationSet.empty
            let set = old.map(tr.mapping, tr.doc)
            if (meta?.type === "flash") {
              const size = tr.doc.content.size
              const from = Math.max(0, Math.min(meta.from, size))
              const to = Math.max(from, Math.min(meta.to, size))
              if (to > from) set = set.add(tr.doc, [Decoration.inline(from, to, { class: "doc-ai-ins" })])
            }
            return set
          },
        },
        props: {
          decorations(state) {
            return aiFlashKey.getState(state)
          },
        },
      }),
    ]
  },
})
