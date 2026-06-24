// AI document-edit operations — PURE / SERVER-SAFE. The deterministic half of
// "LexIA edits the open flexible document": apply a list of high-level ops
// (fill a field, replace exact text, append a paragraph) onto a LexDoc + its
// field-values map. The LLM that proposes the ops lives in lib/documents/
// editar-ia.ts; this module is testable on its own.
import type { LexBlock, LexDoc, LexInline } from './types'

export interface DocOp {
  tipo: 'preencher_campo' | 'substituir_texto' | 'inserir_paragrafo'
  /** preencher_campo: the placeholder name + the value to set. */
  name?: string
  valor?: string
  /** substituir_texto: the exact text to find + its replacement. */
  de?: string
  para?: string
  /** inserir_paragrafo: the paragraph text to append at the end. */
  texto?: string
}

// ── replace exact text (first occurrence, keeping marks) ───────────────────────

function replaceInline(content: LexInline[], de: string, para: string): LexInline[] | null {
  for (let i = 0; i < content.length; i++) {
    const n = content[i]
    if (n.type !== 'text') continue
    const idx = n.text.indexOf(de)
    if (idx === -1) continue
    const novo = n.text.slice(0, idx) + para + n.text.slice(idx + de.length)
    const repl: LexInline = n.marks ? { type: 'text', text: novo, marks: n.marks } : { type: 'text', text: novo }
    return [...content.slice(0, i), repl, ...content.slice(i + 1)]
  }
  return null
}

function replaceBlocks(blocks: LexBlock[], de: string, para: string, state: { done: boolean }): LexBlock[] {
  return blocks.map((b): LexBlock => {
    if (state.done) return b
    if (b.type === 'paragraph' || b.type === 'heading') {
      if (b.content) {
        const next = replaceInline(b.content, de, para)
        if (next) {
          state.done = true
          return { ...b, content: next }
        }
      }
      return b
    }
    if (b.type === 'bulletList' || b.type === 'orderedList' || b.type === 'listItem' || b.type === 'blockquote') {
      return { ...b, content: replaceBlocks(b.content ?? [], de, para, state) } as LexBlock
    }
    return b
  })
}

/** Replace the FIRST occurrence of `de` with `para` (marks preserved). */
export function substituirTexto(doc: LexDoc, de: string, para: string): LexDoc {
  if (!de) return doc
  const state = { done: false }
  return { type: 'doc', content: replaceBlocks(doc.content, de, para, state) }
}

// ── apply a list of ops ────────────────────────────────────────────────────────

export interface AplicarOpsResult {
  doc: LexDoc
  valores: Record<string, string>
}

export function aplicarOps(doc: LexDoc, valores: Record<string, string>, ops: DocOp[]): AplicarOpsResult {
  let d = doc
  const v = { ...valores }
  for (const op of ops) {
    if (op?.tipo === 'preencher_campo' && op.name) {
      v[op.name] = op.valor ?? ''
    } else if (op?.tipo === 'substituir_texto' && op.de) {
      d = substituirTexto(d, op.de, op.para ?? '')
    } else if (op?.tipo === 'inserir_paragrafo' && op.texto?.trim()) {
      d = { type: 'doc', content: [...d.content, { type: 'paragraph', content: [{ type: 'text', text: op.texto }] }] }
    }
  }
  return { doc: d, valores: v }
}
