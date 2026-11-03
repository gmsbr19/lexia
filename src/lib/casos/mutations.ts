// Casos — write layer. SERVER ONLY. Covers the caso's identity (título, cliente,
// contrato, tipo, área, status, responsável), the board label (nome curto, cor,
// prazo, descrição — o caso é o "projeto" do quadro de Tarefas) + create / bulk /
// soft-delete. The rateio entre sócios has its own mutation (finance
// setCasoResponsaveis). Dados de processo (nº/tribunal/vara/…) NÃO moram mais
// aqui — ver lib/casos/legado.ts.
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { isValidISO } from "@/lib/datas/util"
import { casoStatusCanonico } from "./status"

type Db = Prisma.TransactionClient

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
  contratoId?: number | null
  // etiqueta no quadro de Tarefas
  nomeCurto?: string | null // ≤24
  cor?: string | null // hex
  prazo?: string | null // "YYYY-MM-DD"
  descricao?: string | null
}

const HEX = /^#[0-9A-Fa-f]{6}$/

/** "YYYY-MM-DD" → meio-dia UTC (date-only, igual às datas de Tarefas). */
function optPrazo(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v !== "string" || !isValidISO(v)) throw new UserError("Prazo inválido")
  const [y, m, d] = v.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

function applyCasoFields(data: Prisma.CasoUncheckedUpdateInput, patch: CasoPatch): void {
  if (patch.titulo !== undefined) data.titulo = reqStr(patch.titulo, "título")
  if (patch.tipo !== undefined) data.tipo = patch.tipo === "litigio" ? "litigio" : "consultivo"
  if (patch.area !== undefined) data.area = optStr(patch.area)
  if (patch.status !== undefined) data.status = casoStatusCanonico(patch.status)
  if (patch.responsavel !== undefined) data.responsavel = optStr(patch.responsavel)
  if (patch.responsavelUserId !== undefined) data.responsavelUserId = optInt(patch.responsavelUserId, "responsável")
  if (patch.clientePrincipalId !== undefined) data.clientePrincipalId = optInt(patch.clientePrincipalId, "cliente")
  if (patch.contratoId !== undefined) data.contratoId = optInt(patch.contratoId, "contrato")
  if (patch.nomeCurto !== undefined) data.nomeCurto = optStr(patch.nomeCurto)?.slice(0, 24) ?? null
  if (patch.cor !== undefined) {
    const c = optStr(patch.cor)
    if (c != null && !HEX.test(c)) throw new UserError("Cor inválida")
    data.cor = c
  }
  if (patch.prazo !== undefined) data.prazo = optPrazo(patch.prazo)
  if (patch.descricao !== undefined) data.descricao = optStr(patch.descricao)?.slice(0, 4000) ?? null
}

/**
 * Quem cria um caso sem escolher responsável e não vê todos os casos (advogado)
 * vira o responsável — senão perderia o acesso ao caso que acabou de criar.
 */
export function comResponsavelPadrao<T extends { responsavelUserId?: number | null }>(
  input: T,
  quem: { userId: number | null; veTudo: boolean },
): T {
  if (input.responsavelUserId != null || quem.veTudo || quem.userId == null) return input
  return { ...input, responsavelUserId: quem.userId }
}

/**
 * Coerência caso ↔ contrato: um contrato reúne casos de UM cliente (mesma regra
 * de assertCasosDoCliente no Financeiro). Valida o par EFETIVO depois do patch —
 * trocar o cliente de um caso que está no contrato de outro cliente exige soltar
 * (ou trocar) o contrato na mesma edição.
 */
async function assertContratoDoCliente(clienteId: number | null, contratoId: number | null, db: Db = prisma): Promise<void> {
  if (contratoId == null) return
  const contrato = await db.contrato.findFirst({
    where: { id: contratoId, excluidoEm: null },
    select: { titulo: true, clienteId: true },
  })
  if (!contrato) throw new UserError("Contrato não encontrado")
  if (clienteId != null && contrato.clienteId != null && contrato.clienteId !== clienteId) {
    throw new UserError(
      `O contrato${contrato.titulo ? ` "${contrato.titulo}"` : ""} é de outro cliente — escolha um contrato deste cliente ou deixe sem contrato`,
    )
  }
}

export async function updateCaso(id: number, patch: CasoPatch) {
  const existing = await prisma.caso.findFirst({
    where: { id, excluidoEm: null },
    select: { id: true, clientePrincipalId: true, contratoId: true },
  })
  if (!existing) throw new UserError("Caso não encontrado")
  const data: Prisma.CasoUncheckedUpdateInput = {}
  applyCasoFields(data, patch)
  if (patch.clientePrincipalId !== undefined || patch.contratoId !== undefined) {
    const clienteId = patch.clientePrincipalId !== undefined ? (patch.clientePrincipalId ?? null) : existing.clientePrincipalId
    const contratoId = patch.contratoId !== undefined ? (patch.contratoId ?? null) : existing.contratoId
    await assertContratoDoCliente(clienteId, contratoId)
  }
  return prisma.caso.update({ where: { id }, data })
}

export interface CasoCreate extends CasoPatch {
  titulo: string
  modeloOrigemId?: number | null // caso montado a partir de um modelo de tarefas
}

/** Create a caso inside a transaction (app-created → synthetic astreaId so re-imports don't clobber). */
export async function criarCasoTx(db: Db, input: CasoCreate) {
  const data: Prisma.CasoUncheckedCreateInput = {
    astreaId: `app-caso-${randomUUID()}`,
    titulo: reqStr(input.titulo, "título"),
    tipo: input.tipo === "litigio" ? "litigio" : "consultivo",
    status: casoStatusCanonico(input.status),
    dataCriacao: new Date(),
    modeloOrigemId: optInt(input.modeloOrigemId ?? null, "modelo"),
  }
  applyCasoFields(data as Prisma.CasoUncheckedUpdateInput, { ...input, titulo: undefined, tipo: undefined, status: undefined })
  await assertContratoDoCliente(input.clientePrincipalId ?? null, input.contratoId ?? null, db)
  return db.caso.create({ data })
}

/** Create a caso from scratch. */
export async function createCaso(input: CasoCreate) {
  return prisma.$transaction((tx) => criarCasoTx(tx, input))
}

export interface CasosLote {
  ids: number[]
  tipo?: string
  area?: string | null
  status?: string
  responsavelUserId?: number | null
}

/**
 * Edição em lote (lista de casos): tipo/área/status/responsável. Sem exclusão.
 * `scope` (scopeCasoWhere do usuário) garante que um advogado só altere os
 * casos que enxerga — ids fora do escopo são ignorados.
 */
export async function bulkUpdateCasos(input: CasosLote, scope: Prisma.CasoWhereInput = {}) {
  const ids = (input.ids ?? []).filter((n) => Number.isInteger(n) && n > 0)
  if (!ids.length) throw new UserError("Selecione ao menos um caso")
  const data: Prisma.CasoUncheckedUpdateManyInput = {}
  if (input.tipo !== undefined) data.tipo = input.tipo === "litigio" ? "litigio" : "consultivo"
  if (input.area !== undefined) data.area = optStr(input.area)
  if (input.status !== undefined) data.status = casoStatusCanonico(input.status)
  if (input.responsavelUserId !== undefined) data.responsavelUserId = optInt(input.responsavelUserId, "responsável")
  if (Object.keys(data).length === 0) throw new UserError("Nenhuma alteração informada")
  const r = await prisma.caso.updateMany({ where: { AND: [{ id: { in: ids }, excluidoEm: null }, scope] }, data })
  return { atualizados: r.count }
}

/**
 * Soft-delete: legal data is never physically removed. CASCADES to the caso's
 * processos and their pending children (prazos/andamentos/publicações/anotações)
 * and cancels its agenda events — so nothing it owned keeps surfacing (e.g. a prazo
 * on the Início) or 404s afterwards. Financial rows (honorários/lançamentos) are
 * kept for accounting. Its tasks stay and read as "Sem caso" on the board (every
 * task read filters caso.excluidoEm). Runs inside the caller's transaction.
 */
export async function excluirCasoTx(db: Db, id: number, now: Date) {
  const existing = await db.caso.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Caso não encontrado")
  const procs = await db.processo.findMany({ where: { casoId: id, excluidoEm: null }, select: { id: true, numeroCnj: true } })
  const procIds = procs.map((p) => p.id)
  await db.prazo.updateMany({ where: { processoId: { in: procIds }, excluidoEm: null }, data: { excluidoEm: now } })
  await db.andamento.updateMany({ where: { processoId: { in: procIds }, excluidoEm: null }, data: { excluidoEm: now } })
  await db.publicacao.updateMany({ where: { processoId: { in: procIds }, excluidoEm: null }, data: { excluidoEm: now } })
  await db.anotacao.updateMany({ where: { OR: [{ casoId: id }, { processoId: { in: procIds } }], excluidoEm: null }, data: { excluidoEm: now } })
  // drop the structured fee-lançamento link (re-surfaces them as "sem processo")
  await db.lancamento.updateMany({ where: { processoId: { in: procIds } }, data: { processoId: null } })
  // tombstone each processo's CNJ (frees the global @unique index) + soft-delete
  for (const p of procs) {
    await db.processo.update({
      where: { id: p.id },
      data: { excluidoEm: now, numeroCnj: p.numeroCnj ? `${p.numeroCnj}#del-${p.id}` : null },
    })
  }
  await db.evento.updateMany({ where: { status: { not: "cancelado" }, OR: [{ casoId: id }, { processoId: { in: procIds } }] }, data: { status: "cancelado" } })
  await db.caso.update({ where: { id }, data: { excluidoEm: now } })
  return { id }
}

export async function deleteCaso(id: number) {
  return prisma.$transaction((tx) => excluirCasoTx(tx, id, new Date()), { timeout: 20_000, maxWait: 10_000 })
}
