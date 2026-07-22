// Processos & Casos — write layer. SERVER ONLY. Pure functions called by the
// route handlers inside runMutation (auth/zod/rate-limit/audit live there). The
// prazo math is delegated to the pure engine (./prazo + ./contexto); deletes set
// `excluidoEm` (legal data is never physically removed). App-created rows carry
// no astreaId (operator-only entities), matching CasoResponsavel/Evento/Tarefa.
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { UserError } from "@/lib/errors"
import { getAnexoStore } from "@/lib/lexia/anexos/storage"
import { emitNotificacao } from "@/lib/notificacoes/bus"
import { notificarPrazoConfirmado, notificarPrazoCumprido } from "@/lib/notificacoes/triggers"
import { associarProcesso } from "./associacao"
import { anosParaPrazo, carregarContextoPrazo } from "./contexto"
import { anoDeISO, toISODate } from "./datas"
import { calcularPrazo, dataInterna as calcDataInterna, inicioPorDisponibilizacao, inicioPorPublicacao } from "./prazo"
import {
  FONTES_ANDAMENTO,
  PARTE_PAPEIS,
  PARTE_TIPOS,
  POLOS,
  PROCESSO_STATUS,
  PRAZO_ORIGENS,
  PRAZO_STATUS,
  SISTEMAS,
  TIPOS_CONTAGEM,
  type TipoContagem,
} from "./types"

// ── coercion (mirrors agenda/casos conventions) ───────────────────────────────
function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}
function optStr(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t : null
}
function optId(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}
function optInt(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}
function clampUnion<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (typeof v === "string" && (allowed as readonly string[]).includes(v) ? v : fallback) as T
}
/**
 * Any date-leading string ("YYYY-MM-DD" or a full datetime) → that calendar day
 * at LOCAL NOON. All dates in this module are date-only (distribuição, publicação,
 * prazos, andamento, feriado), so storing at noon keeps the UTC read-slice and the
 * São Paulo wall-clock prazo base on the SAME day (no off-by-one under TZ).
 */
function toDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === "") return null
  if (input instanceof Date) return input
  if (typeof input !== "string") return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}
function isoToNoonDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}
function isUniqueError(e: unknown, field: string): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    String((e.meta as { target?: string | string[] } | undefined)?.target ?? "").includes(field)
  )
}

// ── Processo ─────────────────────────────────────────────────────────────────
export interface ProcessoCreate {
  casoId: number
  numeroCnj?: string | null
  classe?: string | null
  assunto?: string | null
  valorCausaCents?: number
  faseAtual?: string | null
  instancia?: string | null
  status?: string
  vara?: string | null
  comarca?: string | null
  tribunal?: string | null
  uf?: string | null
  sistema?: string | null
  segredoJustica?: boolean
  dataDistribuicao?: string | null
  responsavelUserId?: number | null
  /** Partes estruturadas a criar junto (ex.: extraídas de uma publicação na triagem). */
  partes?: ParteCreate[]
  /** Cliente a vincular ao caso quando este ainda não tiver clientePrincipal. */
  clienteId?: number | null
}

export async function createProcesso(input: ProcessoCreate) {
  const casoId = optId(input.casoId)
  if (!casoId) throw new UserError("Caso obrigatório")
  const caso = await prisma.caso.findFirst({
    where: { id: casoId, excluidoEm: null },
    select: { id: true, clientePrincipalId: true },
  })
  if (!caso) throw new UserError("Caso não encontrado")
  let processo
  try {
    processo = await prisma.processo.create({
      data: {
        casoId,
        numeroCnj: optStr(input.numeroCnj),
        classe: optStr(input.classe),
        assunto: optStr(input.assunto),
        valorCausaCents: optInt(input.valorCausaCents) ?? 0,
        faseAtual: optStr(input.faseAtual),
        instancia: optStr(input.instancia),
        status: clampUnion(input.status, PROCESSO_STATUS, "ativo"),
        vara: optStr(input.vara),
        comarca: optStr(input.comarca),
        tribunal: optStr(input.tribunal),
        uf: optStr(input.uf)?.toUpperCase() ?? null,
        sistema: input.sistema ? clampUnion(input.sistema, SISTEMAS, "outro") : null,
        segredoJustica: !!input.segredoJustica,
        dataDistribuicao: toDate(input.dataDistribuicao),
        responsavelUserId: optId(input.responsavelUserId),
      },
    })
  } catch (e) {
    if (isUniqueError(e, "numeroCnj")) throw new UserError("Já existe um processo com esse número CNJ")
    throw e
  }

  // AI-first integration on identification — best-effort (never breaks the create):
  // structure provided parties, and auto-fill the caso's client only on a STRONG
  // match (CNJ-identical caso), per the office's "auto só em match forte" policy.
  try {
    for (const p of input.partes ?? []) {
      await addParteAoProcesso(processo.id, p).catch(() => {})
    }
    let clienteId = optId(input.clienteId)
    if (!clienteId && !caso.clientePrincipalId && processo.numeroCnj) {
      const assoc = await associarProcesso({ numeroCnj: processo.numeroCnj })
      if (assoc.confianca === "forte" && assoc.clienteForte) clienteId = assoc.clienteForte.id
    }
    if (clienteId && !caso.clientePrincipalId) {
      await prisma.caso.update({ where: { id: casoId }, data: { clientePrincipalId: clienteId } })
    }
  } catch {
    /* integração é apoio — não impede a criação do processo */
  }

  return processo
}

export type ProcessoPatch = Partial<Omit<ProcessoCreate, "casoId">>

export async function updateProcesso(id: number, patch: ProcessoPatch) {
  const existing = await prisma.processo.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Processo não encontrado")
  const data: Prisma.ProcessoUncheckedUpdateInput = {}
  if (patch.numeroCnj !== undefined) data.numeroCnj = optStr(patch.numeroCnj)
  if (patch.classe !== undefined) data.classe = optStr(patch.classe)
  if (patch.assunto !== undefined) data.assunto = optStr(patch.assunto)
  if (patch.valorCausaCents !== undefined) data.valorCausaCents = optInt(patch.valorCausaCents) ?? 0
  if (patch.faseAtual !== undefined) data.faseAtual = optStr(patch.faseAtual)
  if (patch.instancia !== undefined) data.instancia = optStr(patch.instancia)
  if (patch.status !== undefined) data.status = clampUnion(patch.status, PROCESSO_STATUS, "ativo")
  if (patch.vara !== undefined) data.vara = optStr(patch.vara)
  if (patch.comarca !== undefined) data.comarca = optStr(patch.comarca)
  if (patch.tribunal !== undefined) data.tribunal = optStr(patch.tribunal)
  if (patch.uf !== undefined) data.uf = optStr(patch.uf)?.toUpperCase() ?? null
  if (patch.sistema !== undefined) data.sistema = patch.sistema ? clampUnion(patch.sistema, SISTEMAS, "outro") : null
  if (patch.segredoJustica !== undefined) data.segredoJustica = !!patch.segredoJustica
  if (patch.dataDistribuicao !== undefined) data.dataDistribuicao = toDate(patch.dataDistribuicao)
  if (patch.responsavelUserId !== undefined) data.responsavelUserId = optId(patch.responsavelUserId)
  try {
    return await prisma.processo.update({ where: { id }, data })
  } catch (e) {
    if (isUniqueError(e, "numeroCnj")) throw new UserError("Já existe um processo com esse número CNJ")
    throw e
  }
}

/**
 * Soft-delete: legal data is never physically removed. The soft-delete CASCADES to
 * the processo's pending children (prazos/andamentos/publicações/anotações) and
 * cancels its mirror agenda events — otherwise an orphaned prazo keeps surfacing on
 * the Início (and 404s when its now-deleted processo is opened). Done in one
 * transaction so a partially-deleted processo can't leak orphans.
 */
export async function deleteProcesso(id: number) {
  const existing = await prisma.processo.findFirst({ where: { id, excluidoEm: null }, select: { id: true, numeroCnj: true } })
  if (!existing) throw new UserError("Processo não encontrado")
  const now = new Date()
  await prisma.$transaction([
    prisma.prazo.updateMany({ where: { processoId: id, excluidoEm: null }, data: { excluidoEm: now } }),
    prisma.andamento.updateMany({ where: { processoId: id, excluidoEm: null }, data: { excluidoEm: now } }),
    prisma.publicacao.updateMany({ where: { processoId: id, excluidoEm: null }, data: { excluidoEm: now } }),
    prisma.anotacao.updateMany({ where: { processoId: id, excluidoEm: null }, data: { excluidoEm: now } }),
    // drop the structured fee-lançamento link so the honorário re-surfaces as "sem processo"
    prisma.lancamento.updateMany({ where: { processoId: id }, data: { processoId: null } }),
    prisma.evento.updateMany({ where: { processoId: id, status: { not: "cancelado" } }, data: { status: "cancelado" } }),
    // tombstone the CNJ so the global @unique index frees up — re-creating/re-syncing
    // the same CNJ after deletion must not hit P2002 (soft-delete = logically gone).
    prisma.processo.update({
      where: { id },
      data: { excluidoEm: now, numeroCnj: existing.numeroCnj ? `${existing.numeroCnj}#del-${id}` : null },
    }),
  ])
  return { id }
}

// ── Parte / ParteProcesso ──────────────────────────────────────────────────────
export interface ParteCreate {
  parteId?: number | null
  nome?: string
  tipo?: string
  documento?: string | null
  clienteId?: number | null
  papel: string
  polo: string
  ehCliente?: boolean
}

export async function addParteAoProcesso(processoId: number, input: ParteCreate) {
  const proc = await prisma.processo.findFirst({ where: { id: processoId, excluidoEm: null }, select: { id: true } })
  if (!proc) throw new UserError("Processo não encontrado")

  let parteId = optId(input.parteId)
  if (!parteId) {
    const documento = optStr(input.documento)
    // reuse an existing Parte with the same documento (dedupe)
    if (documento) {
      const found = await prisma.parte.findFirst({ where: { documento, excluidoEm: null }, select: { id: true } })
      if (found) parteId = found.id
    }
    if (!parteId) {
      const parte = await prisma.parte.create({
        data: {
          nome: reqStr(input.nome, "nome da parte"),
          tipo: clampUnion(input.tipo, PARTE_TIPOS, "pf"),
          documento,
          clienteId: optId(input.clienteId),
        },
      })
      parteId = parte.id
    }
  }

  try {
    return await prisma.parteProcesso.create({
      data: {
        processoId,
        parteId,
        papel: clampUnion(input.papel, PARTE_PAPEIS, "outro"),
        polo: clampUnion(input.polo, POLOS, "outro"),
        ehCliente: !!input.ehCliente,
      },
    })
  } catch (e) {
    if (isUniqueError(e, "processoId")) throw new UserError("Esta parte já consta no processo com esse papel")
    throw e
  }
}

export interface ParteProcessoPatch {
  papel?: string
  polo?: string
  ehCliente?: boolean
  nome?: string
  documento?: string | null
}

export async function updateParteProcesso(id: number, patch: ParteProcessoPatch) {
  const link = await prisma.parteProcesso.findUnique({ where: { id }, select: { id: true, parteId: true } })
  if (!link) throw new UserError("Parte não encontrada")
  const data: Prisma.ParteProcessoUncheckedUpdateInput = {}
  if (patch.papel !== undefined) data.papel = clampUnion(patch.papel, PARTE_PAPEIS, "outro")
  if (patch.polo !== undefined) data.polo = clampUnion(patch.polo, POLOS, "outro")
  if (patch.ehCliente !== undefined) data.ehCliente = !!patch.ehCliente
  if (Object.keys(data).length) await prisma.parteProcesso.update({ where: { id }, data })
  // optionally patch the underlying Parte identity
  const parteData: Prisma.ParteUncheckedUpdateInput = {}
  if (patch.nome !== undefined) parteData.nome = reqStr(patch.nome, "nome da parte")
  if (patch.documento !== undefined) parteData.documento = optStr(patch.documento)
  if (Object.keys(parteData).length) await prisma.parte.update({ where: { id: link.parteId }, data: parteData })
  return { id }
}

/** Remove the link (the Parte row itself is kept — it may belong to other processos). */
export async function removerParteDoProcesso(id: number) {
  const link = await prisma.parteProcesso.findUnique({ where: { id }, select: { id: true } })
  if (!link) throw new UserError("Parte não encontrada")
  await prisma.parteProcesso.delete({ where: { id } })
  return { id }
}

// ── Andamento ────────────────────────────────────────────────────────────────
export interface AndamentoCreate {
  data: string
  tipo?: string | null
  descricao: string
  fonte?: string
  relevante?: boolean
  externalId?: string | null
}

export async function createAndamento(processoId: number, input: AndamentoCreate) {
  const proc = await prisma.processo.findFirst({ where: { id: processoId, excluidoEm: null }, select: { id: true } })
  if (!proc) throw new UserError("Processo não encontrado")
  const data = toDate(input.data)
  if (!data) throw new UserError("Data do andamento obrigatória")
  return prisma.andamento.create({
    data: {
      processoId,
      data,
      tipo: optStr(input.tipo),
      descricao: reqStr(input.descricao, "descrição"),
      fonte: clampUnion(input.fonte, FONTES_ANDAMENTO, "manual"),
      relevante: !!input.relevante,
      statusRevisao: "revisado", // lançamento manual não entra na fila de triagem
      externalId: optStr(input.externalId),
    },
  })
}

export type AndamentoPatch = Partial<AndamentoCreate>

export async function updateAndamento(id: number, patch: AndamentoPatch) {
  const existing = await prisma.andamento.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Andamento não encontrado")
  const data: Prisma.AndamentoUncheckedUpdateInput = {}
  if (patch.data !== undefined) {
    const d = toDate(patch.data)
    if (!d) throw new UserError("Data inválida")
    data.data = d
  }
  if (patch.tipo !== undefined) data.tipo = optStr(patch.tipo)
  if (patch.descricao !== undefined) data.descricao = reqStr(patch.descricao, "descrição")
  if (patch.fonte !== undefined) data.fonte = clampUnion(patch.fonte, FONTES_ANDAMENTO, "manual")
  if (patch.relevante !== undefined) data.relevante = !!patch.relevante
  return prisma.andamento.update({ where: { id }, data })
}

export async function deleteAndamento(id: number) {
  const existing = await prisma.andamento.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Andamento não encontrado")
  await prisma.andamento.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}

// ── Publicação ─────────────────────────────────────────────────────────────────
export interface PublicacaoCreate {
  processoId?: number | null
  dataDisponibilizacao?: string | null
  dataPublicacao?: string | null
  diario?: string | null
  conteudo: string
  numeroProcessoBruto?: string | null
  oabBruto?: string | null
  externalId?: string | null
}

export async function createPublicacao(input: PublicacaoCreate) {
  return prisma.publicacao.create({
    data: {
      processoId: optId(input.processoId),
      dataDisponibilizacao: toDate(input.dataDisponibilizacao),
      dataPublicacao: toDate(input.dataPublicacao),
      diario: optStr(input.diario),
      conteudo: reqStr(input.conteudo, "conteúdo"),
      numeroProcessoBruto: optStr(input.numeroProcessoBruto),
      oabBruto: optStr(input.oabBruto),
      externalId: optStr(input.externalId),
    },
  })
}

// ── Prazo (the calculated deadline) ──────────────────────────────────────────
export interface PrazoParams {
  descricao: string
  tipo?: string | null
  quantidadeDias: number
  tipoContagem?: string
  jurisdicao?: string | null
  diasMargem?: number
  responsavelUserId?: number | null
}

interface ComputeInput {
  /** Explicit first counting day (0 extra hops — only protraído ao 1º dia útil). */
  dataInicio?: string | null
  /** Known PUBLICATION date → 1 hop (início = 1º dia útil seguinte à publicação). */
  dataPublicacao?: string | null
  /** DJe DISPONIBILIZAÇÃO date → 2 hops (publicação then início, art. 224 §§2-3). */
  dataDisponibilizacao?: string | null
  quantidadeDias: number
  tipoContagem: string
  jurisdicao?: string | null
  diasMargem?: number
}

interface ComputeResult {
  origemPublicacao: boolean
  dataInicioISO: string
  dataFatalISO: string
  dataInternaISO: string
  dataPublicacaoISO: string | null
  tipoContagem: TipoContagem
  margem: number
}

/** Run the pure engine over the configured holiday/suspension context. */
async function computarPrazo(input: ComputeInput): Promise<ComputeResult> {
  const tipoContagem = clampUnion(input.tipoContagem, TIPOS_CONTAGEM, "uteis")
  const quantidadeDias = Number(input.quantidadeDias)
  if (!Number.isInteger(quantidadeDias) || quantidadeDias <= 0) throw new UserError("Quantidade de dias inválida")

  const baseISO = input.dataDisponibilizacao
    ? toISODate(input.dataDisponibilizacao)
    : input.dataPublicacao
      ? toISODate(input.dataPublicacao)
      : input.dataInicio
        ? toISODate(input.dataInicio)
        : null
  if (!baseISO) throw new UserError("Informe a data de início, de publicação ou de disponibilização")

  const ctx = await carregarContextoPrazo(anosParaPrazo(anoDeISO(baseISO), quantidadeDias), input.jurisdicao)

  // Resolve the first counting day by how many DJe hops the source date implies.
  const origemPublicacao = !!(input.dataDisponibilizacao || input.dataPublicacao)
  let dataInicioISO: string
  let dataPublicacaoISO: string | null = null
  if (input.dataDisponibilizacao) {
    const r = inicioPorDisponibilizacao(toISODate(input.dataDisponibilizacao), ctx) // 2 hops
    dataPublicacaoISO = r.publicacao
    dataInicioISO = r.inicio
  } else if (input.dataPublicacao) {
    const r = inicioPorPublicacao(toISODate(input.dataPublicacao), ctx) // 1 hop
    dataPublicacaoISO = r.publicacao
    dataInicioISO = r.inicio
  } else {
    dataInicioISO = toISODate(input.dataInicio as string)
  }

  const calc = calcularPrazo({ dataInicio: dataInicioISO, quantidadeDias, tipoContagem, ctx })
  const margem = input.diasMargem ?? env.PRAZO_MARGEM_DIAS
  const dataInternaISO = calcDataInterna(calc.dataFatal, margem, ctx)
  return {
    origemPublicacao,
    dataInicioISO: calc.dataInicioContagem,
    dataFatalISO: calc.dataFatal,
    dataInternaISO,
    dataPublicacaoISO,
    tipoContagem,
    margem,
  }
}

export interface PreviewInput {
  dataInicio?: string | null
  dataPublicacao?: string | null
  dataDisponibilizacao?: string | null
  quantidadeDias: number
  tipoContagem?: string
  jurisdicao?: string | null
  diasMargem?: number
}

/** Preview-only: compute fatal/internal dates without persisting (for the UI). */
export async function previewPrazo(input: PreviewInput) {
  const r = await computarPrazo({ ...input, tipoContagem: input.tipoContagem ?? "uteis" })
  return {
    dataInicio: r.dataInicioISO,
    dataFatal: r.dataFatalISO,
    dataInterna: r.dataInternaISO,
    dataPublicacao: r.dataPublicacaoISO,
    tipoContagem: r.tipoContagem,
    diasMargem: r.margem,
  }
}

/** Preview defaulting the jurisdiction (holiday set) from the processo's court. */
export async function previewPrazoParaProcesso(processoId: number, input: PreviewInput) {
  const proc = await prisma.processo.findFirst({
    where: { id: processoId, excluidoEm: null },
    select: { tribunal: true, uf: true },
  })
  if (!proc) throw new UserError("Processo não encontrado")
  const jurisdicao = optStr(input.jurisdicao) ?? proc.tribunal ?? proc.uf
  return previewPrazo({ ...input, jurisdicao })
}

async function maybeCriarEventoPrazo(
  prazoId: number,
  processoId: number,
  descricao: string,
  dataFatalISO: string,
  responsavelUserId: number | null,
): Promise<number> {
  const proc = await prisma.processo.findUnique({ where: { id: processoId }, select: { casoId: true } })
  const ev = await prisma.evento.create({
    data: {
      titulo: `Prazo: ${descricao}`,
      tipo: "prazo",
      dataInicio: isoToNoonDate(dataFatalISO),
      diaInteiro: true,
      casoId: proc?.casoId ?? null,
      processoId,
      responsavelId: responsavelUserId,
      origem: "manual",
      geradoPorApp: true,
    },
  })
  await prisma.prazo.update({ where: { id: prazoId }, data: { eventoId: ev.id } })
  return ev.id
}

export interface PrazoCreate extends PrazoParams {
  origem?: string
  dataInicio?: string
  dataPublicacao?: string
  dataDisponibilizacao?: string
  criarEvento?: boolean
  /** 'proposto' = rascunho da IA (não vira Evento/agenda até confirmar); default 'pendente'. */
  status?: string
}

export async function createPrazo(processoId: number, input: PrazoCreate, actorEmail?: string | null) {
  const proc = await prisma.processo.findFirst({
    where: { id: processoId, excluidoEm: null },
    select: { id: true, tribunal: true, uf: true, responsavelUserId: true },
  })
  if (!proc) throw new UserError("Processo não encontrado")

  // Default the jurisdiction (holiday set) to the processo's court when not given.
  const jurisdicao = optStr(input.jurisdicao) ?? proc.tribunal ?? proc.uf
  const r = await computarPrazo({
    dataInicio: input.dataInicio,
    dataPublicacao: input.dataPublicacao,
    dataDisponibilizacao: input.dataDisponibilizacao,
    quantidadeDias: input.quantidadeDias,
    tipoContagem: input.tipoContagem ?? "uteis",
    jurisdicao,
    diasMargem: input.diasMargem,
  })
  const origem = r.origemPublicacao ? "intimacao" : clampUnion(input.origem, PRAZO_ORIGENS, "manual")
  const status = clampUnion(input.status, PRAZO_STATUS, "pendente")

  const prazo = await prisma.prazo.create({
    data: {
      processoId,
      descricao: reqStr(input.descricao, "descrição"),
      tipo: optStr(input.tipo),
      origem,
      status,
      dataPublicacao: r.dataPublicacaoISO ? isoToNoonDate(r.dataPublicacaoISO) : null,
      dataInicio: isoToNoonDate(r.dataInicioISO),
      quantidadeDias: input.quantidadeDias,
      tipoContagem: r.tipoContagem,
      jurisdicao,
      dataFatal: isoToNoonDate(r.dataFatalISO),
      diasMargem: r.margem,
      dataInterna: isoToNoonDate(r.dataInternaISO),
      // Default-smart: a prazo without an explicit owner inherits the processo's
      // responsible lawyer, so notifications reach the right advogado.
      responsavelUserId: optId(input.responsavelUserId) ?? proc.responsavelUserId,
    },
  })
  // Rascunho ('proposto') NÃO vai para a agenda — o Evento só nasce ao confirmar.
  if (input.criarEvento && status !== "proposto")
    await maybeCriarEventoPrazo(prazo.id, processoId, prazo.descricao, r.dataFatalISO, prazo.responsavelUserId)
  // Prazo REAL (pendente) → notifica o responsável + cópia ao gestor. Rascunho não notifica.
  if (prazo.status === "pendente") {
    void notificarPrazoConfirmado({
      prazoId: prazo.id,
      descricao: prazo.descricao,
      processoId,
      responsavelUserId: prazo.responsavelUserId,
      actorEmail,
      dataFatalISO: r.dataFatalISO,
    })
  }
  return prazo
}

export interface PrazoPatch {
  descricao?: string
  tipo?: string | null
  quantidadeDias?: number
  tipoContagem?: string
  jurisdicao?: string | null
  diasMargem?: number
  dataInicio?: string
  dataPublicacao?: string | null
  responsavelUserId?: number | null
  status?: string
}

export async function updatePrazo(id: number, patch: PrazoPatch, actorEmail?: string | null) {
  const existing = await prisma.prazo.findFirst({
    where: { id, excluidoEm: null },
    select: {
      id: true,
      status: true,
      quantidadeDias: true,
      tipoContagem: true,
      jurisdicao: true,
      diasMargem: true,
      dataInicio: true,
      dataPublicacao: true,
      origem: true,
      eventoId: true,
    },
  })
  if (!existing) throw new UserError("Prazo não encontrado")
  const eraProposto = existing.status === "proposto"

  const data: Prisma.PrazoUncheckedUpdateInput = {}
  if (patch.descricao !== undefined) data.descricao = reqStr(patch.descricao, "descrição")
  if (patch.tipo !== undefined) data.tipo = optStr(patch.tipo)
  if (patch.responsavelUserId !== undefined) data.responsavelUserId = optId(patch.responsavelUserId)
  if (patch.status !== undefined) {
    // Only touch cumpridoEm on an ACTUAL transition — re-saving an already-cumprido
    // prazo must not overwrite the real completion timestamp (cumprir/reabrir own it).
    const status = clampUnion(patch.status, PRAZO_STATUS, "pendente")
    // Um rascunho ('proposto') só sai desse estado por confirmar (→pendente, cria
    // Evento abaixo) ou rejeitar (→cancelado). Não pode pular direto p/ cumprido/perdido.
    if (eraProposto && (status === "cumprido" || status === "perdido"))
      throw new UserError("Confirme o prazo proposto antes de marcá-lo como cumprido/perdido")
    data.status = status
    if (status === "cumprido" && existing.status !== "cumprido") data.cumpridoEm = new Date()
    else if (status !== "cumprido" && existing.status === "cumprido") data.cumpridoEm = null
  }

  // Recompute the fatal/internal dates if any timing input changed.
  const timingChanged =
    patch.quantidadeDias !== undefined ||
    patch.tipoContagem !== undefined ||
    patch.jurisdicao !== undefined ||
    patch.diasMargem !== undefined ||
    patch.dataInicio !== undefined ||
    patch.dataPublicacao !== undefined
  if (timingChanged) {
    const dataPublicacao =
      patch.dataPublicacao !== undefined
        ? patch.dataPublicacao
        : existing.dataPublicacao
          ? toISODate(existing.dataPublicacao)
          : null
    const dataInicio = patch.dataInicio !== undefined ? patch.dataInicio : toISODate(existing.dataInicio)
    const r = await computarPrazo({
      dataInicio: dataPublicacao ? null : dataInicio,
      dataPublicacao: dataPublicacao,
      quantidadeDias: patch.quantidadeDias ?? existing.quantidadeDias,
      tipoContagem: patch.tipoContagem ?? existing.tipoContagem,
      jurisdicao: patch.jurisdicao !== undefined ? patch.jurisdicao : existing.jurisdicao,
      diasMargem: patch.diasMargem ?? existing.diasMargem,
    })
    data.quantidadeDias = patch.quantidadeDias ?? existing.quantidadeDias
    data.tipoContagem = r.tipoContagem
    if (patch.jurisdicao !== undefined) data.jurisdicao = optStr(patch.jurisdicao)
    data.diasMargem = r.margem
    data.dataPublicacao = r.dataPublicacaoISO ? isoToNoonDate(r.dataPublicacaoISO) : null
    data.dataInicio = isoToNoonDate(r.dataInicioISO)
    data.dataFatal = isoToNoonDate(r.dataFatalISO)
    data.dataInterna = isoToNoonDate(r.dataInternaISO)
  }
  const updated = await prisma.prazo.update({ where: { id }, data })
  // INVARIANTE: qualquer caminho que promova um rascunho ('proposto') a 'pendente'
  // cria o Evento espelho na agenda (createPrazo o pula no rascunho) E notifica —
  // este é o ÚNICO ponto da transição proposto→pendente (confirmarPrazo delega aqui),
  // então a rota genérica PATCH /prazos/[id] também passa a notificar.
  if (eraProposto && updated.status === "pendente") {
    if (!existing.eventoId) {
      await maybeCriarEventoPrazo(updated.id, updated.processoId, updated.descricao, toISODate(updated.dataFatal), updated.responsavelUserId)
    }
    void notificarPrazoConfirmado({
      prazoId: updated.id,
      descricao: updated.descricao,
      processoId: updated.processoId,
      responsavelUserId: updated.responsavelUserId,
      actorEmail,
      dataFatalISO: updated.dataFatal ? toISODate(updated.dataFatal) : null,
    })
  }
  return updated
}

export async function cumprirPrazo(id: number, dataISO?: string, actorEmail?: string | null) {
  const existing = await prisma.prazo.findFirst({ where: { id, excluidoEm: null }, select: { id: true, status: true } })
  if (!existing) throw new UserError("Prazo não encontrado")
  // Rascunho da IA não pode ser "cumprido" sem antes ser confirmado por um humano.
  if (existing.status === "proposto") throw new UserError("Confirme o prazo proposto antes de marcá-lo como cumprido")
  const updated = await prisma.prazo.update({
    where: { id },
    data: { status: "cumprido", cumpridoEm: toDate(dataISO) ?? new Date() },
  })
  // Cumprido → avisa os gestores (supervisão).
  void notificarPrazoCumprido({ prazoId: updated.id, descricao: updated.descricao, processoId: updated.processoId, actorEmail })
  return updated
}

export async function reabrirPrazo(id: number) {
  const existing = await prisma.prazo.findFirst({ where: { id, excluidoEm: null }, select: { id: true, status: true } })
  if (!existing) throw new UserError("Prazo não encontrado")
  // 'proposto' só sai via confirmar/rejeitar — reabrir não se aplica a um rascunho.
  if (existing.status === "proposto") throw new UserError("Prazo proposto — confirme ou rejeite na fila 'A confirmar'")
  return prisma.prazo.update({ where: { id }, data: { status: "pendente", cumpridoEm: null } })
}

/**
 * Confirma um prazo PROPOSTO pela IA → vira 'pendente' (real): aplica edições
 * opcionais (recalcula datas pelo motor CPC) e SÓ AGORA cria o Evento espelho na
 * agenda. Antes da confirmação o rascunho não notifica nem ocupa a agenda.
 */
export async function confirmarPrazo(id: number, patch?: PrazoPatch, actorEmail?: string | null) {
  const existing = await prisma.prazo.findFirst({ where: { id, excluidoEm: null }, select: { id: true, status: true } })
  if (!existing) throw new UserError("Prazo não encontrado")
  if (existing.status !== "proposto") throw new UserError("Este prazo não está aguardando confirmação")
  // updatePrazo aplica as edições e, na transição proposto→pendente, cria o Evento
  // E dispara notificarPrazoConfirmado (ponto único) — não notificamos de novo aqui.
  return updatePrazo(id, { ...(patch ?? {}), status: "pendente" }, actorEmail)
}

/** Rejeita um prazo proposto (não procede) → 'cancelado' (auditável). */
export async function rejeitarPrazo(id: number) {
  const existing = await prisma.prazo.findFirst({ where: { id, excluidoEm: null }, select: { id: true, status: true } })
  if (!existing) throw new UserError("Prazo não encontrado")
  if (existing.status !== "proposto") throw new UserError("Só é possível rejeitar um prazo proposto")
  return prisma.prazo.update({ where: { id }, data: { status: "cancelado" } })
}

export async function deletePrazo(id: number) {
  const existing = await prisma.prazo.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Prazo não encontrado")
  await prisma.prazo.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}

/** Generate a Prazo from a relevant Andamento (marks the andamento relevante + links it). */
export async function gerarPrazoDeAndamento(
  andamentoId: number,
  params: PrazoParams & { usarDataDoAndamento?: boolean; criarEvento?: boolean; status?: string },
) {
  const and = await prisma.andamento.findFirst({
    where: { id: andamentoId, excluidoEm: null },
    select: { id: true, processoId: true, data: true },
  })
  if (!and) throw new UserError("Andamento não encontrado")
  const dataISO = toISODate(and.data)
  const prazo = await createPrazo(and.processoId, {
    ...params,
    origem: "andamento",
    ...(params.usarDataDoAndamento ? { dataPublicacao: dataISO } : { dataInicio: dataISO }),
  })
  // agir num movimento o tira da fila de revisão (relevante + prazo + revisado)
  await prisma.andamento.update({
    where: { id: andamentoId },
    data: { relevante: true, prazoId: prazo.id, statusRevisao: "revisado", revisadoEm: new Date() },
  })
  return prazo
}

/** Marca um andamento como revisado (sem gerar prazo) — tira da fila de Movimentos. */
export async function revisarAndamento(id: number) {
  const and = await prisma.andamento.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!and) throw new UserError("Andamento não encontrado")
  return prisma.andamento.update({ where: { id }, data: { statusRevisao: "revisado", revisadoEm: new Date() } })
}

/** Marca TODOS os movimentos novos de um processo como revisados ("marcar todos"). */
export async function revisarProcessoMovimentos(processoId: number) {
  const proc = await prisma.processo.findFirst({ where: { id: processoId, excluidoEm: null }, select: { id: true } })
  if (!proc) throw new UserError("Processo não encontrado")
  const r = await prisma.andamento.updateMany({
    where: { processoId, statusRevisao: "novo", excluidoEm: null },
    data: { statusRevisao: "revisado", revisadoEm: new Date() },
  })
  return { processoId, revisados: r.count }
}

// ── Publicação triagem ─────────────────────────────────────────────────────────
export interface TriagemInput {
  acao: "relevante" | "descartar"
  prazo?: PrazoParams
  criarEvento?: boolean
}

export async function triarPublicacao(id: number, input: TriagemInput) {
  const pub = await prisma.publicacao.findFirst({
    where: { id, excluidoEm: null },
    select: { id: true, processoId: true, dataPublicacao: true, dataDisponibilizacao: true, statusTriagem: true },
  })
  if (!pub) throw new UserError("Publicação não encontrada")
  if (pub.statusTriagem === "triada") throw new UserError("Publicação já triada")

  if (input.acao === "descartar") {
    return prisma.publicacao.update({ where: { id }, data: { statusTriagem: "descartada" } })
  }

  // relevante → generate a prazo. Use the correct DJe hop count: a known
  // publication date is a SINGLE hop (dataPublicacao); only the disponibilização
  // gets the extra §2 hop (dataDisponibilizacao). Preferring the publication date
  // here would otherwise double-protract the deadline (start it one útil late).
  if (!pub.processoId) throw new UserError("Vincule a publicação a um processo antes de gerar o prazo")
  if (!input.prazo) throw new UserError("Informe os dados do prazo")
  if (!pub.dataPublicacao && !pub.dataDisponibilizacao)
    throw new UserError("Publicação sem data de publicação/disponibilização")
  const prazo = await createPrazo(pub.processoId, {
    ...input.prazo,
    ...(pub.dataPublicacao
      ? { dataPublicacao: toISODate(pub.dataPublicacao) }
      : { dataDisponibilizacao: toISODate(pub.dataDisponibilizacao as Date) }),
    criarEvento: input.criarEvento,
  })
  await prisma.publicacao.update({ where: { id }, data: { statusTriagem: "triada", prazoId: prazo.id } })
  return { publicacaoId: id, prazoId: prazo.id }
}

/**
 * Desfaz a triagem: volta a publicação para a fila ('pendente'). Usado para
 * reverter um "cartorário" (descartar) marcado por engano. Se a triagem havia
 * gerado um prazo, apenas DESVINCULA (prazoId=null) — o Prazo NÃO é apagado (pode
 * ser um prazo real; o usuário o cancela na tela de prazos se quiser).
 */
export async function reabrirTriagem(id: number) {
  const pub = await prisma.publicacao.findFirst({
    where: { id, excluidoEm: null },
    select: { id: true, statusTriagem: true },
  })
  if (!pub) throw new UserError("Publicação não encontrada")
  if (pub.statusTriagem === "pendente") return pub
  return prisma.publicacao.update({ where: { id }, data: { statusTriagem: "pendente", prazoId: null } })
}

/** Soft-delete de uma publicação (remove da fila; dado jurídico não é apagado fisicamente). */
export async function deletePublicacao(id: number) {
  const pub = await prisma.publicacao.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!pub) throw new UserError("Publicação não encontrada")
  await prisma.publicacao.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}

/** Vincula uma publicação 'a vincular' a um Processo existente (por escolha humana). */
export async function vincularPublicacao(pubId: number, processoId: number) {
  const [pub, proc] = await Promise.all([
    prisma.publicacao.findFirst({ where: { id: pubId, excluidoEm: null }, select: { id: true } }),
    prisma.processo.findFirst({ where: { id: processoId, excluidoEm: null }, select: { id: true } }),
  ])
  if (!pub) throw new UserError("Publicação não encontrada")
  if (!proc) throw new UserError("Processo não encontrado")
  return prisma.publicacao.update({ where: { id: pubId }, data: { processoId } })
}

// ── Anotação ─────────────────────────────────────────────────────────────────
export interface AnotacaoCreate {
  conteudo: string
  interno?: boolean
  casoId?: number | null
  processoId?: number | null
  autor: string
}

export async function createAnotacao(input: AnotacaoCreate) {
  const casoId = optId(input.casoId)
  const processoId = optId(input.processoId)
  if (!casoId && !processoId) throw new UserError("Anotação deve pertencer a um caso ou processo")
  return prisma.anotacao.create({
    data: {
      casoId,
      processoId,
      autor: reqStr(input.autor, "autor"),
      conteudo: reqStr(input.conteudo, "conteúdo"),
      interno: input.interno === undefined ? true : !!input.interno,
    },
  })
}

export async function deleteAnotacao(id: number) {
  const existing = await prisma.anotacao.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Anotação não encontrada")
  await prisma.anotacao.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}

// ── Feriado / Suspensão (config) ───────────────────────────────────────────────
export interface FeriadoCreate {
  data: string
  descricao: string
  abrangencia?: string
  uf?: string | null
  tribunal?: string | null
}

export async function createFeriado(input: FeriadoCreate) {
  const data = toDate(input.data)
  if (!data) throw new UserError("Data inválida")
  try {
    return await prisma.feriado.create({
      data: {
        data,
        descricao: reqStr(input.descricao, "descrição"),
        abrangencia: clampUnion(input.abrangencia, ["nacional", "estadual", "forense", "municipal"] as const, "nacional"),
        uf: optStr(input.uf)?.toUpperCase() ?? null,
        tribunal: optStr(input.tribunal),
      },
    })
  } catch (e) {
    if (isUniqueError(e, "data")) throw new UserError("Feriado já cadastrado para essa data/abrangência")
    throw e
  }
}

export async function deleteFeriado(id: number) {
  const existing = await prisma.feriado.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new UserError("Feriado não encontrado")
  await prisma.feriado.delete({ where: { id } })
  return { id }
}

export interface SuspensaoCreate {
  de: string
  ate: string
  descricao: string
  jurisdicao?: string | null
}

export async function createSuspensao(input: SuspensaoCreate) {
  const de = toDate(input.de)
  const ate = toDate(input.ate)
  if (!de || !ate) throw new UserError("Datas inválidas")
  if (de.getTime() > ate.getTime()) throw new UserError("Início deve ser anterior ao fim")
  return prisma.suspensaoPrazo.create({
    data: { de, ate, descricao: reqStr(input.descricao, "descrição"), jurisdicao: optStr(input.jurisdicao) },
  })
}

export async function deleteSuspensao(id: number) {
  const existing = await prisma.suspensaoPrazo.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new UserError("Suspensão não encontrada")
  await prisma.suspensaoPrazo.delete({ where: { id } })
  return { id }
}

// ── Notificação ────────────────────────────────────────────────────────────────
export async function marcarNotificacaoLida(id: number, userEmail: string) {
  const notif = await prisma.notificacao.findUnique({ where: { id }, select: { id: true, userEmail: true } })
  if (!notif || notif.userEmail !== userEmail) throw new UserError("Notificação não encontrada")
  const updated = await prisma.notificacao.update({ where: { id }, data: { lida: true } })
  emitNotificacao(userEmail, { kind: "lida", id }) // sincroniza o badge nas outras abas
  return updated
}

// ── Documento (versão) — reuses the AnexoStore abstraction for the file bytes ──
export interface DocumentoVersaoCreate {
  nome?: string | null
  formato?: string | null
  payload?: unknown
  dataBase64?: string
  mimeType?: string | null
  criadoPor?: string | null
}

export async function criarVersaoDocumento(documentoId: number, input: DocumentoVersaoCreate) {
  const doc = await prisma.documento.findUnique({ where: { id: documentoId }, select: { id: true } })
  if (!doc) throw new UserError("Documento não encontrado")
  const last = await prisma.documentoVersao.findFirst({
    where: { documentoId },
    orderBy: { versao: "desc" },
    select: { versao: true },
  })
  const versao = (last?.versao ?? 0) + 1

  let storage = "db"
  let dataStored: string | null = null
  let ref: string | null = null
  let tamanho: number | null = null
  if (input.dataBase64) {
    const base64 = input.dataBase64.includes(",") ? input.dataBase64.split(",").pop()! : input.dataBase64
    tamanho = Math.floor((base64.length * 3) / 4)
    const store = getAnexoStore()
    const saved = await store.salvar({
      nome: optStr(input.nome) ?? `v${versao}`,
      mimeType: optStr(input.mimeType) ?? "application/octet-stream",
      dataBase64: base64,
    })
    storage = saved.storage
    dataStored = saved.data
    ref = saved.ref
  }

  return prisma.documentoVersao.create({
    data: {
      documentoId,
      versao,
      nome: optStr(input.nome),
      formato: optStr(input.formato),
      payload: input.payload === undefined ? null : JSON.stringify(input.payload).slice(0, 200_000),
      storage,
      data: dataStored,
      ref,
      tamanho,
      mimeType: optStr(input.mimeType),
      criadoPor: optStr(input.criadoPor),
    },
  })
}

// ── OAB monitorada (captura CNJ — Comunica/DJEN) ──────────────────────────────
export interface OabCreate {
  numero: string
  uf: string
  advogadoNome?: string | null
  ativo?: boolean
}

export async function createOab(input: OabCreate) {
  const numero = reqStr(input.numero, "Número da OAB").replace(/\D/g, "")
  if (!numero) throw new UserError("Número da OAB inválido")
  const uf = reqStr(input.uf, "UF").toUpperCase().slice(0, 2)
  try {
    return await prisma.oabMonitorada.create({
      data: { numero, uf, advogadoNome: optStr(input.advogadoNome), ativo: input.ativo ?? true },
    })
  } catch (e) {
    if (isUniqueError(e, "numero")) throw new UserError("Esta OAB já está cadastrada")
    throw e
  }
}

export interface OabPatch {
  advogadoNome?: string | null
  ativo?: boolean
}

export async function updateOab(id: number, patch: OabPatch) {
  const data: { advogadoNome?: string | null; ativo?: boolean } = {}
  if (patch.advogadoNome !== undefined) data.advogadoNome = optStr(patch.advogadoNome)
  if (patch.ativo !== undefined) data.ativo = !!patch.ativo
  try {
    return await prisma.oabMonitorada.update({ where: { id }, data })
  } catch {
    throw new UserError("OAB não encontrada")
  }
}

export async function deleteOab(id: number) {
  try {
    return await prisma.oabMonitorada.delete({ where: { id } })
  } catch {
    throw new UserError("OAB não encontrada")
  }
}
