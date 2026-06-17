// Finance write layer — all mutations in one server-only module, mirroring the
// query layer. Conventions kept consistent with the Astrea import:
//   • money is integer centavos; saídas are stored NEGATIVE (signed by `tipo`).
//   • app-created rows carry a synthetic unique `astreaId` ("app-*"),
//     `origem: 'manual'` and `geradoPorApp: true`, so the importer (which only
//     upserts by real Astrea `astreaId`) never clobbers operator data.
//   • internal transfers materialize as two paired Lancamento rows flagged
//     `isAnomalia: true` (out of revenue/DRE) + `subTipo: 'transferencia'` (so the
//     per-account balance query re-includes them).
// SERVER ONLY (imports prisma).
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { getAcertoSocios } from "./queries"
import type { ContaKind } from "./types"

// ── input helpers ────────────────────────────────────────────────────────────
function toDate(input: string | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null
  if (input instanceof Date) return input
  // date-only "YYYY-MM-DD" → local midday (avoids UTC off-by-one at day edges)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}
function reqInt(v: unknown, name: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) throw new UserError(`${name} inválido`)
  return v
}
function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}

// ── Honorário ────────────────────────────────────────────────────────────────
export interface HonorarioPatch {
  descricao?: string
  valorCents?: number
  dataVencimento?: string | null
  tipo?: string | null
  clienteId?: number | null
  casoId?: number | null
  contaId?: number | null
}

export async function updateHonorario(id: number, patch: HonorarioPatch) {
  const data: Prisma.HonorarioUncheckedUpdateInput = {}
  if (patch.descricao !== undefined) data.descricao = reqStr(patch.descricao, "descrição")
  if (patch.valorCents !== undefined) data.valorCents = reqInt(patch.valorCents, "valorCents")
  if (patch.dataVencimento !== undefined) data.dataVencimento = toDate(patch.dataVencimento)
  if (patch.tipo !== undefined) data.tipo = patch.tipo
  if (patch.clienteId !== undefined) data.clienteId = patch.clienteId
  if (patch.casoId !== undefined) data.casoId = patch.casoId
  if (patch.contaId !== undefined) data.contaId = patch.contaId
  return prisma.honorario.update({ where: { id }, data })
}

/**
 * Mark a honorário as paid (status 'recebido') into a given account, on a given
 * date — and settle the cash ledger so the financeiro KPIs/Receita reflect it.
 * Reuses the linked Lancamento when present (no double-count); creates one only
 * when the honorário has no linked Entrada.
 */
export async function pagarHonorario(id: number, opts: { contaId: number; dataPagamento?: string | null }) {
  const contaId = reqInt(opts.contaId, "conta")
  const pago = toDate(opts.dataPagamento) ?? new Date()
  return prisma.$transaction(async (tx) => {
    const hon = await tx.honorario.findUnique({ where: { id } })
    if (!hon) throw new UserError("Honorário não encontrado")

    let lancamentoId = hon.lancamentoId
    if (lancamentoId) {
      await tx.lancamento.update({
        where: { id: lancamentoId },
        data: { status: "feito", dataPagamento: pago, contaId },
      })
    } else {
      const lanc = await tx.lancamento.create({
        data: {
          astreaId: `app-hon-${id}`,
          tipo: "entrada",
          status: "feito",
          subTipo: "honorario",
          descricao: hon.descricao,
          valorCents: hon.valorCents,
          valorOriginalCents: hon.valorCents,
          dataLancamento: pago,
          dataPagamento: pago,
          isAnomalia: false,
          geradoPorApp: true,
          origem: "manual",
          contaId,
          clienteId: hon.clienteId,
          casoId: hon.casoId,
        },
      })
      lancamentoId = lanc.id
    }
    return tx.honorario.update({
      where: { id },
      data: { status: "recebido", dataPagamento: pago, contaId, lancamentoId },
    })
  })
}

/** Revert a paid honorário back to 'lancado'. Deletes the app-settled ledger
 *  row; merely re-opens an Astrea-imported one (keeps the link). */
export async function desmarcarHonorario(id: number) {
  return prisma.$transaction(async (tx) => {
    const hon = await tx.honorario.findUnique({
      where: { id },
      include: { lancamento: true },
    })
    if (!hon) throw new UserError("Honorário não encontrado")
    if (hon.lancamento) {
      if (hon.lancamento.geradoPorApp) {
        await tx.honorario.update({ where: { id }, data: { lancamentoId: null } })
        await tx.lancamento.delete({ where: { id: hon.lancamento.id } })
      } else {
        await tx.lancamento.update({
          where: { id: hon.lancamento.id },
          data: { status: "aberto", dataPagamento: null },
        })
      }
    }
    return tx.honorario.update({
      where: { id },
      data: { status: "lancado", dataPagamento: null, contaId: null },
    })
  })
}

export interface HonorarioCreate {
  descricao: string
  valorCents: number
  dataVencimento?: string | null
  tipo?: string | null
  clienteId?: number | null
  casoId?: number | null
}

export async function createHonorario(input: HonorarioCreate) {
  return prisma.honorario.create({
    data: {
      astreaId: `app-hon-new-${randomUUID()}`,
      descricao: reqStr(input.descricao, "descrição"),
      valorCents: reqInt(input.valorCents, "valorCents"),
      valorLiquidoCents: input.valorCents,
      dataVencimento: toDate(input.dataVencimento),
      status: "lancado",
      tipo: input.tipo ?? "avista",
      clienteId: input.clienteId ?? null,
      casoId: input.casoId ?? null,
    },
  })
}

export async function deleteHonorario(id: number) {
  return prisma.honorario.delete({ where: { id } })
}

// ── Lançamentos (manual entradas / despesas) ─────────────────────────────────
export interface LancamentoCreate {
  tipo: "entrada" | "saida"
  valorCents: number // magnitude; signed by `tipo`
  descricao?: string | null
  status?: "feito" | "aberto"
  dataLancamento?: string | null
  dataVencimento?: string | null
  dataPagamento?: string | null
  contaId?: number | null
  categoriaId?: number | null
  centroCustoId?: number | null
  clienteId?: number | null
  casoId?: number | null
  campanhaId?: number | null // ad-spend attribution (Comercial module)
  pagoPara?: string | null
  subTipo?: string | null
  requestId?: string | null // client idempotency key — retried creates are no-ops
}

export async function createLancamento(input: LancamentoCreate) {
  if (input.tipo !== "entrada" && input.tipo !== "saida") throw new UserError("tipo inválido")
  const status = input.status ?? "feito"
  const mag = Math.abs(reqInt(input.valorCents, "valorCents"))
  const signed = input.tipo === "saida" ? -mag : mag
  const dataPagamento =
    input.dataPagamento !== undefined ? toDate(input.dataPagamento) : status === "feito" ? new Date() : null
  // requestId → deterministic astreaId: a retried create (double-click, apiSend
  // auto-retry) finds the row already there instead of inserting a duplicate.
  const astreaId = input.requestId ? `app-lanc-${input.requestId}` : `app-lanc-${randomUUID()}`
  if (input.requestId) {
    const existing = await prisma.lancamento.findUnique({ where: { astreaId } })
    if (existing) return existing
  }
  return prisma.lancamento.create({
    data: {
      astreaId,
      tipo: input.tipo,
      status,
      subTipo: input.subTipo ?? "avulsa",
      descricao: input.descricao ?? null,
      valorCents: signed,
      valorOriginalCents: signed,
      pagoPara: input.pagoPara ?? null,
      dataLancamento: toDate(input.dataLancamento) ?? new Date(),
      dataVencimento: toDate(input.dataVencimento),
      dataPagamento,
      isAnomalia: false,
      geradoPorApp: true,
      origem: "manual",
      contaId: input.contaId ?? null,
      categoriaId: input.categoriaId ?? null,
      centroCustoId: input.centroCustoId ?? null,
      clienteId: input.clienteId ?? null,
      casoId: input.casoId ?? null,
      campanhaId: input.campanhaId ?? null,
    },
  })
}

export interface LancamentoPatch {
  descricao?: string | null
  valorCents?: number // magnitude; re-signed by tipo
  status?: "feito" | "aberto"
  dataVencimento?: string | null
  dataPagamento?: string | null
  contaId?: number | null
  categoriaId?: number | null
  clienteId?: number | null
  casoId?: number | null
}

export async function updateLancamento(id: number, patch: LancamentoPatch) {
  const existing = await prisma.lancamento.findUnique({ where: { id }, select: { tipo: true } })
  if (!existing) throw new UserError("Lançamento não encontrado")
  const data: Prisma.LancamentoUncheckedUpdateInput = {}
  if (patch.descricao !== undefined) data.descricao = patch.descricao
  if (patch.valorCents !== undefined) {
    const mag = Math.abs(reqInt(patch.valorCents, "valorCents"))
    data.valorCents = existing.tipo === "saida" ? -mag : mag
  }
  if (patch.status !== undefined) data.status = patch.status
  if (patch.dataVencimento !== undefined) data.dataVencimento = toDate(patch.dataVencimento)
  if (patch.dataPagamento !== undefined) data.dataPagamento = toDate(patch.dataPagamento)
  if (patch.contaId !== undefined) data.contaId = patch.contaId
  if (patch.categoriaId !== undefined) data.categoriaId = patch.categoriaId
  if (patch.clienteId !== undefined) data.clienteId = patch.clienteId
  if (patch.casoId !== undefined) data.casoId = patch.casoId
  return prisma.lancamento.update({ where: { id }, data })
}

export async function deleteLancamento(id: number) {
  const row = await prisma.lancamento.findUnique({ where: { id }, select: { subTipo: true } })
  if (!row) throw new UserError("Lançamento não encontrado")
  if (row.subTipo === "transferencia") throw new UserError("Use a exclusão de transferência para esta linha")
  return prisma.lancamento.delete({ where: { id } })
}

// ── Ledger ops for the "Financeiro interativo" (baixa / lote / recorrência) ───
function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1 + n, d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

/** "Dar baixa" — mark a lançamento paid (status feito + dataPagamento). */
export async function pagarLancamento(id: number, dataPagamento?: string | null) {
  return prisma.lancamento.update({
    where: { id },
    data: { status: "feito", dataPagamento: toDate(dataPagamento) ?? new Date() },
  })
}

export async function reabrirLancamento(id: number) {
  return prisma.lancamento.update({ where: { id }, data: { status: "aberto", dataPagamento: null } })
}

export async function bulkLancamentos(ids: unknown, action: "pagar" | "reabrir" | "excluir") {
  const list = (Array.isArray(ids) ? ids : []).filter((x): x is number => Number.isInteger(x))
  if (!list.length) throw new UserError("Nenhum lançamento selecionado")
  if (action === "excluir") {
    const r = await prisma.lancamento.deleteMany({ where: { id: { in: list }, subTipo: { not: "transferencia" } } })
    return { count: r.count }
  }
  if (action === "pagar") {
    const r = await prisma.lancamento.updateMany({
      where: { id: { in: list }, status: "aberto" },
      data: { status: "feito", dataPagamento: new Date() },
    })
    return { count: r.count }
  }
  const r = await prisma.lancamento.updateMany({
    where: { id: { in: list }, status: "feito" },
    data: { status: "aberto", dataPagamento: null },
  })
  return { count: r.count }
}

export interface NovoLancamentoInput {
  dir: "in" | "out"
  desc: string
  valorCents: number // magnitude; total when modo === 'parcelado'
  venc: string // "YYYY-MM-DD" (first occurrence)
  cat?: string | null
  party?: string | null // cliente (in) / fornecedor (out)
  caso?: string | null
  contaId?: number | null // conta que recebeu (in) / pagou (out)
  pago?: boolean
  pagoData?: string | null
  modo?: "unica" | "mensal" | "parcelado"
  vezes?: number
  requestId?: string | null // client idempotency key — retried creates are no-ops
}

// Resolve the design's free-text refs onto real FKs (best-effort by name).
async function resolveRefs(dir: "in" | "out", cat?: string | null, party?: string | null, caso?: string | null) {
  const categoriaId = cat
    ? ((await prisma.categoria.findFirst({ where: { nome: cat }, select: { id: true } }))?.id ?? null)
    : null
  let clienteId: number | null = null
  let pagoPara: string | null = null
  const p = party?.trim() || null
  if (p) {
    if (dir === "in") {
      clienteId = (await prisma.cliente.findFirst({ where: { nome: p }, select: { id: true } }))?.id ?? null
      if (!clienteId) pagoPara = p
    } else {
      pagoPara = p
    }
  }
  let casoId: number | null = null
  if (dir === "in" && caso?.trim()) {
    casoId = (await prisma.caso.findFirst({ where: { titulo: caso.trim() }, select: { id: true } }))?.id ?? null
  }
  return { categoriaId, clienteId, pagoPara, casoId }
}

/** Create one or more lançamentos: única, recorrente mensal, ou parcelado. */
export async function criarLancamentos(input: NovoLancamentoInput) {
  if (input.dir !== "in" && input.dir !== "out") throw new UserError("tipo inválido")
  const desc = reqStr(input.desc, "descrição")
  if (!input.venc) throw new UserError("vencimento obrigatório")
  const totalMag = Math.abs(reqInt(input.valorCents, "valorCents"))
  if (totalMag <= 0) throw new UserError("Valor deve ser maior que zero")
  const tipo = input.dir === "in" ? "entrada" : "saida"
  const modo = input.modo ?? "unica"
  const vezes = modo === "unica" ? 1 : Math.max(2, Math.min(36, input.vezes ?? 6))
  const refs = await resolveRefs(input.dir, input.cat, input.party, input.caso)
  const eachMag = modo === "parcelado" ? Math.round(totalMag / vezes) : totalMag
  const sign = (n: number) => (tipo === "saida" ? -n : n)

  // requestId → deterministic astreaIds (suffixed per occurrence): a retried
  // create (double-click, apiSend auto-retry) returns the existing série.
  const baseId = input.requestId ? `app-lanc-${input.requestId}` : `app-lanc-${randomUUID()}`
  const rowAstreaId = (i: number) => (vezes === 1 ? baseId : `${baseId}-${i + 1}`)
  if (input.requestId) {
    const existing = await prisma.lancamento.findMany({
      where: { astreaId: { in: Array.from({ length: vezes }, (_, i) => rowAstreaId(i)) } },
      select: { id: true },
    })
    if (existing.length) return { count: existing.length, ids: existing.map((r) => r.id) }
  }

  return prisma.$transaction(async (tx) => {
    let parentId: number | null = null
    const ids: number[] = []
    for (let i = 0; i < vezes; i++) {
      const isUnica = modo === "unica"
      const pago = isUnica ? !!input.pago : false
      const data: Prisma.LancamentoUncheckedCreateInput = {
        astreaId: rowAstreaId(i),
        tipo,
        status: pago ? "feito" : "aberto",
        subTipo: input.dir === "in" ? "honorario" : "avulsa",
        descricao: modo === "parcelado" ? `${desc} · parcela ${i + 1}/${vezes}` : desc,
        valorCents: sign(eachMag),
        valorOriginalCents: sign(eachMag),
        dataLancamento: new Date(),
        dataVencimento: toDate(addMonthsISO(input.venc, i)),
        dataPagamento: pago ? (toDate(input.pagoData) ?? new Date()) : null,
        pagoPara: refs.pagoPara,
        isAnomalia: false,
        geradoPorApp: true,
        origem: "manual",
        recorrenteParentId: parentId,
        categoriaId: refs.categoriaId,
        clienteId: refs.clienteId,
        casoId: refs.casoId,
        contaId: input.contaId ?? null,
      }
      const lanc = await tx.lancamento.create({ data })
      if (i === 0 && modo !== "unica") parentId = lanc.id
      ids.push(lanc.id)
    }
    return { count: ids.length, ids }
  })
}

/** Edit a single lançamento from the modal's shape (resolves refs by name). */
export async function editarLancamento(id: number, input: NovoLancamentoInput) {
  if (input.dir !== "in" && input.dir !== "out") throw new UserError("tipo inválido")
  const desc = reqStr(input.desc, "descrição")
  const mag = Math.abs(reqInt(input.valorCents, "valorCents"))
  const tipo = input.dir === "in" ? "entrada" : "saida"
  const signed = tipo === "saida" ? -mag : mag
  const refs = await resolveRefs(input.dir, input.cat, input.party, input.caso)
  const pago = !!input.pago
  return prisma.lancamento.update({
    where: { id },
    data: {
      tipo,
      descricao: desc,
      valorCents: signed,
      valorOriginalCents: signed,
      dataVencimento: toDate(input.venc),
      status: pago ? "feito" : "aberto",
      dataPagamento: pago ? (toDate(input.pagoData) ?? new Date()) : null,
      pagoPara: refs.pagoPara,
      categoriaId: refs.categoriaId,
      clienteId: refs.clienteId,
      casoId: refs.casoId,
      contaId: input.contaId ?? null,
    },
  })
}

// ── Contas ───────────────────────────────────────────────────────────────────
export interface ContaCreate {
  nome: string
  kind?: ContaKind
  titular?: string | null
  valorInicialCents?: number
  tipo?: string | null
}

export async function createConta(input: ContaCreate) {
  return prisma.conta.create({
    data: {
      astreaId: null,
      nome: reqStr(input.nome, "nome"),
      kind: input.kind ?? "banco",
      titular: input.titular ?? null,
      origem: "manual",
      tipo: input.tipo ?? null,
      valorInicialCents: input.valorInicialCents ?? 0,
      ativo: true,
    },
  })
}

export interface ContaPatch {
  nome?: string
  titular?: string | null
  kind?: ContaKind
  valorInicialCents?: number
  ordem?: number
  ativo?: boolean
}

export async function updateConta(id: number, patch: ContaPatch) {
  const data: Prisma.ContaUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.titular !== undefined) data.titular = patch.titular
  if (patch.kind !== undefined) data.kind = patch.kind
  if (patch.valorInicialCents !== undefined) data.valorInicialCents = reqInt(patch.valorInicialCents, "valor inicial")
  if (patch.ordem !== undefined) data.ordem = reqInt(patch.ordem, "ordem")
  if (patch.ativo !== undefined) data.ativo = patch.ativo
  return prisma.conta.update({ where: { id }, data })
}

// ── Transferências (paired ledger rows) ──────────────────────────────────────
export interface TransferenciaCreate {
  contaOrigemId: number
  contaDestinoId: number
  valorCents: number
  dataMovimento?: string | null
  descricao?: string | null
}

export async function createTransferencia(input: TransferenciaCreate) {
  const contaOrigemId = reqInt(input.contaOrigemId, "conta de origem")
  const contaDestinoId = reqInt(input.contaDestinoId, "conta de destino")
  if (contaOrigemId === contaDestinoId) throw new UserError("Origem e destino devem ser contas diferentes")
  const valor = Math.abs(reqInt(input.valorCents, "valorCents"))
  if (valor <= 0) throw new UserError("Valor da transferência deve ser positivo")
  const data = toDate(input.dataMovimento) ?? new Date()
  const uid = randomUUID()
  const descricao = input.descricao?.trim() || "Transferência entre contas"

  return prisma.$transaction(async (tx) => {
    const saida = await tx.lancamento.create({
      data: {
        astreaId: `app-transf-${uid}-out`,
        tipo: "saida",
        status: "feito",
        subTipo: "transferencia",
        descricao,
        valorCents: -valor,
        valorOriginalCents: -valor,
        dataLancamento: data,
        dataPagamento: data,
        isAnomalia: true,
        geradoPorApp: true,
        origem: "manual",
        contaId: contaOrigemId,
      },
    })
    const entrada = await tx.lancamento.create({
      data: {
        astreaId: `app-transf-${uid}-in`,
        tipo: "entrada",
        status: "feito",
        subTipo: "transferencia",
        descricao,
        valorCents: valor,
        valorOriginalCents: valor,
        dataLancamento: data,
        dataPagamento: data,
        isAnomalia: true,
        geradoPorApp: true,
        origem: "manual",
        contaId: contaDestinoId,
      },
    })
    return tx.transferencia.create({
      data: {
        valorCents: valor,
        dataMovimento: data,
        descricao,
        origem: "manual",
        contaOrigemId,
        contaDestinoId,
        lancSaidaId: saida.id,
        lancEntradaId: entrada.id,
      },
    })
  })
}

export async function deleteTransferencia(id: number) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.transferencia.findUnique({ where: { id } })
    if (!t) throw new UserError("Transferência não encontrada")
    await tx.transferencia.delete({ where: { id } })
    if (t.lancSaidaId) await tx.lancamento.delete({ where: { id: t.lancSaidaId } })
    if (t.lancEntradaId) await tx.lancamento.delete({ where: { id: t.lancEntradaId } })
  })
}

// ── Custos fixos (operator-entered; unblocks DRE / break-even) ────────────────
export interface CustoFixoInput {
  nome: string
  valorCents: number
  categoria: "pro_labore" | "operacional"
  diaVencimento?: number | null
  contaId?: number | null
  ativo?: boolean
}

export async function createCustoFixo(input: CustoFixoInput) {
  return prisma.custoFixo.create({
    data: {
      nome: reqStr(input.nome, "nome"),
      valorCents: reqInt(input.valorCents, "valorCents"),
      categoria: input.categoria,
      diaVencimento: input.diaVencimento ?? null,
      contaId: input.contaId ?? null,
      origem: "manual",
      ativo: input.ativo ?? true,
    },
  })
}

export async function updateCustoFixo(id: number, patch: Partial<CustoFixoInput>) {
  const data: Prisma.CustoFixoUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.valorCents !== undefined) data.valorCents = reqInt(patch.valorCents, "valorCents")
  if (patch.categoria !== undefined) data.categoria = patch.categoria
  if (patch.diaVencimento !== undefined) data.diaVencimento = patch.diaVencimento
  if (patch.contaId !== undefined) data.contaId = patch.contaId
  if (patch.ativo !== undefined) data.ativo = patch.ativo
  return prisma.custoFixo.update({ where: { id }, data })
}

export async function deleteCustoFixo(id: number) {
  return prisma.custoFixo.delete({ where: { id } })
}

// ── Casos: responsáveis (rateio entre sócios) + acerto ───────────────────────
export interface CasoResponsavelInput {
  contaId: number
  percentual: number
}

/** Replace a caso's sócio split. Only sócio Contas allowed; 0% entries dropped. */
export async function setCasoResponsaveis(casoId: number, responsaveis: CasoResponsavelInput[]) {
  const id = reqInt(casoId, "casoId")
  const list = (Array.isArray(responsaveis) ? responsaveis : [])
    .filter((r) => r && Number.isInteger(r.contaId) && r.contaId > 0)
    .map((r) => ({ contaId: r.contaId, percentual: Math.max(0, Math.min(100, Math.round(Number(r.percentual) || 0))) }))
    .filter((r) => r.percentual > 0)
  // dedupe by contaId (keep last)
  const byConta = new Map(list.map((r) => [r.contaId, r]))
  const final = [...byConta.values()]
  if (final.length) {
    const socios = await prisma.conta.findMany({
      where: { id: { in: final.map((r) => r.contaId) }, kind: "socio" },
      select: { id: true },
    })
    const ok = new Set(socios.map((s) => s.id))
    for (const r of final) if (!ok.has(r.contaId)) throw new UserError("Responsável deve ser uma conta de sócio")
  }
  return prisma.$transaction(async (tx) => {
    await tx.casoResponsavel.deleteMany({ where: { casoId: id } })
    if (final.length) {
      await tx.casoResponsavel.createMany({
        data: final.map((r) => ({ casoId: id, contaId: r.contaId, percentual: r.percentual })),
      })
    }
    return { casoId: id, count: final.length }
  })
}

// ── LGPD: anonimização de cliente ─────────────────────────────────────────────
/**
 * LGPD erasure request — anonymize IN PLACE (the ledger keeps its rows so
 * balances/KPIs stay intact): every direct identifier on the Cliente →
 * "[REMOVIDO LGPD]"/null; linked Leads likewise. Leads that never converted
 * (and carry no honorário) are hard-deleted. `genionsId` is cleared so a
 * future Genions re-import can't resurrect the PII onto the anonymized row.
 * The AuditLog entry (action "cliente.anonimizar", written by runMutation)
 * is the deletion evidence.
 */
export async function anonimizarCliente(id: number) {
  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({ where: { id }, select: { id: true } })
    if (!cliente) throw new UserError("Cliente não encontrado")

    const removidos = await tx.lead.deleteMany({
      where: { clienteId: id, etapa: { not: "ganho" }, honorarioId: null },
    })
    await tx.lead.updateMany({
      where: { clienteId: id },
      data: {
        nome: "[REMOVIDO LGPD]",
        email: null,
        telefone: null,
        observacoes: null,
        motivoPerda: null,
        genionsId: null,
      },
    })
    await tx.cliente.update({
      where: { id },
      data: {
        nome: "[REMOVIDO LGPD]",
        apelido: null,
        cpfCnpj: null,
        emails: null,
        telefones: null,
        logradouro: null,
        numero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        uf: null,
        cep: null,
      },
    })
    // PII denormalizada: o nome do pagador no ledger e as partes processuais deste
    // cliente também carregam dados pessoais → anonimizar (mantém os valores).
    await tx.lancamento.updateMany({ where: { clienteId: id, pagoPara: { not: null } }, data: { pagoPara: "[REMOVIDO LGPD]" } })
    await tx.parte.updateMany({ where: { clienteId: id }, data: { nome: "[REMOVIDO LGPD]", documento: null } })
    return { id, leadsRemovidos: removidos.count }
  })
}

/** Settle the current sócio imbalance with a transfer devedor → credor. */
export async function registrarAcertoSocios() {
  const acerto = await getAcertoSocios()
  if (acerto.quitado || acerto.devedorId == null || acerto.credorId == null || acerto.valorCents <= 0) {
    return { quitado: true as const }
  }
  return createTransferencia({
    contaOrigemId: acerto.devedorId,
    contaDestinoId: acerto.credorId,
    valorCents: acerto.valorCents,
    descricao: "Acerto entre sócios",
  })
}
