import { guardRequest, sessionEmail } from '@/lib/auth/session'
import { createDocumento, updateDocumento } from '@/lib/documentos/mutations'
import { generateContratoHonorariosDocx } from '@/lib/documents/generators/contrato-honorarios/docx'
import { generateContratoHonorariosPdf } from '@/lib/documents/generators/contrato-honorarios/pdf'
import { log } from '@/lib/log'
import { RATE_LIMIT_MESSAGE, rateLimit } from '@/lib/rate-limit'
import type { ContratoHonorariosData } from '@/lib/types/contrato-honorarios'

type GenerateBody = {
  type: 'contrato-honorarios'
  format: 'docx' | 'pdf'
  data: ContratoHonorariosData
  // Optional library persistence (Documento metadata; the binary stays a download).
  documentoId?: number // update this row instead of creating one
  nome?: string
  clienteId?: number | null
  casoId?: number | null
  salvar?: boolean // default true — pass false to skip the library
}

/** Persist/refresh the Documento metadata row; never fails the download it documents. */
async function persistDocumento(body: GenerateBody, criadoPor: string | null): Promise<void> {
  if (body.salvar === false) return
  try {
    if (body.documentoId) {
      await updateDocumento(body.documentoId, {
        status: 'finalizado',
        formato: body.format,
        payload: body.data,
        ...(body.nome ? { nome: body.nome } : {}),
        ...(body.clienteId !== undefined ? { clienteId: body.clienteId } : {}),
        ...(body.casoId !== undefined ? { casoId: body.casoId } : {}),
      })
    } else {
      await createDocumento({
        nome: body.nome?.trim() || 'Contrato de Honorários Advocatícios',
        template: body.type,
        formato: body.format,
        status: 'finalizado',
        payload: body.data,
        clienteId: body.clienteId ?? null,
        casoId: body.casoId ?? null,
        criadoPor,
      })
    }
  } catch (err) {
    log.error(
      { action: 'documents.persist', err: err instanceof Error ? `${err.name}: ${err.message}` : String(err) },
      'documento metadata persistence failed',
    )
  }
}

export async function POST(request: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const email = (await sessionEmail()) ?? 'anon'
  if (!rateLimit(`${email}:generate`, 6, 60_000)) {
    return new Response(RATE_LIMIT_MESSAGE, { status: 429 })
  }

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
      await persistDocumento(body, email)
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
      await persistDocumento(body, email)
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
    log.error(
      { action: 'documents.generate', format, err: err instanceof Error ? `${err.name}: ${err.message}` : String(err) },
      'document generation failed',
    )
    return new Response('Falha ao gerar o documento', { status: 500 })
  }
}
