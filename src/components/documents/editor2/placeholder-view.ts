// Client-only rendering of the merge-field placeholder in the live editor.
//
// The shared `PlaceholderNode` (editor-schema.ts) renders a static `{{label}}`
// so the server-side .docx import (generateJSON) stays framework-free. In the
// browser we attach a NodeView (via editorProps.nodeViews) that paints the field
// as its VALUE when filled (gold-underlined) or `{{label}}` when empty (gold
// chip) — matching the PDF/preview — reading live values through `getValor`.
//
// Values live outside the document (the `valores` map), so a fill does NOT edit
// the doc and ProseMirror wouldn't call update(). `PlaceholderRefresh` closes
// that gap: a version-tagged node decoration per placeholder, bumped by a
// `refresh` meta the editor dispatches whenever `valores` changes → the decos
// differ → PM repaints every placeholder node view.
import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet, type NodeView } from "@tiptap/pm/view"
import type { Node as PMNode } from "@tiptap/pm/model"

export const placeholderRefreshKey = new PluginKey<number>("lexPlaceholderRefresh")

export function makePlaceholderNodeView(getValor: (name: string) => string) {
  return (node: PMNode): NodeView => {
    const dom = document.createElement("span")
    dom.setAttribute("contenteditable", "false")
    const paint = (n: PMNode) => {
      const name = String(n.attrs.name || "")
      const label = String(n.attrs.label || name || "campo")
      const val = getValor(name)
      dom.setAttribute("data-placeholder", name)
      if (val) {
        dom.className = "lex-chip filled"
        dom.textContent = val
      } else {
        dom.className = "lex-chip"
        dom.textContent = `{{${label}}}`
      }
    }
    paint(node)
    return {
      dom,
      update(updated) {
        if (updated.type.name !== "placeholder") return false
        paint(updated)
        return true
      },
      // atom leaf — never let DOM mutations bubble back into ProseMirror
      ignoreMutation: () => true,
      selectNode() {
        dom.classList.add("ProseMirror-selectednode")
      },
      deselectNode() {
        dom.classList.remove("ProseMirror-selectednode")
      },
    }
  }
}

export const PlaceholderRefresh = Extension.create({
  name: "lexPlaceholderRefresh",
  addProseMirrorPlugins() {
    return [
      new Plugin<number>({
        key: placeholderRefreshKey,
        state: {
          init: () => 0,
          apply: (tr, v) => (tr.getMeta(placeholderRefreshKey) ? v + 1 : v),
        },
        props: {
          decorations(state) {
            const version = placeholderRefreshKey.getState(state) ?? 0
            const decos: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name === "placeholder") {
                // version in ATTRS so the decoration's type changes each bump →
                // PM re-runs the node view's update() → repaint with fresh values.
                decos.push(Decoration.node(pos, pos + node.nodeSize, { "data-v": String(version) }))
              }
            })
            return decos.length ? DecorationSet.create(state.doc, decos) : DecorationSet.empty
          },
        },
      }),
    ]
  },
})
