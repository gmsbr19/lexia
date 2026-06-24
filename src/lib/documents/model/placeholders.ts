// Placeholder helpers — PURE / SERVER-SAFE. Walk a LexDoc to (a) collect its
// declared merge-fields (for the fields panel + template metadata) and (b)
// resolve one placeholder to its rendered text given a values map. Shared by the
// HTML and DOCX renderers and by the template/document mutations.
import type {
  LexBlock,
  LexDoc,
  LexInline,
  LexPlaceholderNode,
  PlaceholderType,
} from './types'

export interface PlaceholderDecl {
  name: string
  dataType: PlaceholderType
  label: string
  defaultValue?: string
}

/** The text a placeholder renders to, plus whether it was actually filled. */
export interface ResolvedPlaceholder {
  text: string
  filled: boolean
}

function isInlineContainer(
  block: LexBlock,
): block is Extract<LexBlock, { content?: LexInline[] }> {
  return block.type === 'paragraph' || block.type === 'heading'
}

/** Walk every block in the tree (depth-first), invoking `visit` on each. */
function walkBlocks(blocks: LexBlock[] | undefined, visit: (b: LexBlock) => void): void {
  if (!blocks) return
  for (const b of blocks) {
    visit(b)
    // Recurse into block containers (lists / list items / blockquote).
    if (b.type === 'bulletList' || b.type === 'orderedList') {
      walkBlocks(b.content, visit)
    } else if (b.type === 'listItem' || b.type === 'blockquote') {
      walkBlocks(b.content, visit)
    }
  }
}

function eachPlaceholder(doc: LexDoc, visit: (n: LexPlaceholderNode) => void): void {
  walkBlocks(doc.content, (b) => {
    if (isInlineContainer(b)) {
      for (const inline of b.content ?? []) {
        if (inline.type === 'placeholder') visit(inline)
      }
    }
  })
}

/**
 * Collect the document's declared placeholders, de-duplicated by `name`
 * (first occurrence wins for label/type/default). This is what the editor's
 * fields panel renders and what a Template persists as its merge-field schema.
 */
export function extractPlaceholders(doc: LexDoc): PlaceholderDecl[] {
  const seen = new Map<string, PlaceholderDecl>()
  eachPlaceholder(doc, (n) => {
    const name = n.attrs.name?.trim()
    if (!name || seen.has(name)) return
    seen.set(name, {
      name,
      dataType: n.attrs.dataType ?? 'texto',
      label: n.attrs.label?.trim() || name,
      defaultValue: n.attrs.defaultValue,
    })
  })
  return [...seen.values()]
}

/**
 * Resolve one placeholder to display text: the value from `valores`, else the
 * declared default, else a visible token (guillemets around the label) so an
 * unfilled field is obvious in BOTH the preview and the exported file (they use
 * the same renderer, so they always agree).
 */
export function resolvePlaceholder(
  attrs: LexPlaceholderNode['attrs'],
  valores?: Record<string, string>,
): ResolvedPlaceholder {
  const v = valores?.[attrs.name]
  if (v != null && v !== '') return { text: v, filled: true }
  if (attrs.defaultValue) return { text: attrs.defaultValue, filled: true }
  return { text: `‹${attrs.label?.trim() || attrs.name}›`, filled: false }
}
