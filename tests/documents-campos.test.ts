// Unit tests for the field-application engine (detected spans → placeholder nodes)
// and the plain-text extraction the AI detector reads.
import { describe, expect, it } from 'vitest'
import type { LexDoc } from '@/lib/documents/model/types'
import { aplicarCampos, lexDocText, type CampoDetectado } from '@/lib/documents/model/campos'

function doc(): LexDoc {
  return {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Procuração' }] },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Eu, João da Silva, brasileiro, CPF 123.456.789-00, nomeio.' }],
      },
    ],
  }
}

describe('lexDocText', () => {
  it('joins block text line by line', () => {
    expect(lexDocText(doc())).toBe('Procuração\nEu, João da Silva, brasileiro, CPF 123.456.789-00, nomeio.')
  })
})

describe('aplicarCampos', () => {
  it('wraps the first matching span in a placeholder, keeping surrounding text', () => {
    const campos: CampoDetectado[] = [{ exactText: 'João da Silva', name: 'outorgante', dataType: 'nome', label: 'Outorgante' }]
    const out = aplicarCampos(doc(), campos)
    const p = out.content[1]
    expect(p.type).toBe('paragraph')
    if (p.type !== 'paragraph') return
    expect(p.content).toEqual([
      { type: 'text', text: 'Eu, ' },
      { type: 'placeholder', attrs: { name: 'outorgante', dataType: 'nome', label: 'Outorgante' } },
      { type: 'text', text: ', brasileiro, CPF 123.456.789-00, nomeio.' },
    ])
  })

  it('applies multiple fields independently', () => {
    const campos: CampoDetectado[] = [
      { exactText: 'João da Silva', name: 'outorgante', dataType: 'nome', label: 'Outorgante' },
      { exactText: '123.456.789-00', name: 'cpf', dataType: 'cpf', label: 'CPF' },
    ]
    const out = aplicarCampos(doc(), campos)
    const p = out.content[1]
    if (p.type !== 'paragraph') throw new Error('expected paragraph')
    const phs = (p.content ?? []).filter((n) => n.type === 'placeholder')
    expect(phs).toHaveLength(2)
  })

  it('preserves marks on the surrounding text', () => {
    const d: LexDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'O réu NOME paga.', marks: [{ type: 'bold' }] }] }],
    }
    const out = aplicarCampos(d, [{ exactText: 'NOME', name: 'reu', label: 'Réu' }])
    const p = out.content[0]
    if (p.type !== 'paragraph') throw new Error('expected paragraph')
    expect(p.content?.[0]).toEqual({ type: 'text', text: 'O réu ', marks: [{ type: 'bold' }] })
    expect(p.content?.[2]).toEqual({ type: 'text', text: ' paga.', marks: [{ type: 'bold' }] })
  })

  it('skips fields whose text is absent and leaves the doc unchanged', () => {
    const before = doc()
    const out = aplicarCampos(before, [{ exactText: 'inexistente', name: 'x', label: 'X' }])
    expect(out).toEqual(before)
  })
})
