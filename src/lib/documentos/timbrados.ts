// Timbrado (papel timbrado / letterhead) — read + write layer. SERVER ONLY.
// The image rides as a data URL in `imagem`; the list query deliberately omits
// it (heavy base64) and only the detail query returns it.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import type { TimbradoDetail, TimbradoRow } from "./types"

const MAX_IMG = 10_000_000 // ~10 MB of base64 — generous for a letterhead PNG/JPG

const ROW_SELECT = {
  id: true,
  nome: true,
  mimeType: true,
  margemTop: true,
  margemRight: true,
  margemBottom: true,
  margemLeft: true,
  padrao: true,
  createdAt: true,
} satisfies Prisma.TimbradoSelect

type Rec = Prisma.TimbradoGetPayload<{ select: typeof ROW_SELECT }>

function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}

function toRow(r: Rec): TimbradoRow {
  return {
    id: r.id,
    nome: r.nome,
    mimeType: r.mimeType,
    margemTop: r.margemTop,
    margemRight: r.margemRight,
    margemBottom: r.margemBottom,
    margemLeft: r.margemLeft,
    padrao: r.padrao,
    criadoEm: r.createdAt.toISOString(),
  }
}

// ── reads ────────────────────────────────────────────────────────────────────

export async function getTimbrados(): Promise<TimbradoRow[]> {
  const rows = await prisma.timbrado.findMany({
    where: { excluidoEm: null },
    select: ROW_SELECT,
    orderBy: [{ padrao: "desc" }, { nome: "asc" }],
  })
  return rows.map(toRow)
}

/** List WITH the data-URL image (for the manager's thumbnails). The office has a
 *  handful of letterheads, so shipping the images here is fine; the plain
 *  `getTimbrados` stays lean for the editor's picker. */
export async function getTimbradosComImagem(): Promise<TimbradoDetail[]> {
  const rows = await prisma.timbrado.findMany({
    where: { excluidoEm: null },
    select: { ...ROW_SELECT, imagem: true },
    orderBy: [{ padrao: "desc" }, { nome: "asc" }],
  })
  return rows.map((r) => ({ ...toRow(r), imagem: r.imagem }))
}

export async function getTimbrado(id: number): Promise<TimbradoDetail | null> {
  const r = await prisma.timbrado.findFirst({ where: { id, excluidoEm: null }, select: { ...ROW_SELECT, imagem: true } })
  if (!r) return null
  return { ...toRow(r), imagem: r.imagem }
}

// ── writes ───────────────────────────────────────────────────────────────────

export interface TimbradoInput {
  nome: string
  imagem: string // data URL
  mimeType?: string | null
  margemTop?: number
  margemRight?: number
  margemBottom?: number
  margemLeft?: number
  padrao?: boolean
}

function clampMargin(v: number | undefined, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback
  return Math.max(0, Math.min(120, Math.round(v)))
}

export async function createTimbrado(input: TimbradoInput, criadoPor?: string | null) {
  const imagem = reqStr(input.imagem, "imagem")
  if (imagem.length > MAX_IMG) throw new UserError("Imagem do timbrado grande demais (máx. ~7 MB)")
  const data = {
    nome: reqStr(input.nome, "nome"),
    imagem,
    mimeType: input.mimeType?.trim() || null,
    margemTop: clampMargin(input.margemTop, 30),
    margemRight: clampMargin(input.margemRight, 25),
    margemBottom: clampMargin(input.margemBottom, 30),
    margemLeft: clampMargin(input.margemLeft, 25),
    padrao: !!input.padrao,
    criadoPor: typeof criadoPor === "string" ? criadoPor : null,
  }
  // Only one default at a time: demote the others in the same transaction.
  if (data.padrao) {
    const [, created] = await prisma.$transaction([
      prisma.timbrado.updateMany({ where: { padrao: true }, data: { padrao: false } }),
      prisma.timbrado.create({ data, select: { id: true } }),
    ])
    return created
  }
  return prisma.timbrado.create({ data, select: { id: true } })
}

export type TimbradoPatch = Partial<TimbradoInput>

export async function updateTimbrado(id: number, patch: TimbradoPatch) {
  const data: Prisma.TimbradoUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.imagem !== undefined) {
    const imagem = reqStr(patch.imagem, "imagem")
    if (imagem.length > MAX_IMG) throw new UserError("Imagem do timbrado grande demais (máx. ~7 MB)")
    data.imagem = imagem
  }
  if (patch.mimeType !== undefined) data.mimeType = patch.mimeType?.trim() || null
  if (patch.margemTop !== undefined) data.margemTop = clampMargin(patch.margemTop, 30)
  if (patch.margemRight !== undefined) data.margemRight = clampMargin(patch.margemRight, 25)
  if (patch.margemBottom !== undefined) data.margemBottom = clampMargin(patch.margemBottom, 30)
  if (patch.margemLeft !== undefined) data.margemLeft = clampMargin(patch.margemLeft, 25)

  if (patch.padrao === true) {
    const [, updated] = await prisma.$transaction([
      prisma.timbrado.updateMany({ where: { padrao: true, id: { not: id } }, data: { padrao: false } }),
      prisma.timbrado.update({ where: { id }, data: { ...data, padrao: true }, select: { id: true } }),
    ])
    return updated
  }
  if (patch.padrao === false) data.padrao = false
  return prisma.timbrado.update({ where: { id }, data, select: { id: true } })
}

export async function deleteTimbrado(id: number) {
  await prisma.timbrado.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}
