// The TipTap schema/extension set, shared by the editor (DocEditor, client) and
// the server-side .docx import (generateJSON over the same schema). These are
// framework-agnostic (no @tiptap/react), so they import cleanly on both sides.
// Keeping ONE definition guarantees imported documents parse into exactly the
// nodes the editor and the LexDoc converter understand.
import { Node, mergeAttributes } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"

// Merge-field: inline atom rendered as a chip. Its attrs ARE the LexDoc
// placeholder attrs (the converter is near-identity for this node).
export const PlaceholderNode = Node.create({
  name: "placeholder",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      name: { default: "" },
      dataType: { default: "texto" },
      label: { default: "" },
      defaultValue: { default: "" },
      // Form-layout metadata — kept in the model (getJSON) but not rendered to
      // the DOM (rendered:false), so the .docx-import HTML round-trip ignores them.
      section: { default: null, rendered: false },
      options: { default: null, rendered: false },
      multiline: { default: null, rendered: false },
    }
  },
  parseHTML() {
    return [{ tag: "span[data-placeholder]" }]
  },
  renderHTML({ node, HTMLAttributes }) {
    const label = (node.attrs.label as string) || (node.attrs.name as string) || "campo"
    return ["span", mergeAttributes(HTMLAttributes, { "data-placeholder": node.attrs.name, class: "lex-chip" }), `{{${label}}}`]
  },
})

export const PageBreakNode = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div[data-page-break]" }]
  },
  renderHTML() {
    return ["div", { "data-page-break": "", class: "lex-pb" }, "— quebra de página —"]
  },
})

export const editorExtensions = [
  StarterKit,
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Image,
  PlaceholderNode,
  PageBreakNode,
]
