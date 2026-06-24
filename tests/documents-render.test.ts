// Unit tests for the new flexible documents foundation: the portable LexDoc
// model, placeholder resolution, and the canonical HTML / DOCX renderers. Pure —
// no DB, no Chromium (the PDF path just wraps htmlToPdf around this same HTML).
import { describe, expect, it } from 'vitest'
import type { LexDoc } from '@/lib/documents/model/types'
import { extractPlaceholders, resolvePlaceholder } from '@/lib/documents/model/placeholders'
import { documentToHtml } from '@/lib/documents/render/html'
import { documentToDocx } from '@/lib/documents/render/docx'

// A 1×1 transparent PNG as a data URL (for the image branch).
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function richDoc(): LexDoc {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1, align: 'center' },
        content: [{ type: 'text', text: 'Procuração' }],
      },
      {
        type: 'paragraph',
        attrs: { indent: true },
        content: [
          { type: 'text', text: 'Outorgante: ' },
          { type: 'placeholder', attrs: { name: 'outorgante_nome', dataType: 'nome', label: 'Nome do outorgante' } },
          { type: 'text', text: ', portador do CPF ' },
          { type: 'placeholder', attrs: { name: 'outorgante_cpf', dataType: 'cpf', label: 'CPF' } },
          { type: 'text', text: '.' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'negrito', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' itálico', marks: [{ type: 'italic' }] },
          { type: 'text', text: ' sublinhado', marks: [{ type: 'underline' }] },
          { type: 'text', text: ' riscado', marks: [{ type: 'strike' }] },
          { type: 'hardBreak' },
          { type: 'text', text: 'a < b & c' },
        ],
      },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'um' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'dois' }] }] },
        ],
      },
      {
        type: 'orderedList',
        attrs: { start: 3 },
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'terceiro' }] }] },
        ],
      },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'citação' }] }] },
      { type: 'image', attrs: { src: PNG_1PX, width: 120, height: 120, align: 'center' } },
      { type: 'pageBreak' },
      { type: 'paragraph', content: [{ type: 'text', text: 'página dois' }] },
    ],
  }
}

describe('placeholders', () => {
  it('extracts declared placeholders, de-duped by name', () => {
    const decls = extractPlaceholders(richDoc())
    expect(decls.map((d) => d.name)).toEqual(['outorgante_nome', 'outorgante_cpf'])
    expect(decls[0]).toMatchObject({ dataType: 'nome', label: 'Nome do outorgante' })
  })

  it('resolves value > default > token', () => {
    expect(resolvePlaceholder({ name: 'x', label: 'X' }, { x: 'Maria' })).toEqual({ text: 'Maria', filled: true })
    expect(resolvePlaceholder({ name: 'x', label: 'X', defaultValue: 'João' })).toEqual({ text: 'João', filled: true })
    expect(resolvePlaceholder({ name: 'x', label: 'X' })).toEqual({ text: '‹X›', filled: false })
  })
})

describe('documentToHtml', () => {
  const html = documentToHtml(richDoc(), {
    letterheadDataUrl: PNG_1PX,
    valores: { outorgante_nome: 'Maria Silva' },
  })

  it('wraps the four inline marks', () => {
    expect(html).toContain('<strong>negrito</strong>')
    expect(html).toContain('<em> itálico</em>')
    expect(html).toContain('<u> sublinhado</u>')
    expect(html).toContain('<s> riscado</s>')
  })

  it('renders headings, lists and blockquote', () => {
    expect(html).toContain('<h1 style="text-align:center;">Procuração</h1>')
    expect(html).toContain('<ul><li>')
    expect(html).toContain('<ol start="3">')
    expect(html).toContain('<blockquote>')
  })

  it('fills a placeholder and marks an empty one', () => {
    expect(html).toContain('Maria Silva')
    expect(html).toContain('data-ph="outorgante_cpf"')
    expect(html).toContain('lex-ph-empty')
    expect(html).toContain('‹CPF›')
  })

  it('escapes HTML-special characters in text', () => {
    expect(html).toContain('a &lt; b &amp; c')
  })

  it('keeps a transparent background (letterhead composited by pdf-lib) and emits a page break', () => {
    // The letterhead is NOT inlined into the print HTML anymore: pdf-lib stamps it
    // behind every page (overlayLetterhead in ./pdf), so the HTML stays transparent
    // and lets it show through. The page break still renders as a .lex-pagebreak div.
    expect(html).toContain('background: transparent')
    expect(html).not.toContain('lex-letterhead')
    expect(html).toContain('lex-pagebreak')
  })

  it('bodyOnly omits the document shell', () => {
    const body = documentToHtml(richDoc(), { bodyOnly: true })
    expect(body).not.toContain('<!DOCTYPE html>')
    expect(body).not.toContain('@page')
  })
})

describe('documentToDocx', () => {
  it('renders every node type to a valid .docx (zip) buffer without throwing', async () => {
    const buf = await documentToDocx(richDoc(), { valores: { outorgante_nome: 'Maria Silva' } })
    expect(Buffer.isBuffer(buf)).toBe(true)
    // .docx is a ZIP — the OPC container always starts with the "PK" signature.
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK')
    expect(buf.length).toBeGreaterThan(1000)
  })
})
