// DocumentoTemplate — read + write layer. SERVER ONLY. The DB-backed replacement
// for the hardcoded registry: a template carries a LexDoc `conteudo`, its
// declared `placeholders`, an optional letterhead, and (for the contrato) a
// `tipoEstruturado` marker that keeps its typed/finance path alive.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import type { PlaceholderDecl } from "@/lib/documents/model/placeholders"
import type { TemplateDetail, TemplateRow } from "./types"

const TEMPLATE_SELECT = {
  id: true,
  chave: true,
  nome: true,
  categoria: true,
  descricao: true,
  tipoEstruturado: true,
  timbradoId: true,
  icone: true,
  destaque: true,
  ativo: true,
  usoCount: true,
  ordem: true,
  placeholders: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentoTemplateSelect

type Rec = Prisma.DocumentoTemplateGetPayload<{ select: typeof TEMPLATE_SELECT }>

// ── helpers ──────────────────────────────────────────────────────────────────

function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}
function optId(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}
function parsePlaceholders(s: string | null): PlaceholderDecl[] {
  if (!s) return []
  try {
    const a = JSON.parse(s)
    return Array.isArray(a) ? (a as PlaceholderDecl[]) : []
  } catch {
    return []
  }
}
function serializeConteudo(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = JSON.stringify(v)
  if (s.length > 2_000_000) throw new UserError("Template grande demais para salvar")
  return s
}

function toRow(r: Rec): TemplateRow {
  return {
    id: r.id,
    chave: r.chave,
    nome: r.nome,
    categoria: r.categoria,
    descricao: r.descricao,
    tipoEstruturado: r.tipoEstruturado,
    timbradoId: r.timbradoId,
    icone: r.icone,
    destaque: r.destaque,
    ativo: r.ativo,
    usoCount: r.usoCount,
    ordem: r.ordem,
    placeholderCount: parsePlaceholders(r.placeholders).length,
    criadoEm: r.createdAt.toISOString(),
    atualizadoEm: r.updatedAt.toISOString(),
  }
}

// ── reads ────────────────────────────────────────────────────────────────────

export async function getTemplates(opts: { incluirInativos?: boolean } = {}): Promise<TemplateRow[]> {
  const where: Prisma.DocumentoTemplateWhereInput = { excluidoEm: null }
  if (!opts.incluirInativos) where.ativo = true
  const rows = await prisma.documentoTemplate.findMany({
    where,
    select: TEMPLATE_SELECT,
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  })
  return rows.map(toRow)
}

export async function getTemplate(id: number): Promise<TemplateDetail | null> {
  const r = await prisma.documentoTemplate.findFirst({
    where: { id, excluidoEm: null },
    select: { ...TEMPLATE_SELECT, conteudo: true },
  })
  if (!r) return null
  let conteudo: unknown | null = null
  if (r.conteudo) {
    try {
      conteudo = JSON.parse(r.conteudo)
    } catch {
      conteudo = null
    }
  }
  return { ...toRow(r), conteudo, placeholders: parsePlaceholders(r.placeholders) }
}

// ── writes ───────────────────────────────────────────────────────────────────

// Loose write-side shape — matches the zod-inferred payload (dataType is a free
// string at the boundary; it's only serialized to JSON here). The strict
// PlaceholderDecl union is the READ-side type (see TemplateDetail).
export interface PlaceholderInput {
  name: string
  dataType?: string
  label?: string
  defaultValue?: string
}

export interface TemplateInput {
  nome: string
  categoria?: string
  descricao?: string | null
  conteudo?: unknown
  placeholders?: PlaceholderInput[]
  tipoEstruturado?: string | null
  timbradoId?: number | null
  icone?: string | null
  destaque?: boolean
  ativo?: boolean
}

export async function createTemplate(input: TemplateInput, criadoPor?: string | null) {
  return prisma.documentoTemplate.create({
    data: {
      nome: reqStr(input.nome, "nome"),
      categoria: input.categoria?.trim() || "Outro",
      descricao: input.descricao?.trim() || null,
      conteudo: serializeConteudo(input.conteudo),
      placeholders: JSON.stringify(input.placeholders ?? []),
      tipoEstruturado: input.tipoEstruturado?.trim() || null,
      timbradoId: optId(input.timbradoId),
      icone: input.icone?.trim() || null,
      destaque: !!input.destaque,
      ativo: input.ativo ?? true,
      criadoPor: typeof criadoPor === "string" ? criadoPor : null,
    },
    select: { id: true },
  })
}

export type TemplatePatch = Partial<TemplateInput>

export async function updateTemplate(id: number, patch: TemplatePatch) {
  const data: Prisma.DocumentoTemplateUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.categoria !== undefined) data.categoria = patch.categoria?.trim() || "Outro"
  if (patch.descricao !== undefined) data.descricao = patch.descricao?.trim() || null
  if (patch.conteudo !== undefined) data.conteudo = serializeConteudo(patch.conteudo)
  if (patch.placeholders !== undefined) data.placeholders = JSON.stringify(patch.placeholders ?? [])
  if (patch.tipoEstruturado !== undefined) data.tipoEstruturado = patch.tipoEstruturado?.trim() || null
  if (patch.timbradoId !== undefined) data.timbradoId = optId(patch.timbradoId)
  if (patch.icone !== undefined) data.icone = patch.icone?.trim() || null
  if (patch.destaque !== undefined) data.destaque = !!patch.destaque
  if (patch.ativo !== undefined) data.ativo = !!patch.ativo
  return prisma.documentoTemplate.update({ where: { id }, data, select: { id: true } })
}

/** Soft-delete a template (hidden from lists; forked documents keep their FK). */
export async function deleteTemplate(id: number) {
  const t = await prisma.documentoTemplate.findUnique({ where: { id }, select: { id: true } })
  if (!t) throw new UserError("Template não encontrado")
  await prisma.documentoTemplate.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}
