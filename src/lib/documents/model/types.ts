// The portable document model — the SINGLE source of truth for the new flexible
// documents system. It is a pragmatic subset of ProseMirror's document JSON, so
// the TipTap editor's `getJSON()` IS a `LexDoc` with no mapping, and the server
// renderers (HTML / DOCX / PDF) consume the exact same tree. Nothing here imports
// the editor — the type is plain data, safe on the server and in tests.
//
// Rich-text scope (v1): paragraphs, headings, ordered/bullet lists, blockquote,
// images, page breaks, hard breaks, and inline marks (bold/italic/underline/
// strike). Tables and signature blocks are the next extension point — the
// renderers dispatch on `node.type` with an explicit unknown-node fallback so
// adding a node type never silently corrupts output.

// ── inline marks ───────────────────────────────────────────────────────────────

export type LexMarkType = 'bold' | 'italic' | 'underline' | 'strike'
export interface LexMark {
  type: LexMarkType
}

// ── placeholders (merge-fields) ──────────────────────────────────────────────
// A placeholder is a first-class INLINE atom node: the editor renders it as a
// "chip", the renderers resolve it to a value (from the document's `valores`
// map) or its default, or a visible token when empty. This is what lets the AI
// and the human edit the same document and what powers "upload a model → mark
// the fields".

export type PlaceholderType =
  | 'texto'
  | 'nome'
  | 'cpf'
  | 'cnpj'
  | 'rg'
  | 'oab'
  | 'data'
  | 'valor'
  | 'endereco'
  | 'email'
  | 'processo'
  | 'numero'

export interface LexPlaceholderNode {
  type: 'placeholder'
  attrs: {
    /** Stable key used in the `valores` map (e.g. "outorgante_nome"). */
    name: string
    /** Semantic type — drives input masks + AI suggestions. */
    dataType?: PlaceholderType
    /** Human label shown in the fields panel + as the empty token. */
    label?: string
    /** Value used when `valores[name]` is absent. */
    defaultValue?: string
    /** Form-layout metadata (AI-detected): section this field belongs to. */
    section?: string
    /** Fixed choices → renders a dropdown in the form. */
    options?: string[]
    /** Long free text → renders a textarea in the form. */
    multiline?: boolean
  }
}

// ── inline content ───────────────────────────────────────────────────────────

export interface LexTextNode {
  type: 'text'
  text: string
  marks?: LexMark[]
}

export interface LexHardBreak {
  type: 'hardBreak'
}

export type LexInline = LexTextNode | LexPlaceholderNode | LexHardBreak

// ── block content ──────────────────────────────────────────────────────────────

export type LexAlign = 'left' | 'center' | 'right' | 'justify'

export interface LexParagraph {
  type: 'paragraph'
  attrs?: { align?: LexAlign; indent?: boolean }
  content?: LexInline[]
}

export interface LexHeading {
  type: 'heading'
  attrs?: { level?: 1 | 2 | 3; align?: LexAlign }
  content?: LexInline[]
}

export interface LexBlockquote {
  type: 'blockquote'
  content?: LexBlock[]
}

export interface LexListItem {
  type: 'listItem'
  content?: LexBlock[]
}

export interface LexBulletList {
  type: 'bulletList'
  content?: LexListItem[]
}

export interface LexOrderedList {
  type: 'orderedList'
  attrs?: { start?: number }
  content?: LexListItem[]
}

export interface LexImage {
  type: 'image'
  attrs: { src: string; width?: number; height?: number; align?: LexAlign }
}

export interface LexPageBreak {
  type: 'pageBreak'
}

export type LexBlock =
  | LexParagraph
  | LexHeading
  | LexBlockquote
  | LexBulletList
  | LexOrderedList
  | LexListItem
  | LexImage
  | LexPageBreak

// ── document ───────────────────────────────────────────────────────────────────

export interface LexDoc {
  type: 'doc'
  content: LexBlock[]
}

/** A4 content margins in millimetres (the letterhead's safe area). */
export interface MarginsMm {
  top: number
  right: number
  bottom: number
  left: number
}

/** Default margins — match the legacy contract renderer (3cm / 2.5cm). */
export const DEFAULT_MARGINS_MM: MarginsMm = { top: 30, right: 25, bottom: 30, left: 25 }

/** An empty document with a single empty paragraph (valid for the editor). */
export function emptyDoc(): LexDoc {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}
