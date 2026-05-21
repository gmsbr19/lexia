import { readFileSync } from 'fs'
import path from 'path'
import type { ContentBlock } from '../../types'
import type { ContratoHonorariosData } from '@/lib/types/contrato-honorarios'
import { buildContratoHonorarios } from './content'

// ── helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getLetterheadBase64(): string | null {
  try {
    const buf = readFileSync(path.join(process.cwd(), 'public', 'letterhead.png'))
    return buf.toString('base64')
  } catch {
    return null
  }
}

// ── block → HTML ──────────────────────────────────────────────────────────────

function blockToHtml(block: ContentBlock): string {
  if (block.type === 'paragraph') {
    const align = block.align ?? 'justify'
    const indent = block.indent ? 'text-indent:1.25cm;' : ''
    const chunks = block.chunks
      .map((c) => (c.bold ? `<strong>${esc(c.text)}</strong>` : esc(c.text)))
      .join('')
    return `<p style="text-align:${align};${indent}">${chunks}</p>`
  }

  if (block.type === 'heading') {
    const cls = block.level === 'chapter' ? 'chapter-title' : 'clause-title'
    return `<div class="${cls}">${esc(block.text.toUpperCase())}</div>`
  }

  if (block.type === 'signatures') {
    const pairs: (typeof block.rows)[] = []
    for (let i = 0; i < block.rows.length; i += 2) {
      pairs.push(block.rows.slice(i, i + 2))
    }
    const pairHtml = pairs.map((pair) => {
      const cells = pair.map((s) => `
        <div class="sig-cell">
          <div class="sig-line">${s.name ? `<strong>${esc(s.name)}</strong>` : '&nbsp;'}</div>
          <div class="sig-label">${esc(s.label ?? '')}</div>
        </div>`).join('')
      return `<div class="sig-row">${cells}</div>`
    }).join('')
    return `
      <div class="sig-section">
        <p class="sig-date">${esc(block.dateCity)}</p>
        ${pairHtml}
      </div>`
  }

  return ''
}

// ── HTML document template ────────────────────────────────────────────────────

export function buildContratoHonorariosHtml(data: ContratoHonorariosData): string {
  const blocks = buildContratoHonorarios(data)
  const body = blocks.map(blockToHtml).join('\n')

  const letterheadB64 = getLetterheadBase64()

  // The letterhead background uses position:fixed so Chromium repeats it on
  // every printed page. @page margin is 0 and body padding provides the
  // visual margins, ensuring the image covers the full 210mm × 297mm sheet.
  const letterheadHtml = letterheadB64
    ? `<div class="letterhead-bg">
         <img src="data:image/png;base64,${letterheadB64}" alt="" />
       </div>`
    : ''

  // Page margins that match the Paginator (3cm top/bottom, 2.5cm sides).
  // The fixed background is offset by those same values so it starts at the
  // physical page corner (0,0) and covers the full 210mm × 297mm sheet.
  const TOP = '3cm', RIGHT = '2.5cm', BOTTOM = '3cm', LEFT = '2.5cm'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: ${TOP} ${RIGHT} ${BOTTOM} ${LEFT};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #020D25;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* position:fixed repeats on every page in Chromium print mode.
     Use absolute dimensions (A4 size) so the element always covers the full
     page regardless of content. Set z-index: -1 as negative (below content)
     but also set parent to create a new stacking context. */
  .letterhead-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 210mm;
    height: 297mm;
    z-index: -1;
    pointer-events: none;
  }
  .letterhead-bg img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: fill;
  }
  .doc-content {
    position: relative;
    z-index: 1;
  }

  p { margin-bottom: 10pt; }

  .chapter-title {
    text-align: center;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    margin: 16pt 0 10pt;
  }
  .clause-title {
    font-weight: 700;
    text-transform: uppercase;
    margin: 14pt 0 8pt;
  }

  .sig-section { margin-top: 16pt; }
  .sig-date { text-align: right; margin-bottom: 12pt; }
  .sig-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24pt;
    margin-bottom: 6pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .sig-cell { text-align: center; padding-top: 28pt; }
  .sig-line {
    border-top: 1px solid #020D25;
    padding-top: 6pt;
    font-size: 12pt;
    min-height: 22pt;
  }
  .sig-label {
    font-size: 10pt;
    color: rgba(2,13,37,0.5);
    margin-top: 4pt;
  }
</style>
</head>
<body>
${letterheadHtml}
<div class="doc-content">${body}</div>
</body>
</html>`
}
