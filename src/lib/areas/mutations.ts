// Áreas do Direito — write layer. SERVER ONLY.
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { normalizar } from "@/lib/text"
import { optStr, reqStr } from "@/lib/tarefas/_input"

/** Converte um nome em slug estável (letras/dígitos, underscores). */
function toSlug(nome: string): string {
  return normalizar(nome)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "area"
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base
  let i = 2
  for (;;) {
    const existing = await prisma.areaDireito.findFirst({
      where: { chave: slug, ...(excludeId != null ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
    if (!existing) return slug
    slug = `${base}_${i++}`
  }
}

export interface AreaCreate {
  nome: string
  chave?: string | null
  cor?: string | null
  icone?: string | null
  ordem?: number
  ativo?: boolean
}

export async function createArea(input: AreaCreate) {
  const nome = reqStr(input.nome, "nome")
  const rawSlug = input.chave
    ? normalizar(input.chave).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50)
    : toSlug(nome)
  const chave = await uniqueSlug(rawSlug || toSlug(nome))
  return prisma.areaDireito.create({
    data: {
      nome,
      chave,
      cor: optStr(input.cor),
      icone: optStr(input.icone),
      ordem: typeof input.ordem === "number" && Number.isFinite(input.ordem) ? Math.round(input.ordem) : 0,
      ativo: input.ativo !== false,
    },
  })
}

export interface AreaPatch {
  nome?: string
  cor?: string | null
  icone?: string | null
  ordem?: number
  ativo?: boolean
}

export async function updateArea(id: number, patch: AreaPatch) {
  const existing = await prisma.areaDireito.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Área não encontrada")
  return prisma.areaDireito.update({
    where: { id },
    data: {
      ...(patch.nome !== undefined ? { nome: reqStr(patch.nome, "nome") } : {}),
      ...(patch.cor !== undefined ? { cor: optStr(patch.cor) } : {}),
      ...(patch.icone !== undefined ? { icone: optStr(patch.icone) } : {}),
      ...(patch.ordem !== undefined && Number.isFinite(patch.ordem) ? { ordem: Math.round(patch.ordem) } : {}),
      ...(patch.ativo !== undefined ? { ativo: !!patch.ativo } : {}),
    },
  })
}

export async function deleteArea(id: number) {
  const existing = await prisma.areaDireito.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Área não encontrada")
  await prisma.areaDireito.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}
