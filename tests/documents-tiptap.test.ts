// Unit tests for the TipTap/ProseMirror ↔ LexDoc converters. Pure JSON in/out.
import { describe, expect, it } from 'vitest'
import type { LexDoc } from '@/lib/documents/model/types'
import { lexToProseMirror, proseMirrorToLex, type PMNode } from '@/lib/documents/model/tiptap'

describe('proseMirrorToLex', () => {
  it('maps textAlign → align (dropping the default left) and clamps headings', () => {
    const pm: PMNode = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 9, textAlign: 'center' }, content: [{ type: 'text', text: 'T' }] },
        { type: 'paragraph', attrs: { textAlign: 'left' }, content: [{ type: 'text', text: 'p' }] },
        { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [{ type: 'text', text: 'q' }] },
      ],
    }
    const lex = proseMirrorToLex(pm)
    expect(lex.content[0]).toMatchObject({ type: 'heading', attrs: { level: 3, align: 'center' } }) // 9 clamped → 3
    expect(lex.content[1]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'p' }] }) // left dropped
    expect(lex.content[2]).toMatchObject({ type: 'paragraph', attrs: { align: 'justify' } })
  })

  it('keeps only supported marks and drops unsupported nodes', () => {
    const pm: PMNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a', marks: [{ type: 'bold' }, { type: 'code' }, { type: 'link', attrs: { href: 'x' } }] },
          ],
        },
        { type: 'horizontalRule' },
        { type: 'codeBlock', content: [{ type: 'text', text: 'x' }] },
      ],
    }
    const lex = proseMirrorToLex(pm)
    expect(lex.content).toHaveLength(1) // hr + codeBlock dropped
    const p = lex.content[0]
    expect(p.type).toBe('paragraph')
    expect(p.type === 'paragraph' && p.content?.[0]).toEqual({ type: 'text', text: 'a', marks: [{ type: 'bold' }] })
  })

  it('preserves placeholders and page breaks', () => {
    const pm: PMNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'placeholder', attrs: { name: 'cpf', dataType: 'cpf', label: 'CPF', defaultValue: '' } }],
        },
        { type: 'pageBreak' },
      ],
    }
    const lex = proseMirrorToLex(pm)
    const p = lex.content[0]
    expect(p.type === 'paragraph' && p.content?.[0]).toMatchObject({ type: 'placeholder', attrs: { name: 'cpf', dataType: 'cpf', label: 'CPF' } })
    expect(lex.content[1]).toEqual({ type: 'pageBreak' })
  })

  it('falls back to an empty paragraph for an empty doc', () => {
    expect(proseMirrorToLex({ type: 'doc', content: [] })).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(proseMirrorToLex(null)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })
})

describe('lexToProseMirror', () => {
  it('maps align → textAlign and carries placeholder attrs', () => {
    const lex: LexDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2, align: 'center' }, content: [{ type: 'text', text: 'T' }] },
        { type: 'paragraph', content: [{ type: 'placeholder', attrs: { name: 'nome', dataType: 'nome', label: 'Nome' } }] },
        { type: 'pageBreak' },
      ],
    }
    const pm = lexToProseMirror(lex)
    expect(pm.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 2, textAlign: 'center' } })
    expect(pm.content?.[1]?.content?.[0]).toMatchObject({ type: 'placeholder', attrs: { name: 'nome', dataType: 'nome' } })
    expect(pm.content?.[2]).toEqual({ type: 'pageBreak' })
  })
})

describe('round-trip lex → pm → lex', () => {
  it('is stable for a representative document', () => {
    const lex: LexDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1, align: 'center' }, content: [{ type: 'text', text: 'Procuração' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Eu, ' },
            { type: 'placeholder', attrs: { name: 'outorgante', dataType: 'nome', label: 'Outorgante' } },
            { type: 'text', text: ' nomeio.', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'poder a' }] }] }],
        },
        { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }] }] },
        { type: 'pageBreak' },
      ],
    }
    expect(proseMirrorToLex(lexToProseMirror(lex))).toEqual(lex)
  })
})
