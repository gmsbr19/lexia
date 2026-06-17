// Finance query layer — pure async functions over Prisma, the single place
// that knows the financial semantics. Every revenue/cost/DRE query excludes
// `isAnomalia` rows so all screens stay consistent. SERVER ONLY (imports
// prisma) — never import this from a "use client" module.
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { computeAcertoSocios, emptyAcerto } from "./acerto"
import { BUCKET_META, BUCKET_ORDER } from "./composicao"
import { currentMes, inScope, periodRange } from "./periodo"
import type {
  AcertoSocioLado,
  AcertoSocios,
  AgingBucket,
  CasoRow,
  CasoSemFeeRow,
  ClienteRow,
  SocioConta,
  ComposicaoBucket,
  CompositionSlice,
  ContaBalanceRow,
  ContaKind,
  ContaOption,
  ContasBalanco,
  DreRow,
  FluxoPoint,
  FluxoResumo,
  HonorarioDetail,
  HonorarioRow,
  HonorarioStatus,
  HonorarioTotals,
  IdNome,
  ImportSummary,
  Kpis,
  LancamentoRow,
  MonthlyRevenuePoint,
  MonthlySummary,
  Periodo,
  ReceivableRow,
  TransferenciaRow,
} from "./types"

// ── date helpers ─────────────────────────────────────────────────────────────
const MES_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function startOfToday(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function monthRange(d = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
  }
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MES_ABBR[m - 1]}/${String(y).slice(2)}`
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}
/** Resolve a "YYYY-MM" string into a Date at day 1 of that month (now if absent). */
function mesToDate(mes?: string | null): Date {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number)
    return new Date(y, m - 1, 1)
  }
  return new Date()
}

const REVENUE = { tipo: "entrada", isAnomalia: false } as const
// Balance-relevant rows: realized (feito) movements, excluding balance artifacts
// (valor_inicial / "Compensação Sistema") BUT re-including internal transfers,
// which are flagged isAnomalia=true yet still move an account's balance.
const BALANCE_MOV: Prisma.LancamentoWhereInput = {
  status: "feito",
  contaId: { not: null },
  OR: [{ isAnomalia: false }, { subTipo: "transferencia" }],
}

// ── KPIs ─────────────────────────────────────────────────────────────────────
export async function getKpis(mes?: string): Promise<Kpis> {
  const ref = mesToDate(mes)
  const { start, end } = monthRange(ref)
  const { start: prevStart, end: prevEnd } = monthRange(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))
  // "vencido"/"a receber" are live snapshots — always relative to the real today,
  // not the month being viewed.
  const today = startOfToday()

  const sumReceb = (s: Date, e: Date) =>
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { ...REVENUE, status: "feito", dataPagamento: { gte: s, lt: e } },
    })
  const sumSaida = (s: Date, e: Date) =>
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { tipo: "saida", isAnomalia: false, status: "feito", dataPagamento: { gte: s, lt: e } },
    })

  const [recebido, recebidoPrev, aReceber, aReceberCount, vencido, vencidoClientes, saidas, saidasPrev] =
    await Promise.all([
      sumReceb(start, end),
      sumReceb(prevStart, prevEnd),
      prisma.lancamento.aggregate({ _sum: { valorCents: true }, where: { ...REVENUE, status: "aberto" } }),
      prisma.lancamento.count({ where: { ...REVENUE, status: "aberto" } }),
      prisma.lancamento.aggregate({
        _sum: { valorCents: true },
        where: { ...REVENUE, status: "aberto", dataVencimento: { lt: today } },
      }),
      prisma.lancamento.findMany({
        where: { ...REVENUE, status: "aberto", dataVencimento: { lt: today }, clienteId: { not: null } },
        select: { clienteId: true },
        distinct: ["clienteId"],
      }),
      sumSaida(start, end),
      sumSaida(prevStart, prevEnd),
    ])

  const recebidoMesCents = recebido._sum.valorCents ?? 0
  const recebidoPrevCents = recebidoPrev._sum.valorCents ?? 0
  const saidasMesCents = Math.abs(saidas._sum.valorCents ?? 0)
  const saidasPrevCents = Math.abs(saidasPrev._sum.valorCents ?? 0)
  const margemPct = recebidoMesCents > 0 ? ((recebidoMesCents - saidasMesCents) / recebidoMesCents) * 100 : null
  const margemPrev = recebidoPrevCents > 0 ? ((recebidoPrevCents - saidasPrevCents) / recebidoPrevCents) * 100 : null

  return {
    recebidoMesCents,
    recebidoDeltaPct:
      recebidoPrevCents > 0 ? ((recebidoMesCents - recebidoPrevCents) / recebidoPrevCents) * 100 : null,
    aReceberCents: aReceber._sum.valorCents ?? 0,
    aReceberCount,
    vencidoCents: vencido._sum.valorCents ?? 0,
    vencidoClientes: vencidoClientes.length,
    saidasMesCents,
    margemPct,
    margemDeltaPP: margemPct !== null && margemPrev !== null ? margemPct - margemPrev : null,
  }
}

// ── overdue snapshot (proactive LexIA-bar hint) ──────────────────────────────
// Mirrors the "vencido" filter in getKpis: open receivables past due, excluding
// anomalias (REVENUE already carries isAnomalia:false + tipo entrada).
export async function getVencidosResumo(): Promise<{ count: number; totalCents: number }> {
  const where = { ...REVENUE, status: "aberto", dataVencimento: { lt: startOfToday() } }
  const [agg, count] = await Promise.all([
    prisma.lancamento.aggregate({ _sum: { valorCents: true }, where }),
    prisma.lancamento.count({ where }),
  ])
  return { count, totalCents: agg._sum.valorCents ?? 0 }
}

// ── revenue series (received vs receivable, by month) ────────────────────────
export async function getRevenueSeries(): Promise<MonthlyRevenuePoint[]> {
  const rows = await prisma.lancamento.findMany({
    where: REVENUE,
    select: { status: true, valorCents: true, dataPagamento: true, dataVencimento: true, dataLancamento: true },
  })
  const map = new Map<string, { recebido: number; aReceber: number }>()
  const bump = (key: string, field: "recebido" | "aReceber", v: number) => {
    const cur = map.get(key) ?? { recebido: 0, aReceber: 0 }
    cur[field] += v
    map.set(key, cur)
  }
  for (const r of rows) {
    if (r.status === "feito") {
      const d = r.dataPagamento ?? r.dataLancamento
      if (d) bump(monthKey(d), "recebido", r.valorCents)
    } else {
      const d = r.dataVencimento ?? r.dataLancamento
      if (d) bump(monthKey(d), "aReceber", r.valorCents)
    }
  }
  const nowKey = monthKey(new Date())
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      label: monthLabel(month),
      recebidoCents: v.recebido,
      aReceberCents: v.aReceber,
      isFuture: month > nowKey,
    }))
}

// ── composição (fee composition) ─────────────────────────────────────────────
export async function getComposition(): Promise<CompositionSlice[]> {
  const grouped = await prisma.honorario.groupBy({ by: ["tipo"], _sum: { valorCents: true } })
  const byBucket = new Map<ComposicaoBucket, number>()
  for (const g of grouped) {
    const bucket = (g.tipo ?? "avista") as ComposicaoBucket
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + (g._sum.valorCents ?? 0))
  }
  const total = [...byBucket.values()].reduce((a, b) => a + b, 0)
  return BUCKET_ORDER.map((bucket) => {
    const valorCents = byBucket.get(bucket) ?? 0
    return {
      bucket,
      label: BUCKET_META[bucket].label,
      color: BUCKET_META[bucket].color,
      valorCents,
      pct: total > 0 ? (valorCents / total) * 100 : 0,
    }
  })
}

// ── a receber & inadimplência ────────────────────────────────────────────────
export async function getReceivablesAging(): Promise<AgingBucket[]> {
  const today = startOfToday()
  const rows = await prisma.lancamento.findMany({
    where: { ...REVENUE, status: "aberto" },
    select: { valorCents: true, dataVencimento: true },
  })
  const buckets: Record<AgingBucket["key"], AgingBucket> = {
    a_vencer: { key: "a_vencer", label: "A vencer", valorCents: 0, count: 0 },
    d1_30: { key: "d1_30", label: "1–30 dias", valorCents: 0, count: 0 },
    d31_60: { key: "d31_60", label: "31–60 dias", valorCents: 0, count: 0 },
    d60_plus: { key: "d60_plus", label: "60+ dias", valorCents: 0, count: 0 },
  }
  for (const r of rows) {
    const atraso = r.dataVencimento ? daysBetween(today, r.dataVencimento) : -1
    const key: AgingBucket["key"] =
      atraso <= 0 ? "a_vencer" : atraso <= 30 ? "d1_30" : atraso <= 60 ? "d31_60" : "d60_plus"
    buckets[key].valorCents += r.valorCents
    buckets[key].count += 1
  }
  return [buckets.a_vencer, buckets.d1_30, buckets.d31_60, buckets.d60_plus]
}

export async function getOverdue(limit = 50): Promise<ReceivableRow[]> {
  const today = startOfToday()
  const rows = await prisma.lancamento.findMany({
    where: { ...REVENUE, status: "aberto", dataVencimento: { lt: today } },
    select: {
      id: true,
      descricao: true,
      valorCents: true,
      dataVencimento: true,
      cliente: { select: { nome: true } },
      caso: { select: { titulo: true } },
    },
    orderBy: { dataVencimento: "asc" },
    take: limit,
  })
  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao ?? "—",
    cliente: r.cliente?.nome ?? null,
    caso: r.caso?.titulo ?? null,
    vencimento: r.dataVencimento ? r.dataVencimento.toISOString() : null,
    valorCents: r.valorCents,
    diasAtraso: r.dataVencimento ? daysBetween(today, r.dataVencimento) : 0,
    vencido: true,
  }))
}

// ── DRE + custos ─────────────────────────────────────────────────────────────
export async function getDre(mes?: string, periodo: Periodo = "mes"): Promise<DreRow[]> {
  const { start, end } = periodRange(mes ?? currentMes(), periodo)
  const [receita, custos, proLabore] = await Promise.all([
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { ...REVENUE, status: "feito", dataPagamento: { gte: start, lt: end } },
    }),
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { tipo: "saida", isAnomalia: false, status: "feito", dataPagamento: { gte: start, lt: end } },
    }),
    prisma.custoFixo.aggregate({ _sum: { valorCents: true }, where: { ativo: true, categoria: "pro_labore" } }),
  ])
  const receitaCents = receita._sum.valorCents ?? 0
  const custosCents = Math.abs(custos._sum.valorCents ?? 0)
  const proLaboreCents = proLabore._sum.valorCents ?? 0
  const resultadoCents = receitaCents - custosCents - proLaboreCents
  return [
    { label: "Receita recebida", valorCents: receitaCents, kind: "receita" },
    { label: "(−) Custos operacionais", valorCents: -custosCents, kind: "custo" },
    { label: "(−) Pró-labore", valorCents: -proLaboreCents, kind: "custo" },
    { label: "Resultado", valorCents: resultadoCents, kind: "resultado" },
  ]
}

export async function getCostsByCategoria(
  mes?: string,
  periodo: Periodo = "mes",
): Promise<{ nome: string; cor: string | null; valorCents: number }[]> {
  const { start, end } = periodRange(mes ?? currentMes(), periodo)
  const rows = await prisma.lancamento.findMany({
    where: { tipo: "saida", isAnomalia: false, status: "feito", dataPagamento: { gte: start, lt: end } },
    select: { valorCents: true, categoria: { select: { nome: true, cor: true } } },
  })
  const map = new Map<string, { nome: string; cor: string | null; valorCents: number }>()
  for (const r of rows) {
    const nome = r.categoria?.nome ?? "Sem categoria"
    const cur = map.get(nome) ?? { nome, cor: r.categoria?.cor ?? null, valorCents: 0 }
    cur.valorCents += Math.abs(r.valorCents)
    map.set(nome, cur)
  }
  return [...map.values()].sort((a, b) => b.valorCents - a.valorCents)
}

export async function getBreakEven(): Promise<{ custoFixoMensalCents: number; receitaMediaMensalCents: number }> {
  const custoFixo = await prisma.custoFixo.aggregate({ _sum: { valorCents: true }, where: { ativo: true } })
  // average monthly received over the last 6 calendar months
  const series = await getRevenueSeries()
  const past = series.filter((p) => !p.isFuture).slice(-6)
  const avg = past.length ? Math.round(past.reduce((a, p) => a + p.recebidoCents, 0) / past.length) : 0
  return { custoFixoMensalCents: custoFixo._sum.valorCents ?? 0, receitaMediaMensalCents: avg }
}

// ── casos sem fee ──────────────────────────────────────────────────────────────
export async function getCasosSemFee(): Promise<CasoSemFeeRow[]> {
  const rows = await prisma.caso.findMany({
    where: { status: "Ativo", excluidoEm: null, honorarios: { none: {} } },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      responsavel: true,
      valorCausaCents: true,
      ultimaMovimentacao: true,
      clientePrincipalId: true,
      clientePrincipal: { select: { nome: true } },
    },
    orderBy: { ultimaMovimentacao: "desc" },
  })
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    cliente: r.clientePrincipal?.nome ?? null,
    clienteId: r.clientePrincipalId,
    tipo: r.tipo as CasoSemFeeRow["tipo"],
    responsavel: r.responsavel,
    ultimaMovimentacao: r.ultimaMovimentacao ? r.ultimaMovimentacao.toISOString() : null,
    valorCausaCents: r.valorCausaCents,
  }))
}

// ── importação ────────────────────────────────────────────────────────────────
export async function getImportSummary(): Promise<ImportSummary> {
  const [clientes, casos, honorarios, lancamentos, categorias, contas, centrosCusto, anomalias, casosSemFee] =
    await Promise.all([
      prisma.cliente.count(),
      prisma.caso.count(),
      prisma.honorario.count(),
      prisma.lancamento.count(),
      prisma.categoria.count(),
      prisma.conta.count(),
      prisma.centroCusto.count(),
      prisma.lancamento.count({ where: { isAnomalia: true } }),
      prisma.caso.count({ where: { status: "Ativo", honorarios: { none: {} } } }),
    ])
  return { clientes, casos, honorarios, lancamentos, categorias, contas, centrosCusto, anomalias, casosSemFee }
}

export async function getFlaggedLancamentos(): Promise<ReceivableRow[]> {
  const rows = await prisma.lancamento.findMany({
    where: { isAnomalia: true },
    select: {
      id: true,
      descricao: true,
      valorCents: true,
      dataLancamento: true,
      cliente: { select: { nome: true } },
    },
    orderBy: { valorCents: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao ?? "—",
    cliente: r.cliente?.nome ?? null,
    caso: null,
    vencimento: r.dataLancamento ? r.dataLancamento.toISOString() : null,
    valorCents: r.valorCents,
    diasAtraso: 0,
    vencido: false,
  }))
}

// ── clientes (MVP list) ─────────────────────────────────────────────────────
export async function getClientes(): Promise<ClienteRow[]> {
  const rows = await prisma.cliente.findMany({
    select: {
      id: true,
      nome: true,
      tipo: true,
      classificacao: true,
      cpfCnpj: true,
      cidade: true,
      uf: true,
      _count: { select: { casos: true } },
    },
    orderBy: { nome: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    tipo: r.tipo as ClienteRow["tipo"],
    classificacao: r.classificacao as ClienteRow["classificacao"],
    cpfCnpj: r.cpfCnpj,
    cidade: r.cidade,
    uf: r.uf,
    numCasos: r._count.casos,
  }))
}

// ── contratos / honorários (MVP list) ────────────────────────────────────────
export async function getHonorarios(): Promise<HonorarioRow[]> {
  const rows = await prisma.honorario.findMany({
    select: {
      id: true,
      descricao: true,
      dataVencimento: true,
      valorCents: true,
      status: true,
      tipo: true,
      dataPagamento: true,
      clienteId: true,
      casoId: true,
      contaId: true,
      lancamentoId: true,
      cliente: { select: { nome: true } },
      caso: { select: { titulo: true } },
      conta: { select: { nome: true } },
    },
    orderBy: { dataVencimento: "desc" },
  })
  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    cliente: r.cliente?.nome ?? null,
    clienteId: r.clienteId,
    caso: r.caso?.titulo ?? null,
    casoId: r.casoId,
    vencimento: r.dataVencimento ? r.dataVencimento.toISOString() : null,
    valorCents: r.valorCents,
    status: (r.status ?? null) as HonorarioStatus | null,
    tipo: (r.tipo ?? null) as HonorarioRow["tipo"],
    dataPagamento: r.dataPagamento ? r.dataPagamento.toISOString() : null,
    contaId: r.contaId,
    conta: r.conta?.nome ?? null,
    lancamentoId: r.lancamentoId,
  }))
}

// ── contrato modal: honorário detail + série de parcelas ─────────────────────
const HON_ROW_SELECT = {
  id: true,
  descricao: true,
  dataVencimento: true,
  valorCents: true,
  status: true,
  tipo: true,
  dataPagamento: true,
  clienteId: true,
  casoId: true,
  contaId: true,
  lancamentoId: true,
  cliente: { select: { nome: true } },
  caso: { select: { titulo: true } },
  conta: { select: { nome: true } },
} satisfies Prisma.HonorarioSelect

type HonRowRecord = Prisma.HonorarioGetPayload<{ select: typeof HON_ROW_SELECT }>

function toHonorarioRow(r: HonRowRecord): HonorarioRow {
  return {
    id: r.id,
    descricao: r.descricao,
    cliente: r.cliente?.nome ?? null,
    clienteId: r.clienteId,
    caso: r.caso?.titulo ?? null,
    casoId: r.casoId,
    vencimento: r.dataVencimento ? r.dataVencimento.toISOString() : null,
    valorCents: r.valorCents,
    status: (r.status ?? null) as HonorarioStatus | null,
    tipo: (r.tipo ?? null) as HonorarioRow["tipo"],
    dataPagamento: r.dataPagamento ? r.dataPagamento.toISOString() : null,
    contaId: r.contaId,
    conta: r.conta?.nome ?? null,
    lancamentoId: r.lancamentoId,
  }
}

/** Parcela markers stripped for série grouping: "Honorários (3/12)" → "Honorários". */
function descricaoBase(descricao: string): string {
  return descricao
    .replace(/\s*[(\[]?\d{1,3}\s*\/\s*\d{1,3}[)\]]?\s*$/, "")
    .replace(/\s*[-·–]\s*parcela.*$/i, "")
    .trim()
    .toLowerCase()
}

export async function getHonorarioDetail(id: number): Promise<HonorarioDetail | null> {
  const r = await prisma.honorario.findUnique({
    where: { id },
    select: {
      ...HON_ROW_SELECT,
      valorLiquidoCents: true,
      responsavel: true,
      pagamento: true,
      processoTitulo: true,
    },
  })
  if (!r) return null

  // Série: siblings sharing cliente+caso+tipo+descrição-base (parcelado/recorrente only).
  let serie: HonorarioRow[] = []
  if (r.tipo === "parcelado" || r.tipo === "recorrente") {
    const siblings = await prisma.honorario.findMany({
      where: { tipo: r.tipo, clienteId: r.clienteId, casoId: r.casoId },
      select: HON_ROW_SELECT,
      orderBy: { dataVencimento: "asc" },
    })
    const base = descricaoBase(r.descricao)
    serie = siblings
      .filter((s) => !base || descricaoBase(s.descricao) === base)
      .map(toHonorarioRow)
    if (serie.length <= 1) serie = []
  }

  // Payment schedule: the linked lançamento's recorrência série (parent + filhos).
  let parcelas: LancamentoRow[] = []
  if (r.lancamentoId) {
    const linked = await prisma.lancamento.findUnique({
      where: { id: r.lancamentoId },
      select: { id: true, recorrenteParentId: true },
    })
    if (linked) {
      const rootId = linked.recorrenteParentId ?? linked.id
      const ledger = await prisma.lancamento.findMany({
        where: { OR: [{ id: rootId }, { recorrenteParentId: rootId }] },
        select: {
          id: true,
          tipo: true,
          status: true,
          descricao: true,
          valorCents: true,
          dataVencimento: true,
          dataLancamento: true,
          dataPagamento: true,
          pagoPara: true,
          contaId: true,
          cliente: { select: { nome: true } },
          caso: { select: { titulo: true } },
          categoria: { select: { nome: true } },
          conta: { select: { nome: true } },
        },
        orderBy: { dataVencimento: "asc" },
      })
      if (ledger.length > 1) {
        parcelas = ledger.map((l) => {
          const vencDate = l.dataVencimento ?? l.dataLancamento
          return {
            id: l.id,
            dir: l.tipo === "saida" ? ("out" as const) : ("in" as const),
            desc: l.descricao ?? "—",
            party: l.cliente?.nome ?? l.pagoPara ?? null,
            caso: l.caso?.titulo ?? null,
            cat: l.categoria?.nome ?? null,
            venc: vencDate ? vencDate.toISOString() : null,
            valorCents: Math.abs(l.valorCents),
            pago: l.status === "feito",
            pagoData: l.dataPagamento ? l.dataPagamento.toISOString() : null,
            contaId: l.contaId,
            conta: l.conta?.nome ?? null,
            recorrente: true,
            grupo: "Recorrente",
          }
        })
      }
    }
  }

  return {
    ...toHonorarioRow(r),
    valorLiquidoCents: r.valorLiquidoCents,
    responsavel: r.responsavel,
    pagamento: r.pagamento,
    processoTitulo: r.processoTitulo,
    serie,
    parcelas,
  }
}

// ── contas & balanço ─────────────────────────────────────────────────────────
export async function getContaBalances(): Promise<ContasBalanco> {
  const [contas, movs] = await Promise.all([
    prisma.conta.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, titular: true, kind: true, valorInicialCents: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.lancamento.findMany({
      where: BALANCE_MOV,
      select: { contaId: true, tipo: true, valorCents: true },
    }),
  ])

  const agg = new Map<number, { entradas: number; saidas: number }>()
  for (const m of movs) {
    if (m.contaId == null) continue
    const cur = agg.get(m.contaId) ?? { entradas: 0, saidas: 0 }
    if (m.tipo === "saida") cur.saidas += Math.abs(m.valorCents)
    else cur.entradas += m.valorCents
    agg.set(m.contaId, cur)
  }

  const rows: ContaBalanceRow[] = contas.map((c) => {
    const a = agg.get(c.id) ?? { entradas: 0, saidas: 0 }
    return {
      id: c.id,
      nome: c.nome,
      titular: c.titular,
      kind: c.kind as ContaKind,
      entradasCents: a.entradas,
      saidasCents: a.saidas,
      saldoCents: c.valorInicialCents + a.entradas - a.saidas,
    }
  })

  const socioContas = rows.filter((r) => r.kind === "socio")
  const diferencaSociosCents =
    socioContas.length === 2 ? Math.abs(socioContas[0].saldoCents - socioContas[1].saldoCents) : 0
  const saldoTotalCents = rows.reduce((s, r) => s + r.saldoCents, 0)
  return { contas: rows, saldoTotalCents, socioContas, diferencaSociosCents }
}

export async function getTransferencias(limit = 100): Promise<TransferenciaRow[]> {
  const rows = await prisma.transferencia.findMany({
    select: {
      id: true,
      valorCents: true,
      dataMovimento: true,
      descricao: true,
      contaOrigem: { select: { nome: true } },
      contaDestino: { select: { nome: true } },
    },
    orderBy: { dataMovimento: "desc" },
    take: limit,
  })
  return rows.map((r) => ({
    id: r.id,
    valorCents: r.valorCents,
    data: r.dataMovimento ? r.dataMovimento.toISOString() : null,
    descricao: r.descricao,
    contaOrigem: r.contaOrigem.nome,
    contaDestino: r.contaDestino.nome,
  }))
}

// ── honorário totals (paid vs pending) ───────────────────────────────────────
export async function getHonorarioTotals(): Promise<HonorarioTotals> {
  const [receb, pend] = await Promise.all([
    prisma.honorario.aggregate({ _sum: { valorCents: true }, _count: true, where: { status: "recebido" } }),
    prisma.honorario.aggregate({ _sum: { valorCents: true }, _count: true, where: { NOT: { status: "recebido" } } }),
  ])
  return {
    recebidoCents: receb._sum.valorCents ?? 0,
    pendenteCents: pend._sum.valorCents ?? 0,
    countRecebido: receb._count,
    countPendente: pend._count,
  }
}

// ── monthly summary (entradas / saídas / saldo for a given month) ────────────
export async function getMonthlySummary(mes?: string): Promise<MonthlySummary> {
  const ref = mesToDate(mes)
  const { start, end } = monthRange(ref)
  const key = monthKey(ref)
  const [entrada, saida, aReceber] = await Promise.all([
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { ...REVENUE, status: "feito", dataPagamento: { gte: start, lt: end } },
    }),
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { tipo: "saida", isAnomalia: false, status: "feito", dataPagamento: { gte: start, lt: end } },
    }),
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { ...REVENUE, status: "aberto", dataVencimento: { gte: start, lt: end } },
    }),
  ])
  const entradasCents = entrada._sum.valorCents ?? 0
  const saidasCents = Math.abs(saida._sum.valorCents ?? 0)
  return {
    mes: key,
    label: monthLabel(key),
    entradasCents,
    saidasCents,
    saldoCents: entradasCents - saidasCents,
    recebidoCents: entradasCents,
    aReceberCents: aReceber._sum.valorCents ?? 0,
  }
}

// ── option lists for the editable-table relation pickers ─────────────────────
export async function getContasOptions(): Promise<ContaOption[]> {
  const rows = await prisma.conta.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, kind: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  })
  return rows.map((r) => ({ id: r.id, nome: r.nome, kind: r.kind as ContaKind }))
}

export async function getClienteOptions(): Promise<IdNome[]> {
  const rows = await prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } })
  return rows.map((r) => ({ id: r.id, nome: r.nome }))
}

export async function getContaOptions(): Promise<IdNome[]> {
  const rows = await prisma.conta.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, titular: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  })
  return rows.map((r) => ({ id: r.id, nome: r.titular ?? r.nome }))
}

export async function getCasoOptions(): Promise<IdNome[]> {
  const rows = await prisma.caso.findMany({ where: { excluidoEm: null }, select: { id: true, titulo: true }, orderBy: { titulo: "asc" } })
  return rows.map((r) => ({ id: r.id, nome: r.titulo }))
}

// ── Financeiro interativo: unified lançamento ledger ─────────────────────────
// One "lançamento" = a receivable (dir 'in', entrada) or payable (dir 'out',
// saída). Excludes anomalias (valor_inicial / transferências / artifacts).
export async function getLancamentos(mes?: string, periodo: Periodo = "mes"): Promise<LancamentoRow[]> {
  const rows = await prisma.lancamento.findMany({
    where: { isAnomalia: false },
    select: {
      id: true,
      tipo: true,
      status: true,
      descricao: true,
      valorCents: true,
      dataVencimento: true,
      dataLancamento: true,
      dataPagamento: true,
      pagoPara: true,
      recorrenteParentId: true,
      contaId: true,
      cliente: { select: { nome: true } },
      caso: { select: { titulo: true } },
      categoria: { select: { nome: true } },
      conta: { select: { nome: true } },
      _count: { select: { recorrenteFilhos: true } },
    },
  })
  let mapped: LancamentoRow[] = rows.map((r) => {
    const vencDate = r.dataVencimento ?? r.dataLancamento
    const recorrente = r.recorrenteParentId != null || r._count.recorrenteFilhos > 0
    return {
      id: r.id,
      dir: r.tipo === "saida" ? "out" : "in",
      desc: r.descricao ?? "—",
      party: r.cliente?.nome ?? r.pagoPara ?? null,
      caso: r.caso?.titulo ?? null,
      cat: r.categoria?.nome ?? null,
      venc: vencDate ? vencDate.toISOString() : null,
      valorCents: Math.abs(r.valorCents),
      pago: r.status === "feito",
      pagoData: r.dataPagamento ? r.dataPagamento.toISOString() : null,
      contaId: r.contaId,
      conta: r.conta?.nome ?? null,
      recorrente,
      grupo: recorrente ? "Recorrente" : null,
    }
  })
  if (mes) mapped = mapped.filter((r) => inScope(r.venc, mes, periodo))
  return mapped.sort((a, b) => (a.venc ?? "").localeCompare(b.venc ?? ""))
}

// Cash-flow projection: aggregate every non-anomalia lançamento by venc month,
// accumulate from the opening cash (sum of account opening balances); months
// after the current one are flagged as projection.
export async function getFluxoResumo(): Promise<FluxoResumo> {
  const [rows, contas] = await Promise.all([
    prisma.lancamento.findMany({
      where: { isAnomalia: false },
      select: { tipo: true, valorCents: true, dataVencimento: true, dataLancamento: true },
    }),
    prisma.conta.aggregate({ _sum: { valorInicialCents: true }, where: { ativo: true } }),
  ])
  const abertura = contas._sum.valorInicialCents ?? 0
  const byMonth = new Map<string, { ent: number; sai: number }>()
  for (const r of rows) {
    const d = r.dataVencimento ?? r.dataLancamento
    if (!d) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const cur = byMonth.get(key) ?? { ent: 0, sai: 0 }
    if (r.tipo === "saida") cur.sai += Math.abs(r.valorCents)
    else cur.ent += Math.abs(r.valorCents)
    byMonth.set(key, cur)
  }
  const nowKey = currentMes()
  let acc = abertura
  let totalEnt = 0
  let totalSai = 0
  let menor = abertura
  const pontos: FluxoPoint[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const saldo = v.ent - v.sai
      acc += saldo
      totalEnt += v.ent
      totalSai += v.sai
      if (acc < menor) menor = acc
      const [y, m] = key.split("-")
      return {
        key,
        label: MES_ABBR[Number(m) - 1],
        ano: y,
        entCents: v.ent,
        saiCents: v.sai,
        saldoCents: saldo,
        accCents: acc,
        proj: key > nowKey,
      }
    })
  const curPoint = pontos.find((p) => p.key === nowKey)
  const realized = pontos.filter((p) => !p.proj)
  const saldoHoje = curPoint
    ? curPoint.accCents
    : realized.length
      ? realized[realized.length - 1].accCents
      : abertura
  return {
    pontos,
    aberturaCents: abertura,
    saldoHojeCents: saldoHoje,
    saldoFinalCents: pontos.length ? pontos[pontos.length - 1].accCents : abertura,
    menorSaldoCents: menor,
    totalEntCents: totalEnt,
    totalSaiCents: totalSai,
  }
}

export async function getCategoriaOptions(): Promise<string[]> {
  const rows = await prisma.categoria.findMany({
    where: { ativo: true },
    select: { nome: true },
    orderBy: { nome: "asc" },
  })
  return [...new Set(rows.map((r) => r.nome))]
}

export async function getFornecedorOptions(): Promise<string[]> {
  const rows = await prisma.lancamento.findMany({
    where: { tipo: "saida", pagoPara: { not: null } },
    select: { pagoPara: true },
    distinct: ["pagoPara"],
    orderBy: { pagoPara: "asc" },
  })
  return rows.map((r) => r.pagoPara).filter((x): x is string => !!x)
}

// ── Casos & rateio entre sócios ──────────────────────────────────────────────
export async function getSocioContas(): Promise<SocioConta[]> {
  const rows = await prisma.conta.findMany({
    where: { kind: "socio", ativo: true },
    select: { id: true, nome: true, titular: true, ordem: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  })
  return rows.map((r) => ({ id: r.id, nome: r.titular ?? r.nome, ordem: r.ordem }))
}

export async function getCasos(): Promise<CasoRow[]> {
  const rows = await prisma.caso.findMany({
    where: { excluidoEm: null },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      status: true,
      area: true,
      responsavel: true,
      ultimaMovimentacao: true,
      dataCriacao: true,
      clientePrincipal: { select: { nome: true } },
      responsaveis: {
        select: { contaId: true, percentual: true, conta: { select: { nome: true, titular: true, ordem: true } } },
      },
      lancamentos: { where: { tipo: "entrada", isAnomalia: false }, select: { valorCents: true } },
    },
    orderBy: { titulo: "asc" },
  })
  return rows
    .map((r) => ({
      id: r.id,
      titulo: r.titulo,
      cliente: r.clientePrincipal?.nome ?? null,
      tipo: r.tipo as CasoRow["tipo"],
      status: r.status,
      area: r.area,
      responsavel: r.responsavel,
      // Fall back to dataCriacao when ultimaMovimentacao is null so the row still
      // sorts deterministically (and the field stays a stable ISO date string).
      ultimaMovimentacao: (r.ultimaMovimentacao ?? r.dataCriacao)?.toISOString() ?? null,
      honorariosCents: r.lancamentos.reduce((a, l) => a + Math.abs(l.valorCents), 0),
      honorariosCount: r.lancamentos.length,
      responsaveis: r.responsaveis
        .slice()
        .sort((a, b) => a.conta.ordem - b.conta.ordem)
        .map((cr) => ({ contaId: cr.contaId, nome: cr.conta.titular ?? cr.conta.nome, percentual: cr.percentual })),
    }))
    // Most recently moved cases first; nulls sink to the bottom.
    .sort((a, b) => (b.ultimaMovimentacao ?? "").localeCompare(a.ultimaMovimentacao ?? ""))
}

// Entitlement-vs-cash settlement between the two sócios, net of sócio↔sócio
// transfers (which count as settlement). Considers PAID 'in' lançamentos that
// (a) are linked to a caso WITH a defined split and (b) were received into a
// sócio account; entitlement is split by the caso's percentuais.
export async function getAcertoSocios(): Promise<AcertoSocios> {
  const socios = await prisma.conta.findMany({
    where: { kind: "socio", ativo: true },
    select: { id: true, nome: true, titular: true, ordem: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  })
  if (socios.length !== 2) {
    return emptyAcerto(
      socios.map((s) => ({
        id: s.id,
        nome: s.titular ?? s.nome,
        direitoCents: 0,
        recebidoCents: 0,
        cotaSaidaCents: 0,
        pagoSaidaCents: 0,
      })),
    )
  }
  const [A, B] = socios

  const honos = await prisma.lancamento.findMany({
    where: {
      tipo: "entrada",
      status: "feito",
      isAnomalia: false,
      contaId: { in: [A.id, B.id] },
      casoId: { not: null },
    },
    select: {
      valorCents: true,
      contaId: true,
      caso: { select: { responsaveis: { select: { contaId: true, percentual: true } } } },
    },
  })
  const saidas = await prisma.lancamento.findMany({
    where: { tipo: "saida", status: "feito", isAnomalia: false, contaId: { in: [A.id, B.id] } },
    select: { valorCents: true, contaId: true },
  })
  const transfers = await prisma.transferencia.findMany({
    where: {
      OR: [
        { contaOrigemId: A.id, contaDestinoId: B.id },
        { contaOrigemId: B.id, contaDestinoId: A.id },
      ],
    },
    select: { valorCents: true, contaOrigemId: true },
  })

  // The math itself lives in ./acerto.ts (pure, unit-tested).
  return computeAcertoSocios(
    socios,
    honos.map((h) => ({ valorCents: h.valorCents, contaId: h.contaId, responsaveis: h.caso?.responsaveis ?? [] })),
    saidas,
    transfers,
  )
}
