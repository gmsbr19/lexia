// Unit tests for the AI document-edit ops engine (fill field / replace text /
// append paragraph) applied to a LexDoc + values map.
import { describe, expect, it } from 'vitest'
import type { LexDoc } from '@/lib/documents/model/types'
import { aplicarMarca, aplicarOps, partitionOps, substituirTexto, type DocOp } from '@/lib/documents/model/ops'

function doc(): LexDoc {
  return {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'O foro de São Paulo é eleito.', marks: [{ type: 'bold' }] }] },
    ],
  }
}

describe('substituirTexto', () => {
  it('replaces the first occurrence and keeps marks', () => {
    const out = substituirTexto(doc(), 'São Paulo', 'Campinas')
    const p = out.content[0]
    expect(p.type === 'paragraph' && p.content?.[0]).toEqual({ type: 'text', text: 'O foro de Campinas é eleito.', marks: [{ type: 'bold' }] })
  })
  it('leaves the doc unchanged when the text is absent', () => {
    const before = doc()
    expect(substituirTexto(before, 'inexistente', 'x')).toEqual(before)
  })

  it('replaces a match SPLIT ACROSS MARKS (multiple text nodes) — the "nada muda" bug', () => {
    const d: LexDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'O foro de São ' },
            { type: 'text', text: 'Paulo', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' é eleito.' },
          ],
        },
      ],
    }
    const out = substituirTexto(d, 'São Paulo', 'Campinas')
    const p = out.content[0]
    const text = p.type === 'paragraph' ? (p.content ?? []).map((n) => (n.type === 'text' ? n.text : '')).join('') : ''
    expect(text).toBe('O foro de Campinas é eleito.')
  })

  it('does NOT match across a placeholder (the field stays intact)', () => {
    const d: LexDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Eu, ' },
            { type: 'placeholder', attrs: { name: 'nome', label: 'Nome' } },
            { type: 'text', text: ', declaro.' },
          ],
        },
      ],
    }
    // "Eu, , declaro." would span the placeholder → must NOT match (placeholder preserved)
    expect(substituirTexto(d, 'Eu, , declaro.', 'X')).toEqual(d)
  })
})

describe('aplicarOps', () => {
  it('fills a field value', () => {
    const { valores } = aplicarOps(doc(), {}, [{ tipo: 'preencher_campo', name: 'outorgante', valor: 'Maria' }])
    expect(valores).toEqual({ outorgante: 'Maria' })
  })

  it('replaces text and appends a paragraph', () => {
    const ops: DocOp[] = [
      { tipo: 'substituir_texto', de: 'São Paulo', para: 'Santos' },
      { tipo: 'inserir_paragrafo', texto: 'Parágrafo novo.' },
    ]
    const { doc: out } = aplicarOps(doc(), {}, ops)
    expect(out.content).toHaveLength(2)
    const p0 = out.content[0]
    expect(p0.type === 'paragraph' && p0.content?.[0]?.type === 'text' && p0.content[0].text).toContain('Santos')
    const p1 = out.content[1]
    expect(p1).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'Parágrafo novo.' }] })
  })

  it('ignores malformed ops', () => {
    const before = doc()
    const { doc: out, valores } = aplicarOps(before, { a: '1' }, [
      { tipo: 'preencher_campo' }, // no name
      { tipo: 'substituir_texto' }, // no de
      { tipo: 'inserir_paragrafo', texto: '   ' }, // blank
    ])
    expect(out).toEqual(before)
    expect(valores).toEqual({ a: '1' })
  })

  it('ignores position (selection) ops — those are applied by the LIVE editor, not here', () => {
    const before = doc()
    const { doc: out } = aplicarOps(before, {}, [
      { tipo: 'substituir_selecao', from: 1, to: 5, de: 'São', para: 'XXX' },
      { tipo: 'inserir_apos_selecao', from: 1, to: 5, texto: 'YYY' },
    ])
    expect(out).toEqual(before)
  })
})

describe('partitionOps', () => {
  it('separates position (selection) ops from JSON (text/field) ops', () => {
    const ops: DocOp[] = [
      { tipo: 'preencher_campo', name: 'a', valor: 'x' },
      { tipo: 'substituir_selecao', from: 1, to: 5, de: 'foo', para: 'bar' },
      { tipo: 'substituir_texto', de: 'São Paulo', para: 'Santos' },
      { tipo: 'inserir_apos_selecao', from: 1, to: 5, texto: 'mais' },
      { tipo: 'formatar_selecao', from: 1, to: 5, de: 'foo', marca: 'bold' },
    ]
    const { jsonOps, posOps } = partitionOps(ops)
    expect(jsonOps.map((o) => o.tipo)).toEqual(['preencher_campo', 'substituir_texto'])
    expect(posOps.map((o) => o.tipo)).toEqual(['substituir_selecao', 'inserir_apos_selecao', 'formatar_selecao'])
  })
})

describe('aplicarMarca / formatar_texto (real marks, NOT markdown)', () => {
  it('applies a real bold mark to the matched span only', () => {
    const d: LexDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Valor de R$ 800,00 mensais.' }] }] }
    const out = aplicarMarca(d, 'R$ 800,00', 'bold')
    const p = out.content[0]
    const nodes = p.type === 'paragraph' ? p.content ?? [] : []
    const bolded = nodes.find((n) => n.type === 'text' && n.text === 'R$ 800,00')
    expect(bolded && bolded.type === 'text' && bolded.marks).toEqual([{ type: 'bold' }])
    // only the matched span is marked (no markdown asterisks inserted)
    expect(nodes.filter((n) => n.type === 'text' && n.marks)).toHaveLength(1)
    expect(nodes.every((n) => n.type !== 'text' || !n.text.includes('*'))).toBe(true)
  })

  it('aplicarOps routes formatar_texto', () => {
    const d: LexDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'O contratante João Silva.' }] }] }
    const { doc: out } = aplicarOps(d, {}, [{ tipo: 'formatar_texto', de: 'João Silva', marca: 'bold' }])
    const nodes = out.content[0].type === 'paragraph' ? out.content[0].content ?? [] : []
    expect(nodes.some((n) => n.type === 'text' && n.text === 'João Silva' && JSON.stringify(n.marks) === JSON.stringify([{ type: 'bold' }]))).toBe(true)
  })

  it('removes a mark with remover=true (and merges back)', () => {
    const d: LexDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Negrito', marks: [{ type: 'bold' }] }] }] }
    const out = aplicarMarca(d, 'Negrito', 'bold', true)
    expect(out.content[0].type === 'paragraph' && out.content[0].content?.[0]).toEqual({ type: 'text', text: 'Negrito' })
  })

  it('aplicarOps ignores formatar_selecao (a position op, applied by the live editor)', () => {
    const before: LexDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'abc' }] }] }
    expect(aplicarOps(before, {}, [{ tipo: 'formatar_selecao', from: 1, to: 2, de: 'a', marca: 'bold' }]).doc).toEqual(before)
  })
})
