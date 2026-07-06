// Field detection support — PURE / SERVER-SAFE. Turns "detected spans" (from the
// AI or a manual pick) into placeholder nodes inside a LexDoc, and extracts the
// plain text the detector reads. The actual LLM call lives server-side in
// lib/documents/detectar-campos.ts; this module is the deterministic, testable
// half.
import type { LexBlock, LexDoc, LexInline, LexPlaceholderNode, PlaceholderType } from './types'

export interface CampoDetectado {
  /** Exact substring in the document to replace with a field. */
  exactText: string
  /** Stable key (valores map / placeholder name). */
  name: string
  dataType?: PlaceholderType
  label?: string
  /** Form-layout metadata (the AI groups fields + picks controls). */
  section?: string
  options?: string[]
  multiline?: boolean
}

// ── plain text (what the detector reads) ───────────────────────────────────────

function inlineText(content: LexInline[] | undefined): string {
  if (!content?.length) return ''
  return content.map((n) => (n.type === 'text' ? n.text : '')).join('')
}

function blocksText(blocks: LexBlock[] | undefined, out: string[]): void {
  if (!blocks) return
  for (const b of blocks) {
    if (b.type === 'paragraph' || b.type === 'heading') {
      const t = inlineText(b.content)
      if (t) out.push(t)
    } else if (b.type === 'bulletList' || b.type === 'orderedList' || b.type === 'listItem' || b.type === 'blockquote') {
      blocksText(b.content, out)
    }
  }
}

/** Concatenate the document's paragraph/heading text, one block per line. */
export function lexDocText(doc: LexDoc): string {
  const out: string[] = []
  blocksText(doc.content, out)
  return out.join('\n')
}

// ── apply a field (wrap the first matching span in a placeholder node) ─────────

function splitInline(content: LexInline[], campo: CampoDetectado): LexInline[] | null {
  for (let i = 0; i < content.length; i++) {
    const node = content[i]
    if (node.type !== 'text') continue
    const idx = node.text.indexOf(campo.exactText)
    if (idx === -1) continue
    const before = node.text.slice(0, idx)
    const after = node.text.slice(idx + campo.exactText.length)
    const ph: LexPlaceholderNode = {
      type: 'placeholder',
      attrs: {
        name: campo.name,
        dataType: campo.dataType ?? 'texto',
        label: campo.label || campo.name,
        ...(campo.section ? { section: campo.section } : {}),
        ...(campo.options?.length ? { options: campo.options } : {}),
        ...(campo.multiline ? { multiline: true } : {}),
      },
    }
    const repl: LexInline[] = []
    if (before) repl.push(node.marks ? { type: 'text', text: before, marks: node.marks } : { type: 'text', text: before })
    repl.push(ph)
    if (after) repl.push(node.marks ? { type: 'text', text: after, marks: node.marks } : { type: 'text', text: after })
    return [...content.slice(0, i), ...repl, ...content.slice(i + 1)]
  }
  return null
}

function applyToBlocks(blocks: LexBlock[], campo: CampoDetectado, state: { done: boolean }): LexBlock[] {
  return blocks.map((b): LexBlock => {
    if (state.done) return b
    if (b.type === 'paragraph' || b.type === 'heading') {
      if (b.content) {
        const next = splitInline(b.content, campo)
        if (next) {
          state.done = true
          return { ...b, content: next }
        }
      }
      return b
    }
    if (b.type === 'bulletList' || b.type === 'orderedList' || b.type === 'listItem' || b.type === 'blockquote') {
      return { ...b, content: applyToBlocks(b.content ?? [], campo, state) } as LexBlock
    }
    return b
  })
}

/**
 * Wrap the FIRST occurrence of each campo's `exactText` in a placeholder node.
 * Campos whose text isn't found (or that lack name/exactText) are skipped. Pure:
 * returns a new LexDoc.
 */
export function aplicarCampos(doc: LexDoc, campos: CampoDetectado[]): LexDoc {
  let content = doc.content
  for (const campo of campos) {
    if (!campo?.exactText || !campo?.name) continue
    const state = { done: false }
    content = applyToBlocks(content, campo, state)
  }
  return { type: 'doc', content }
}
