// Documentos — write layer. SERVER ONLY.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { DOCUMENTO_STATUS, type DocumentoStatus } from "./types"

function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}
function optId(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}
function validStatus(v: unknown): DocumentoStatus {
  return (typeof v === "string" && (DOCUMENTO_STATUS as readonly string[]).includes(v)
    ? v
    : "rascunho") as DocumentoStatus
}
function serializeJson(v: unknown, max: number, what: string): string | null {
  if (v === null || v === undefined) return null
  const s = JSON.stringify(v)
  if (s.length > max) throw new UserError(`${what} grande demais para salvar`)
  return s
}
const serializePayload = (v: unknown) => serializeJson(v, 200_000, "Documento")
const serializeConteudo = (v: unknown) => serializeJson(v, 2_000_000, "Documento") // rich-text + inline images

export interface DocumentoCreate {
  nome: string
  template: string
  formato?: string | null // 'docx' | 'pdf'
  status?: string
  payload?: unknown
  conteudo?: unknown // LexDoc JSON
  valores?: Record<string, string> | null
  templateId?: number | null
  timbradoId?: number | null
  clienteId?: number | null
  casoId?: number | null
  criadoPor?: string | null
}

export async function createDocumento(input: DocumentoCreate) {
  return prisma.documento.create({
    data: {
      nome: reqStr(input.nome, "nome"),
      template: reqStr(input.template, "modelo"),
      formato: input.formato === "docx" || input.formato === "pdf" ? input.formato : null,
      status: validStatus(input.status),
      payload: serializePayload(input.payload),
      conteudo: serializeConteudo(input.conteudo),
      valores: serializePayload(input.valores),
      templateId: optId(input.templateId),
      timbradoId: optId(input.timbradoId),
      clienteId: optId(input.clienteId),
      casoId: optId(input.casoId),
      criadoPor: typeof input.criadoPor === "string" ? input.criadoPor : null,
    },
  })
}

export interface DocumentoPatch {
  nome?: string
  formato?: string | null
  status?: string
  payload?: unknown
  conteudo?: unknown
  valores?: Record<string, string> | null
  templateId?: number | null
  timbradoId?: number | null
  clienteId?: number | null
  casoId?: number | null
}

export async function updateDocumento(id: number, patch: DocumentoPatch) {
  const data: Prisma.DocumentoUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.formato !== undefined)
    data.formato = patch.formato === "docx" || patch.formato === "pdf" ? patch.formato : null
  if (patch.status !== undefined) data.status = validStatus(patch.status)
  if (patch.payload !== undefined) data.payload = serializePayload(patch.payload)
  if (patch.conteudo !== undefined) data.conteudo = serializeConteudo(patch.conteudo)
  if (patch.valores !== undefined) data.valores = serializePayload(patch.valores)
  if (patch.templateId !== undefined) data.templateId = optId(patch.templateId)
  if (patch.timbradoId !== undefined) data.timbradoId = optId(patch.timbradoId)
  if (patch.clienteId !== undefined) data.clienteId = optId(patch.clienteId)
  if (patch.casoId !== undefined) data.casoId = optId(patch.casoId)
  return prisma.documento.update({ where: { id }, data })
}

export async function deleteDocumento(id: number) {
  await prisma.documento.delete({ where: { id } })
  return { id }
}

export interface DeTemplateInput {
  nome?: string
  clienteId?: number | null
  casoId?: number | null
}

/**
 * Create a new Documento from a DocumentoTemplate: forks the template's LexDoc
 * `conteudo` (+ letterhead) into a fresh draft and bumps the template's usage.
 * The forked `conteudo` carries the model's text AND its placeholder (campo)
 * nodes, so the new draft opens in the WYSIWYG editor preserving both.
 */
export async function criarDocumentoDeTemplate(templateId: number, input: DeTemplateInput, criadoPor?: string | null) {
  const tpl = await prisma.documentoTemplate.findFirst({
    where: { id: templateId, excluidoEm: null },
    select: { id: true, chave: true, nome: true, conteudo: true, timbradoId: true },
  })
  if (!tpl) throw new UserError("Template não encontrado")

  const doc = await prisma.documento.create({
    data: {
      nome: input.nome?.trim() || tpl.nome,
      template: tpl.chave || "livre",
      templateId: tpl.id,
      timbradoId: tpl.timbradoId,
      conteudo: tpl.conteudo, // already a JSON string — fork it verbatim
      status: "rascunho",
      clienteId: optId(input.clienteId),
      casoId: optId(input.casoId),
      criadoPor: typeof criadoPor === "string" ? criadoPor : null,
    },
    select: { id: true },
  })
  // Best-effort usage bump (never blocks the create).
  await prisma.documentoTemplate.update({ where: { id: tpl.id }, data: { usoCount: { increment: 1 } } }).catch(() => {})

  return { id: doc.id }
}
