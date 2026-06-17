// Collection-memory PRISMA layer — per-cliente notes + collection directives,
// the effective-state derivation, and the "should we silence this collection?"
// decision shared by the action plan (briefing.ts) and the próximo-passo queue.
// Pure state machine lives in cobranca-core.ts. SERVER ONLY.
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { addDiasISO, hojeISO } from "@/lib/lexia/agent/datas"
import {
  COBRANCA_ATIVA,
  estadoCobranca,
  type AnotacaoRow,
  type CobrancaAcao,
  type EstadoCobranca,
} from "./cobranca-core"

export type { AnotacaoRow, EstadoCobranca, CobrancaAcao } from "./cobranca-core"

const isoDate = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null)

/** Date at local noon (TZ-safe, mirrors the prazo storage convention). */
function noon(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

function toRow(r: {
  id: number
  autor: string
  conteudo: string
  tipo: string
  acao: string | null
  ate: Date | null
  fixado: boolean
  createdAt: Date
}): AnotacaoRow {
  return {
    id: r.id,
    autor: r.autor,
    conteudo: r.conteudo,
    tipo: r.tipo === "cobranca" ? "cobranca" : "nota",
    acao: (r.acao as CobrancaAcao | null) ?? null,
    ate: isoDate(r.ate),
    fixado: r.fixado,
    createdAt: r.createdAt.toISOString(),
  }
}

const SELECT = {
  id: true,
  autor: true,
  conteudo: true,
  tipo: true,
  acao: true,
  ate: true,
  fixado: true,
  createdAt: true,
} as const

// ── reads ────────────────────────────────────────────────────────────────────

/** Full notes timeline of a cliente (fixadas first, then most recent). */
export async function getAnotacoesCliente(clienteId: number): Promise<AnotacaoRow[]> {
  const rows = await prisma.clienteAnotacao.findMany({
    where: { clienteId, excluidoEm: null },
    select: SELECT,
    orderBy: [{ fixado: "desc" }, { createdAt: "desc" }],
  })
  return rows.map(toRow)
}

/** Notes + derived collection state for ONE cliente (powers detalhe_cliente / UI). */
export async function getCobrancaCliente(clienteId: number): Promise<{ estado: EstadoCobranca; anotacoes: AnotacaoRow[] }> {
  const anotacoes = await getAnotacoesCliente(clienteId)
  return { estado: estadoCobranca(anotacoes, hojeISO()), anotacoes }
}

/** Effective collection state for many clientes at once (batch — for the plano). */
export async function getEstadosCobranca(clienteIds: number[]): Promise<Map<number, EstadoCobranca>> {
  const out = new Map<number, EstadoCobranca>()
  const ids = [...new Set(clienteIds.filter((id) => Number.isInteger(id)))]
  if (!ids.length) return out
  const rows = await prisma.clienteAnotacao.findMany({
    where: { clienteId: { in: ids }, excluidoEm: null, tipo: "cobranca" },
    select: { ...SELECT, clienteId: true },
    orderBy: { createdAt: "desc" },
  })
  const byCliente = new Map<number, AnotacaoRow[]>()
  for (const r of rows) {
    const arr = byCliente.get(r.clienteId) ?? []
    arr.push(toRow(r))
    byCliente.set(r.clienteId, arr)
  }
  const hoje = hojeISO()
  for (const id of ids) out.set(id, estadoCobranca(byCliente.get(id) ?? [], hoje))
  return out
}

/** Most recent paid 'in' lançamento per cliente within the window (auto-suavizar). */
export async function getPagamentosRecentes(
  clienteIds: number[],
  diasJanela = 30,
): Promise<Map<number, { ultimoISO: string; valorCents: number }>> {
  const out = new Map<number, { ultimoISO: string; valorCents: number }>()
  const ids = [...new Set(clienteIds.filter((id) => Number.isInteger(id)))]
  if (!ids.length) return out
  const desde = noon(addDiasISO(hojeISO(), -diasJanela))
  const rows = await prisma.lancamento.findMany({
    where: {
      clienteId: { in: ids },
      tipo: "entrada",
      isAnomalia: false,
      status: "feito",
      dataPagamento: { gte: desde },
    },
    select: { clienteId: true, valorCents: true, dataPagamento: true },
    orderBy: { dataPagamento: "desc" },
  })
  for (const r of rows) {
    if (r.clienteId == null || out.has(r.clienteId) || !r.dataPagamento) continue
    out.set(r.clienteId, { ultimoISO: r.dataPagamento.toISOString().slice(0, 10), valorCents: Math.abs(r.valorCents) })
  }
  return out
}

/** Why a cliente's collection is silenced (paused / suspended / paid recently). */
export interface Silencio {
  silenciado: boolean
  razao: "suspenso" | "pausado" | "pagou" | null
  texto: string | null
  ate: string | null
}

const fmtBR = (iso: string): string => {
  const [y, m, d] = iso.split("-")
  return d && m && y ? `${d}/${m}/${y}` : iso
}

/** The single decision both the plano and the próximo-passo use. */
export function avaliarSilencio(estado: EstadoCobranca, pagamento?: { ultimoISO: string } | null): Silencio {
  if (estado.status === "suspenso") {
    return { silenciado: true, razao: "suspenso", texto: estado.motivo ?? "Marcado como não cobrar", ate: null }
  }
  if (estado.status === "pausado") {
    const base = estado.ate ? `Cobrança pausada até ${fmtBR(estado.ate)}` : "Cobrança pausada"
    return { silenciado: true, razao: "pausado", texto: estado.motivo ? `${base} — ${estado.motivo}` : base, ate: estado.ate }
  }
  if (pagamento) {
    return { silenciado: true, razao: "pagou", texto: `Voltou a pagar (último em ${fmtBR(pagamento.ultimoISO)})`, ate: null }
  }
  return { silenciado: false, razao: null, texto: null, ate: null }
}

/** Bounded summary of who's currently in "espera" (for the AI briefing context). */
export interface CobrancaResumo {
  pausados: { nome: string; ate: string | null; motivo: string | null }[]
  suspensos: { nome: string; motivo: string | null }[]
}
export async function getCobrancaResumo(limite = 12): Promise<CobrancaResumo> {
  const rows = await prisma.clienteAnotacao.findMany({
    where: { excluidoEm: null, tipo: "cobranca" },
    select: { ...SELECT, clienteId: true, cliente: { select: { nome: true } } },
    orderBy: { createdAt: "desc" },
  })
  const byCliente = new Map<number, { nome: string; notas: AnotacaoRow[] }>()
  for (const r of rows) {
    const cur = byCliente.get(r.clienteId) ?? { nome: r.cliente?.nome ?? "—", notas: [] }
    cur.notas.push(toRow(r))
    byCliente.set(r.clienteId, cur)
  }
  const hoje = hojeISO()
  const pausados: CobrancaResumo["pausados"] = []
  const suspensos: CobrancaResumo["suspensos"] = []
  for (const { nome, notas } of byCliente.values()) {
    const e = estadoCobranca(notas, hoje)
    if (e.status === "pausado") pausados.push({ nome, ate: e.ate, motivo: e.motivo })
    else if (e.status === "suspenso") suspensos.push({ nome, motivo: e.motivo })
  }
  return { pausados: pausados.slice(0, limite), suspensos: suspensos.slice(0, limite) }
}

/** Local midnight today (overdue boundary; mirrors the plano de ação). */
function startOfToday(): Date {
  const [y, m, d] = hojeISO().split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export interface DevedorDash {
  id: number
  nome: string
  valorCents: number
}
export interface DevedorEspera {
  id: number
  nome: string
  valorCents: number
  razao: "suspenso" | "pausado" | "pagou"
  texto: string
}

/**
 * Overdue receivables grouped per cliente, split into who is still CHARGEABLE
 * (`ativos`, sorted by value) vs who is silenced (`emEspera`: paused / "não
 * cobrar" / paid recently). The single source of truth for "who owes us and may
 * we chase them" — used by the briefing AI context and the office dashboard so
 * they agree with getPlanoAcao/getProximoPasso.
 */
export async function getDevedoresDashboard(limite = 6): Promise<{ ativos: DevedorDash[]; emEspera: DevedorEspera[] }> {
  const rows = await prisma.lancamento.findMany({
    where: { tipo: "entrada", isAnomalia: false, status: "aberto", dataVencimento: { lt: startOfToday() } },
    select: { valorCents: true, cliente: { select: { id: true, nome: true } } },
  })
  const byId = new Map<number, { nome: string; sum: number }>()
  for (const r of rows) {
    if (!r.cliente) continue
    const cur = byId.get(r.cliente.id) ?? { nome: r.cliente.nome, sum: 0 }
    cur.sum += r.valorCents
    byId.set(r.cliente.id, cur)
  }
  const ids = [...byId.keys()]
  const [estados, pagamentos] = await Promise.all([getEstadosCobranca(ids), getPagamentosRecentes(ids, 30)])
  const ativos: DevedorDash[] = []
  const emEspera: DevedorEspera[] = []
  for (const [id, v] of byId) {
    const sil = avaliarSilencio(estados.get(id) ?? COBRANCA_ATIVA, pagamentos.get(id))
    if (sil.silenciado && sil.razao) {
      emEspera.push({ id, nome: v.nome, valorCents: v.sum, razao: sil.razao, texto: sil.texto ?? "" })
    } else {
      ativos.push({ id, nome: v.nome, valorCents: v.sum })
    }
  }
  ativos.sort((a, b) => b.valorCents - a.valorCents)
  emEspera.sort((a, b) => b.valorCents - a.valorCents)
  return { ativos: ativos.slice(0, limite), emEspera: emEspera.slice(0, 12) }
}

// ── writes ───────────────────────────────────────────────────────────────────

async function assertCliente(clienteId: number): Promise<void> {
  const c = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } })
  if (!c) throw new UserError("Cliente não encontrado")
}

export interface AnotarInput {
  autor: string
  conteudo: string
  fixado?: boolean
  tipo?: "nota" | "cobranca"
  acao?: CobrancaAcao | null
  ate?: string | null // ISO date
}

/** Append a note (free context or a collection directive) to a cliente's timeline. */
export async function anotarCliente(clienteId: number, input: AnotarInput): Promise<AnotacaoRow> {
  await assertCliente(clienteId)
  const conteudo = input.conteudo.trim()
  if (!conteudo) throw new UserError("A anotação não pode ficar vazia")
  const tipo = input.tipo === "cobranca" ? "cobranca" : "nota"
  const row = await prisma.clienteAnotacao.create({
    data: {
      clienteId,
      autor: input.autor || "—",
      conteudo,
      tipo,
      acao: tipo === "cobranca" ? (input.acao ?? null) : null,
      ate: tipo === "cobranca" && input.acao === "pausar" && input.ate ? noon(input.ate) : null,
      fixado: !!input.fixado,
    },
    select: SELECT,
  })
  return toRow(row)
}

/** Pause collection for N days (default 30) or until a given ISO date, with a reason. */
export async function pausarCobranca(
  clienteId: number,
  input: { autor: string; motivo: string; dias?: number; ate?: string | null },
): Promise<AnotacaoRow> {
  const ate = input.ate ?? addDiasISO(hojeISO(), input.dias && input.dias > 0 ? input.dias : 30)
  return anotarCliente(clienteId, { autor: input.autor, conteudo: input.motivo, tipo: "cobranca", acao: "pausar", ate })
}

/** Stop chasing this cliente indefinitely ("não cobrar mais"). Reversible via retomar. */
export async function suspenderCobranca(clienteId: number, input: { autor: string; motivo: string }): Promise<AnotacaoRow> {
  return anotarCliente(clienteId, { autor: input.autor, conteudo: input.motivo, tipo: "cobranca", acao: "suspender" })
}

/** Reactivate collection (cancels a previous pause/suspend). */
export async function retomarCobranca(clienteId: number, input: { autor: string; motivo?: string }): Promise<AnotacaoRow> {
  return anotarCliente(clienteId, {
    autor: input.autor,
    conteudo: input.motivo?.trim() || "Cobrança retomada",
    tipo: "cobranca",
    acao: "retomar",
  })
}

/** Soft-delete a note (keeps history; drops it from reads). Scoped to the
 *  cliente so one cliente's id can't be used to delete another's note (IDOR). */
export async function excluirAnotacao(clienteId: number, id: number): Promise<{ id: number }> {
  const row = await prisma.clienteAnotacao.findFirst({
    where: { id, clienteId, excluidoEm: null },
    select: { id: true },
  })
  if (!row) throw new UserError("Anotação não encontrada")
  await prisma.clienteAnotacao.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}
