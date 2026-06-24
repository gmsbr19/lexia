// Canonical A4 HTML renderer — the SINGLE source of truth for fidelity. The
// on-screen Preview (an iframe) and the Puppeteer PDF both consume the EXACT
// string this produces, so "preview === PDF" is true by construction (same HTML,
// same CSS @page, same Chromium). PURE / SERVER-SAFE (no fs, no puppeteer).
import type {
  LexAlign,
  LexBlock,
  LexDoc,
  LexInline,
  LexListItem,
  MarginsMm,
} from '../model/types'
import { DEFAULT_MARGINS_MM } from '../model/types'
import { resolvePlaceholder } from '../model/placeholders'

// Element + typography rules SHARED by the print HTML (PDF) and the on-screen
// preview, so the two never drift on how content actually looks. The page box
// (@page vs the screen "sheet") and the letterhead positioning are the only
// differences, applied by each wrapper.
export const DOC_CONTENT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #020D25; }
  p { margin-bottom: 10pt; }
  h1, h2, h3 { font-weight: 700; }
  h1 { font-size: 14pt; margin: 16pt 0 10pt; }
  h2 { font-size: 13pt; margin: 14pt 0 8pt; }
  h3 { font-size: 12pt; margin: 12pt 0 6pt; }
  ul, ol { margin: 0 0 10pt 1.2cm; }
  li { margin-bottom: 4pt; }
  blockquote { margin: 0 0 10pt 0.8cm; padding-left: 0.4cm; border-left: 2px solid rgba(2,13,37,0.2); }
  img { max-width: 100%; }
  s { text-decoration: line-through; }
  .lex-ph { white-space: pre-wrap; }
  .lex-ph-empty { color: #8a6d1f; }
  .lex-pagebreak { break-before: page; page-break-before: always; }
`

export interface HtmlRenderOptions {
  /** Full data URL ("data:image/png;base64,…") of the letterhead art, or null. */
  letterheadDataUrl?: string | null
  /** Content margins (the letterhead safe area). Defaults to 3cm/2.5cm. */
  marginsMm?: MarginsMm
  /** Field values keyed by placeholder `name`. */
  valores?: Record<string, string>
  /** Emit only the body markup (no <html>/<style>) — for embedding/tests. */
  bodyOnly?: boolean
}

// ── escaping ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── inline ─────────────────────────────────────────────────────────────────────

function wrapMarks(html: string, marks: { type: string }[] | undefined): string {
  if (!marks?.length) return html
  let out = html
  for (const m of marks) {
    if (m.type === 'bold') out = `<strong>${out}</strong>`
    else if (m.type === 'italic') out = `<em>${out}</em>`
    else if (m.type === 'underline') out = `<u>${out}</u>`
    else if (m.type === 'strike') out = `<s>${out}</s>`
  }
  return out
}

function inlineToHtml(nodes: LexInline[] | undefined, valores?: Record<string, string>): string {
  if (!nodes?.length) return ''
  return nodes
    .map((n) => {
      if (n.type === 'text') return wrapMarks(esc(n.text), n.marks)
      if (n.type === 'hardBreak') return '<br/>'
      if (n.type === 'placeholder') {
        const { text, filled } = resolvePlaceholder(n.attrs, valores)
        const cls = filled ? 'lex-ph' : 'lex-ph lex-ph-empty'
        return `<span class="${cls}" data-ph="${esc(n.attrs.name)}">${esc(text)}</span>`
      }
      return ''
    })
    .join('')
}

// ── blocks ─────────────────────────────────────────────────────────────────────

function alignStyle(align?: LexAlign): string {
  return align ? `text-align:${align};` : ''
}

function listItemsToHtml(items: LexListItem[] | undefined, valores?: Record<string, string>): string {
  if (!items?.length) return ''
  return items.map((li) => `<li>${(li.content ?? []).map((b) => blockToHtml(b, valores)).join('')}</li>`).join('')
}

function blockToHtml(block: LexBlock, valores?: Record<string, string>): string {
  switch (block.type) {
    case 'paragraph': {
      const indent = block.attrs?.indent ? 'text-indent:1.25cm;' : ''
      const inner = inlineToHtml(block.content, valores)
      return `<p style="${alignStyle(block.attrs?.align)}${indent}">${inner || '<br/>'}</p>`
    }
    case 'heading': {
      const level = block.attrs?.level ?? 1
      const inner = inlineToHtml(block.content, valores)
      return `<h${level} style="${alignStyle(block.attrs?.align)}">${inner}</h${level}>`
    }
    case 'bulletList':
      return `<ul>${listItemsToHtml(block.content, valores)}</ul>`
    case 'orderedList': {
      const start = block.attrs?.start && block.attrs.start !== 1 ? ` start="${block.attrs.start}"` : ''
      return `<ol${start}>${listItemsToHtml(block.content, valores)}</ol>`
    }
    case 'blockquote':
      return `<blockquote>${(block.content ?? []).map((b) => blockToHtml(b, valores)).join('')}</blockquote>`
    case 'image': {
      const w = block.attrs.width ? `width:${block.attrs.width}px;` : ''
      const align = block.attrs.align === 'center' ? 'margin:0 auto;display:block;' : ''
      return `<img src="${esc(block.attrs.src)}" alt="" style="max-width:100%;${w}${align}"/>`
    }
    case 'pageBreak':
      return `<div class="lex-pagebreak"></div>`
    case 'listItem':
      // listItem only appears inside a list; render defensively if reached.
      return `<div>${(block.content ?? []).map((b) => blockToHtml(b, valores)).join('')}</div>`
    default:
      return ''
  }
}

// ── document ───────────────────────────────────────────────────────────────────

function mmToCss(mm: number): string {
  return `${mm}mm`
}

/** Render a LexDoc to the canonical A4 print HTML (preview + PDF share this). */
export function documentToHtml(doc: LexDoc, opts: HtmlRenderOptions = {}): string {
  const valores = opts.valores
  const body = doc.content.map((b) => blockToHtml(b, valores)).join('\n')

  if (opts.bodyOnly) return body

  const m = opts.marginsMm ?? DEFAULT_MARGINS_MM
  const TOP = mmToCss(m.top)
  const RIGHT = mmToCss(m.right)
  const BOTTOM = mmToCss(m.bottom)
  const LEFT = mmToCss(m.left)

  // NOTE: the letterhead is NOT drawn here. A repeating full-bleed letterhead with
  // per-page content margins can't be done reliably in Chromium print (fixed/root
  // backgrounds drift relative to the @page margins). The PDF path composites it
  // behind every page with pdf-lib (`overlayLetterhead` in ./pdf). This HTML keeps
  // a TRANSPARENT background so that letterhead shows through. The @page margins
  // below ARE the letterhead safe area, repeated on every page by Chromium.
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: ${TOP} ${RIGHT} ${BOTTOM} ${LEFT}; }
  * { margin: 0; padding: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: transparent; }
  ${DOC_CONTENT_CSS}
  .lex-content { position: relative; }
</style>
</head>
<body>
<div class="lex-content">${body}</div>
</body>
</html>`
}

/**
 * On-screen preview HTML for the editor iframe: ONE white A4-width sheet (the
 * letterhead tiled every page-height) using the SAME DOC_CONTENT_CSS + the same
 * block markup as the PDF, so the content is byte-identical. (True multi-page
 * pagination on screen is a later enhancement — the PDF is the paginated truth.)
 */
export function documentToPreviewHtml(doc: LexDoc, opts: HtmlRenderOptions & { zoom?: number } = {}): string {
  const body = doc.content.map((b) => blockToHtml(b, opts.valores)).join('\n')
  const m = opts.marginsMm ?? DEFAULT_MARGINS_MM
  const pad = `${mmToCss(m.top)} ${mmToCss(m.right)} ${mmToCss(m.bottom)} ${mmToCss(m.left)}`
  const zoom = opts.zoom ?? 1
  const lh = opts.letterheadDataUrl
    ? `background-image:url("${esc(opts.letterheadDataUrl)}");background-repeat:repeat-y;background-size:210mm 297mm;background-position:top center;`
    : ''
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><style>
  html, body { margin: 0; padding: 0; background: #eef0f3; }
  .lex-sheet { position: relative; width: 210mm; min-height: 297mm; margin: 16px auto; background: #fff; box-shadow: 0 1px 3px rgba(2,13,37,0.08), 0 16px 40px rgba(2,13,37,0.10); zoom: ${zoom}; ${lh} }
  .lex-sheet-content { position: relative; padding: ${pad}; }
  ${DOC_CONTENT_CSS}
</style></head>
<body><div class="lex-sheet"><div class="lex-sheet-content">${body}</div></div></body></html>`
}
