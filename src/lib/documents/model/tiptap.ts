// Converters between the TipTap/ProseMirror document JSON (what the editor
// produces/consumes) and the canonical LexDoc (what the renderers + the DB store).
// PURE — operates on plain JSON, imports NO editor code, so it is unit-testable
// and safe on the server. The only real divergences it normalizes: TipTap stores
// alignment as `textAlign` (TextAlign extension) while LexDoc uses `align`; and
// TipTap may carry nodes/marks we don't support (code, link, horizontalRule…),
// which are dropped so the stored LexDoc stays within its schema.
import type {
  LexAlign,
  LexBlock,
  LexDoc,
  LexInline,
  LexListItem,
  LexMark,
  LexMarkType,
  PlaceholderType,
} from './types'

// ── ProseMirror JSON (loose) ─────────────────────────────────────────────────

interface PMMark {
  type: string
  attrs?: Record<string, unknown>
}
export interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  marks?: PMMark[]
  text?: string
}

const SUPPORTED_MARKS: ReadonlySet<string> = new Set<LexMarkType>(['bold', 'italic', 'underline', 'strike'])
const ALIGNS: ReadonlySet<string> = new Set<LexAlign>(['left', 'center', 'right', 'justify'])

function alignOf(attrs: Record<string, unknown> | undefined): LexAlign | undefined {
  const a = attrs?.textAlign
  // 'left' is the default — omit it so an unstyled paragraph stays unstyled.
  if (typeof a === 'string' && a !== 'left' && ALIGNS.has(a)) return a as LexAlign
  return undefined
}

function intOf(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

// ── PM → LexDoc ──────────────────────────────────────────────────────────────

function marksToLex(marks: PMMark[] | undefined): LexMark[] | undefined {
  if (!marks?.length) return undefined
  const out = marks.filter((m) => SUPPORTED_MARKS.has(m.type)).map((m) => ({ type: m.type as LexMarkType }))
  return out.length ? out : undefined
}

function inlineToLex(nodes: PMNode[] | undefined): LexInline[] | undefined {
  if (!nodes?.length) return undefined
  const out: LexInline[] = []
  for (const n of nodes) {
    if (n.type === 'text') {
      const marks = marksToLex(n.marks)
      out.push(marks ? { type: 'text', text: n.text ?? '', marks } : { type: 'text', text: n.text ?? '' })
    } else if (n.type === 'hardBreak') {
      out.push({ type: 'hardBreak' })
    } else if (n.type === 'placeholder') {
      const a = n.attrs ?? {}
      out.push({
        type: 'placeholder',
        attrs: {
          name: String(a.name ?? ''),
          dataType: typeof a.dataType === 'string' ? (a.dataType as PlaceholderType) : undefined,
          label: typeof a.label === 'string' ? a.label : undefined,
          defaultValue: typeof a.defaultValue === 'string' ? a.defaultValue : undefined,
          section: typeof a.section === 'string' ? a.section : undefined,
          options: Array.isArray(a.options) ? a.options.filter((x): x is string => typeof x === 'string') : undefined,
          multiline: a.multiline === true ? true : undefined,
        },
      })
    }
  }
  return out.length ? out : undefined
}

function listItemsToLex(nodes: PMNode[] | undefined): LexListItem[] {
  if (!nodes?.length) return []
  return nodes
    .filter((n) => n.type === 'listItem')
    .map((n) => ({ type: 'listItem' as const, content: blocksToLex(n.content) }))
}

function blockToLex(n: PMNode): LexBlock | null {
  switch (n.type) {
    case 'paragraph': {
      const align = alignOf(n.attrs)
      const content = inlineToLex(n.content)
      return { type: 'paragraph', ...(align ? { attrs: { align } } : {}), ...(content ? { content } : {}) }
    }
    case 'heading': {
      const align = alignOf(n.attrs)
      const lvl = intOf(n.attrs?.level)
      const level = (lvl ? Math.min(3, Math.max(1, lvl)) : 1) as 1 | 2 | 3
      const content = inlineToLex(n.content)
      return { type: 'heading', attrs: { level, ...(align ? { align } : {}) }, ...(content ? { content } : {}) }
    }
    case 'bulletList':
      return { type: 'bulletList', content: listItemsToLex(n.content) }
    case 'orderedList': {
      const start = intOf(n.attrs?.start)
      return { type: 'orderedList', ...(start && start !== 1 ? { attrs: { start } } : {}), content: listItemsToLex(n.content) }
    }
    case 'blockquote':
      return { type: 'blockquote', content: blocksToLex(n.content) }
    case 'image': {
      const src = typeof n.attrs?.src === 'string' ? n.attrs.src : ''
      if (!src) return null
      return { type: 'image', attrs: { src, width: intOf(n.attrs?.width), height: intOf(n.attrs?.height) } }
    }
    case 'pageBreak':
      return { type: 'pageBreak' }
    default:
      return null // drop unsupported nodes (horizontalRule, codeBlock, …)
  }
}

function blocksToLex(nodes: PMNode[] | undefined): LexBlock[] {
  if (!nodes?.length) return []
  return nodes.map(blockToLex).filter((b): b is LexBlock => b !== null)
}

/** Convert the editor's ProseMirror JSON to the canonical LexDoc. */
export function proseMirrorToLex(pm: PMNode | null | undefined): LexDoc {
  const content = blocksToLex(pm?.content)
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

// ── LexDoc → PM ──────────────────────────────────────────────────────────────

function inlineToPm(nodes: LexInline[] | undefined): PMNode[] | undefined {
  if (!nodes?.length) return undefined
  return nodes.map((n) => {
    if (n.type === 'text') {
      return n.marks?.length
        ? { type: 'text', text: n.text, marks: n.marks.map((m) => ({ type: m.type })) }
        : { type: 'text', text: n.text }
    }
    if (n.type === 'hardBreak') return { type: 'hardBreak' }
    return { type: 'placeholder', attrs: { ...n.attrs } }
  })
}

function blockToPm(b: LexBlock): PMNode {
  switch (b.type) {
    case 'paragraph':
      return { type: 'paragraph', attrs: { textAlign: b.attrs?.align ?? null }, ...(inlineToPm(b.content) ? { content: inlineToPm(b.content) } : {}) }
    case 'heading':
      return {
        type: 'heading',
        attrs: { level: b.attrs?.level ?? 1, textAlign: b.attrs?.align ?? null },
        ...(inlineToPm(b.content) ? { content: inlineToPm(b.content) } : {}),
      }
    case 'bulletList':
      return { type: 'bulletList', content: (b.content ?? []).map(blockToPm) }
    case 'orderedList':
      return { type: 'orderedList', attrs: { start: b.attrs?.start ?? 1 }, content: (b.content ?? []).map(blockToPm) }
    case 'listItem':
      return { type: 'listItem', content: (b.content ?? []).map(blockToPm) }
    case 'blockquote':
      return { type: 'blockquote', content: (b.content ?? []).map(blockToPm) }
    case 'image':
      return { type: 'image', attrs: { src: b.attrs.src, width: b.attrs.width ?? null, height: b.attrs.height ?? null } }
    case 'pageBreak':
      return { type: 'pageBreak' }
    default:
      return { type: 'paragraph' }
  }
}

/** Convert a canonical LexDoc to ProseMirror JSON for the editor. */
export function lexToProseMirror(doc: LexDoc): PMNode {
  const content = (doc.content ?? []).map(blockToPm)
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}
