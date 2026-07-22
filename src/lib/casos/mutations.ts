// Casos — write layer (dados do processo). SERVER ONLY. The rateio entre
// sócios has its own mutation (finance setCasoResponsaveis); this module covers
// the editable processo/identity fields of the caso modal + create/soft-delete
// for the Processos module.
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"

function toDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === "") return null
  if (input instanceof Date) return input
  if (typeof input !== "string") return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}
function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}
function optStr(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t : null
}
function optInt(v: unknown, name: string): number | null {
  if (v === null || v === undefined) return null
  if (typeof v !== "number" || !Number.isInteger(v)) throw new UserError(`${name} inválido`)
  return v
}

export interface CasoPatch {
  titulo?: string
  tipo?: string // 'consultivo' | 'litigio'
  area?: string | null
  status?: string | null
  responsavel?: string | null
  responsavelUserId?: number | null
  clientePrincipalId?: number | null
  numeroProcesso?: string | null
  tribunal?: string | null
  vara?: string | null
  instancia?: string | null
  tipoAcao?: string | null
  valorCausaCents?: number | null
  dataDistribuicao?: string | null
  ultimaMovimentacao?: string | null
}

function applyCasoFields(data: Prisma.CasoUncheckedUpdateInput, patch: CasoPatch): void {
  if (patch.titulo !== undefined) data.titulo = reqStr(patch.titulo, "título")
  if (patch.tipo !== undefined) data.tipo = patch.tipo === "litigio" ? "litigio" : "consultivo"
  if (patch.area !== undefined) data.area = optStr(patch.area)
  if (patch.status !== undefined) data.status = optStr(patch.status)
  if (patch.responsavel !== undefined) data.responsavel = optStr(patch.responsavel)
  if (patch.responsavelUserId !== undefined) data.responsavelUserId = optInt(patch.responsavelUserId, "responsável")
  if (patch.clientePrincipalId !== undefined) data.clientePrincipalId = optInt(patch.clientePrincipalId, "cliente")
  if (patch.numeroProcesso !== undefined) data.numeroProcesso = optStr(patch.numeroProcesso)
  if (patch.tribunal !== undefined) data.tribunal = optStr(patch.tribunal)
  if (patch.vara !== undefined) data.vara = optStr(patch.vara)
  if (patch.instancia !== undefined) data.instancia = optStr(patch.instancia)
  if (patch.tipoAcao !== undefined) data.tipoAcao = optStr(patch.tipoAcao)
  if (patch.valorCausaCents !== undefined) data.valorCausaCents = optInt(patch.valorCausaCents, "valor da causa")
  if (patch.dataDistribuicao !== undefined) data.dataDistribuicao = toDate(patch.dataDistribuicao)
  if (patch.ultimaMovimentacao !== undefined) data.ultimaMovimentacao = toDate(patch.ultimaMovimentacao)
}

export async function updateCaso(id: number, patch: CasoPatch) {
  const existing = await prisma.caso.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Caso não encontrado")
  const data: Prisma.CasoUncheckedUpdateInput = {}
  applyCasoFields(data, patch)
  return prisma.caso.update({ where: { id }, data })
}

export interface CasoCreate extends CasoPatch {
  titulo: string
}

/** Create a caso from scratch (app-created → synthetic astreaId so re-imports don't clobber). */
export async function createCaso(input: CasoCreate) {
  const data: Prisma.CasoUncheckedCreateInput = {
    astreaId: `app-caso-${randomUUID()}`,
    titulo: reqStr(input.titulo, "título"),
    tipo: input.tipo === "litigio" ? "litigio" : "consultivo",
    dataCriacao: new Date(),
  }
  applyCasoFields(data as Prisma.CasoUncheckedUpdateInput, { ...input, titulo: undefined, tipo: undefined })
  return prisma.caso.create({ data })
}

/**
 * Soft-delete: legal data is never physically removed. CASCADES to the caso's
 * processos and their pending children (prazos/andamentos/publicações/anotações)
 * and cancels its agenda events — so nothing it owned keeps surfacing (e.g. a prazo
 * on the Início) or 404s afterwards. Financial rows (honorários/lançamentos) are
 * kept for accounting. One transaction so a partial delete can't leak orphans.
 */
export async function deleteCaso(id: number) {
  const existing = await prisma.caso.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Caso não encontrado")
  const now = new Date()
  const procs = await prisma.processo.findMany({ where: { casoId: id, excluidoEm: null }, select: { id: true, numeroCnj: true } })
  const procIds = procs.map((p) => p.id)
  await prisma.$transaction([
    prisma.prazo.updateMany({ where: { processoId: { in: procIds }, excluidoEm: null }, data: { excluidoEm: now } }),
    prisma.andamento.updateMany({ where: { processoId: { in: procIds }, excluidoEm: null }, data: { excluidoEm: now } }),
    prisma.publicacao.updateMany({ where: { processoId: { in: procIds }, excluidoEm: null }, data: { excluidoEm: now } }),
    prisma.anotacao.updateMany({ where: { OR: [{ casoId: id }, { processoId: { in: procIds } }], excluidoEm: null }, data: { excluidoEm: now } }),
    // drop the structured fee-lançamento link (re-surfaces them as "sem processo")
    prisma.lancamento.updateMany({ where: { processoId: { in: procIds } }, data: { processoId: null } }),
    // tombstone each processo's CNJ (frees the global @unique index) + soft-delete
    ...procs.map((p) =>
      prisma.processo.update({
        where: { id: p.id },
        data: { excluidoEm: now, numeroCnj: p.numeroCnj ? `${p.numeroCnj}#del-${p.id}` : null },
      }),
    ),
    prisma.evento.updateMany({ where: { status: { not: "cancelado" }, OR: [{ casoId: id }, { processoId: { in: procIds } }] }, data: { status: "cancelado" } }),
    prisma.caso.update({ where: { id }, data: { excluidoEm: now } }),
  ])
  return { id }
}
