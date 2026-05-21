import { generateContratoHonorariosDocx } from '@/lib/documents/generators/contrato-honorarios/docx'
import { generateContratoHonorariosPdf } from '@/lib/documents/generators/contrato-honorarios/pdf'
import type { ContratoHonorariosData } from '@/lib/types/contrato-honorarios'

type GenerateBody = {
  type: 'contrato-honorarios'
  format: 'docx' | 'pdf'
  data: ContratoHonorariosData
}

export async function POST(request: Request) {
  let body: GenerateBody

  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { type, format, data } = body

  if (type !== 'contrato-honorarios') {
    return new Response(`Unknown document type: ${type}`, { status: 400 })
  }

  try {
    if (format === 'docx') {
      const buffer = await generateContratoHonorariosDocx(data)
      const filename = encodeURIComponent('Contrato de Honorários Advocatícios.docx')
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        },
      })
    }

    if (format === 'pdf') {
      const buffer = await generateContratoHonorariosPdf(data)
      const filename = encodeURIComponent('Contrato de Honorários Advocatícios.pdf')
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        },
      })
    }

    return new Response(`Unsupported format: ${format}`, { status: 400 })
  } catch (err) {
    console.error('[generate] error:', err)
    return new Response('Document generation failed', { status: 500 })
  }
}
