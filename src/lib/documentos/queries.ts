// Documentos — read layer. SERVER ONLY.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import type { DocumentoDetail, DocumentoFormato, DocumentoRow, DocumentoStatus } from "./types"

const DOC_SELECT = {
  id: true,
  nome: true,
  template: true,
  formato: true,
  status: true,
  clienteId: true,
  casoId: true,
  criadoPor: true,
  createdAt: true,
  updatedAt: true,
  cliente: { select: { nome: true } },
  caso: { select: { titulo: true } },
} satisfies Prisma.DocumentoSelect

type DocRecord = Prisma.DocumentoGetPayload<{ select: typeof DOC_SELECT }>

function toRow(r: DocRecord): DocumentoRow {
  return {
    id: r.id,
    nome: r.nome,
    template: r.template,
    formato: (r.formato ?? null) as DocumentoFormato | null,
    status: r.status as DocumentoStatus,
    clienteId: r.clienteId,
    cliente: r.cliente?.nome ?? null,
    casoId: r.casoId,
    caso: r.caso?.titulo ?? null,
    criadoPor: r.criadoPor,
    criadoEm: r.createdAt.toISOString(),
    atualizadoEm: r.updatedAt.toISOString(),
  }
}

export interface DocumentoFiltro {
  clienteId?: number
  casoId?: number
}

export async function getDocumentos(filtro: DocumentoFiltro = {}): Promise<DocumentoRow[]> {
  const where: Prisma.DocumentoWhereInput = {}
  if (filtro.clienteId) where.clienteId = filtro.clienteId
  if (filtro.casoId) where.casoId = filtro.casoId
  const rows = await prisma.documento.findMany({ where, select: DOC_SELECT, orderBy: { updatedAt: "desc" } })
  return rows.map(toRow)
}

/** Detail incl. the parsed `payload` (form data) so the editor can re-open it. */
export async function getDocumento(id: number): Promise<DocumentoDetail | null> {
  const r = await prisma.documento.findUnique({ where: { id }, select: { ...DOC_SELECT, payload: true } })
  if (!r) return null
  let payload: unknown | null = null
  if (r.payload) {
    try {
      payload = JSON.parse(r.payload)
    } catch {
      payload = null
    }
  }
  return { ...toRow(r), payload }
}
