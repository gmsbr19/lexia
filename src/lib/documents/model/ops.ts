// AI document-edit operations — PURE / SERVER-SAFE. The deterministic half of
// "LexIA edits the open flexible document": apply a list of high-level ops
// (fill a field, replace exact text, append a paragraph) onto a LexDoc + its
// field-values map. The LLM proposes the ops via the agent tool
// `editar_documento_aberto` (lib/lexia/agent/tools/documentos.ts); the position-
// based selection ops (substituir_selecao / inserir_apos_selecao) are applied
// through the LIVE editor (see partitionOps), not here. This module is testable on its own.
import type { LexBlock, LexDoc, LexInline, LexMark, LexMarkType, LexTextNode } from './types'

export interface DocOp {
  tipo:
    | 'preencher_campo'
    | 'substituir_texto'
    | 'inserir_paragrafo'
    | 'substituir_selecao'
    | 'inserir_apos_selecao'
    | 'formatar_texto'
    | 'formatar_selecao'
  /** preencher_campo: the placeholder name + the value to set. */
  name?: string
  valor?: string
  /** substituir_texto: the exact text to find + its replacement. */
  de?: string
  para?: string
  /** inserir_paragrafo: the paragraph text to append at the end. */
  texto?: string
  /** formatar_texto / formatar_selecao: which mark to (un)apply. */
  marca?: LexMarkType
  /** true = remove the mark instead of applying it. */
  remover?: boolean
  /**
   * substituir_selecao / inserir_apos_selecao / formatar_selecao: ProseMirror
   * positions of the user's selection (copied verbatim from the <selecao> block).
   * `para` carries the new text for substituir_selecao; `texto` for
   * inserir_apos_selecao; `marca` for formatar_selecao. These are POSITION-based
   * and must be applied through the live editor (see partitionOps), never through
   * aplicarOps (which rebuilds the LexDoc and invalidates positions).
   */
  from?: number
  to?: number
}

/** True for ops that target ProseMirror positions (applied via the live editor). */
export function ehOpPosicional(op: DocOp): boolean {
  return op?.tipo === 'substituir_selecao' || op?.tipo === 'inserir_apos_selecao' || op?.tipo === 'formatar_selecao'
}

/**
 * Split a batch into JSON ops (text/field — applied with aplicarOps + remount) and
 * position ops (selection — applied imperatively through the live editor). The two
 * passes never mix in one frame: the remount would invalidate the live positions.
 */
export function partitionOps(ops: DocOp[]): { jsonOps: DocOp[]; posOps: DocOp[] } {
  const jsonOps: DocOp[] = []
  const posOps: DocOp[] = []
  for (const op of ops) (ehOpPosicional(op) ? posOps : jsonOps).push(op)
  return { jsonOps, posOps }
}

// ── replace exact text (first occurrence, keeping marks) ───────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

function sameMarks(a?: LexMark[], b?: LexMark[]): boolean {
  if (!a?.length && !b?.length) return true
  if (!a || !b || a.length !== b.length) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Merge consecutive text nodes that share the same marks (keeps the doc tidy). */
function mergeText(content: LexInline[]): LexInline[] {
  const out: LexInline[] = []
  for (const n of content) {
    const last = out[out.length - 1]
    if (n.type === 'text' && last && last.type === 'text' && sameMarks(last.marks, n.marks)) {
      out[out.length - 1] = last.marks ? { type: 'text', text: last.text + n.text, marks: last.marks } : { type: 'text', text: last.text + n.text }
    } else {
      out.push(n)
    }
  }
  return out
}

const txt = (text: string, marks?: LexMark[]): LexTextNode => (marks ? { type: 'text', text, marks } : { type: 'text', text })

/**
 * Replace the FIRST occurrence of `de` with `para` inside a block's inline content.
 * The search runs over RUNS of consecutive text nodes, so a match split across marks
 * (e.g. "São **Paulo**", which is two text nodes) STILL applies — this was the cause
 * of "edit applied but nothing changed". Runs are broken by non-text inline nodes
 * (placeholders / hard breaks), so those are never crossed or deleted. The
 * replacement inherits the marks of the text node where the match starts.
 */
function replaceInline(content: LexInline[], de: string, para: string): LexInline[] | null {
  const result: LexInline[] = []
  let done = false
  let i = 0
  while (i < content.length) {
    const node = content[i]
    if (done || node.type !== 'text') {
      result.push(node)
      i++
      continue
    }
    // maximal run of consecutive text nodes [i, j)
    let j = i
    let combined = ''
    while (j < content.length && content[j].type === 'text') {
      combined += (content[j] as LexTextNode).text
      j++
    }
    const idx = combined.indexOf(de)
    if (idx === -1) {
      for (let k = i; k < j; k++) result.push(content[k])
      i = j
      continue
    }
    const matchEnd = idx + de.length
    let pos = 0
    let inserted = false
    for (let k = i; k < j; k++) {
      const tn = content[k] as LexTextNode
      const start = pos
      const end = pos + tn.text.length
      pos = end
      const before = tn.text.slice(0, clamp(idx - start, 0, tn.text.length))
      const after = tn.text.slice(clamp(matchEnd - start, 0, tn.text.length))
      if (before) result.push(txt(before, tn.marks))
      if (!inserted && start <= idx && idx < end) {
        if (para) result.push(txt(para, tn.marks))
        inserted = true
      }
      if (after) result.push(txt(after, tn.marks))
    }
    done = true
    i = j
  }
  return done ? mergeText(result) : null
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

// ── apply / remove a mark over the first occurrence of an exact span ────────────
// This is REAL formatting (a bold/italic/underline/strike MARK on the text nodes),
// NOT inserting markdown "**" — which the editor would render literally.

function withMark(marks: LexMark[] | undefined, marca: LexMarkType, remover: boolean): LexMark[] | undefined {
  const base = marks ?? []
  const next = remover ? base.filter((m) => m.type !== marca) : base.some((m) => m.type === marca) ? base : [...base, { type: marca }]
  return next.length ? next : undefined
}

function markInline(content: LexInline[], de: string, marca: LexMarkType, remover: boolean): LexInline[] | null {
  const result: LexInline[] = []
  let done = false
  let i = 0
  while (i < content.length) {
    const node = content[i]
    if (done || node.type !== 'text') {
      result.push(node)
      i++
      continue
    }
    let j = i
    let combined = ''
    while (j < content.length && content[j].type === 'text') {
      combined += (content[j] as LexTextNode).text
      j++
    }
    const idx = combined.indexOf(de)
    if (idx === -1) {
      for (let k = i; k < j; k++) result.push(content[k])
      i = j
      continue
    }
    const matchEnd = idx + de.length
    let pos = 0
    for (let k = i; k < j; k++) {
      const tn = content[k] as LexTextNode
      const start = pos
      pos += tn.text.length
      const mStart = clamp(idx - start, 0, tn.text.length)
      const mEnd = clamp(matchEnd - start, 0, tn.text.length)
      const before = tn.text.slice(0, mStart)
      const mid = tn.text.slice(mStart, mEnd)
      const after = tn.text.slice(mEnd)
      if (before) result.push(txt(before, tn.marks))
      if (mid) result.push(txt(mid, withMark(tn.marks, marca, remover)))
      if (after) result.push(txt(after, tn.marks))
    }
    done = true
    i = j
  }
  return done ? mergeText(result) : null
}

function markBlocks(blocks: LexBlock[], de: string, marca: LexMarkType, remover: boolean, state: { done: boolean }): LexBlock[] {
  return blocks.map((b): LexBlock => {
    if (state.done) return b
    if (b.type === 'paragraph' || b.type === 'heading') {
      if (b.content) {
        const next = markInline(b.content, de, marca, remover)
        if (next) {
          state.done = true
          return { ...b, content: next }
        }
      }
      return b
    }
    if (b.type === 'bulletList' || b.type === 'orderedList' || b.type === 'listItem' || b.type === 'blockquote') {
      return { ...b, content: markBlocks(b.content ?? [], de, marca, remover, state) } as LexBlock
    }
    return b
  })
}

/** Apply (or remove) a mark over the FIRST occurrence of `de` (across marks; never crossing placeholders). */
export function aplicarMarca(doc: LexDoc, de: string, marca: LexMarkType, remover = false): LexDoc {
  if (!de) return doc
  const state = { done: false }
  return { type: 'doc', content: markBlocks(doc.content, de, marca, remover, state) }
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
    } else if (op?.tipo === 'formatar_texto' && op.de && op.marca) {
      d = aplicarMarca(d, op.de, op.marca, op.remover ?? false)
    } else if (op?.tipo === 'inserir_paragrafo' && op.texto?.trim()) {
      d = { type: 'doc', content: [...d.content, { type: 'paragraph', content: [{ type: 'text', text: op.texto }] }] }
    }
  }
  return { doc: d, valores: v }
}
