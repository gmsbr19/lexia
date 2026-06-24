// Unit tests for the AI document-edit ops engine (fill field / replace text /
// append paragraph) applied to a LexDoc + values map.
import { describe, expect, it } from 'vitest'
import type { LexDoc } from '@/lib/documents/model/types'
import { aplicarOps, substituirTexto, type DocOp } from '@/lib/documents/model/ops'

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
})
