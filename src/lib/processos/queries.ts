// Processos & Casos — read layer. SERVER ONLY. Lists are DB-paginated
// (parseListQuery + {items,total} envelope) and RBAC-scoped; the urgency
// "semáforo" on prazos is derived here (never stored).
import type { Prisma } from "@prisma/client"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { type ListQuery, type Paginated, paginated } from "@/lib/list"
import { type NotificacaoDb, toRow } from "@/lib/notificacoes/map"
import type { NotificacaoRow } from "@/lib/notificacoes/types"
import { addDiasISO, hojeISO } from "./datas"
import { podeAcessarProcesso, podeVerFinanceiro, resolveUserId, scopeProcessoWhere, veTudo } from "./rbac"
import { urgenciaDe } from "./urgencia"
import type {
  AndamentoRow,
  AnotacaoRow,
  DashboardData,
  MovimentoInboxRow,
  DocumentoVersaoRefRow,
  NaturezaLegal,
  ParteRow,
  PrazoRow,
  ProcessoDetail,
  ProcessoFinanceiro,
  ProcessoRow,
  PublicacaoRow,
  Sistema,
  ProcessoStatus,
  PartePapel,
  ParteTipo,
  Polo,
  FonteAndamento,
  PrazoOrigem,
  PrazoStatus,
  TipoContagem,
  TriagemStatus,
} from "./types"

const iso = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null)
const isoReq = (d: Date): string => d.toISOString().slice(0, 10)
const isoDateTime = (d: Date | null): string | null => (d ? d.toISOString() : null)
function noon(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

// ── prazo mapping (urgency derived) ────────────────────────────────────────────
const prazoSelect = {
  id: true,
  processoId: true,
  descricao: true,
  tipo: true,
  origem: true,
  tipoContagem: true,
  quantidadeDias: true,
  dataPublicacao: true,
  dataInicio: true,
  dataFatal: true,
  dataInterna: true,
  diasMargem: true,
  status: true,
  responsavelUserId: true,
  cumpridoEm: true,
  responsavelUser: { select: { nome: true } },
  processo: { select: { numeroCnj: true, caso: { select: { titulo: true } } } },
} satisfies Prisma.PrazoSelect

type PrazoSelected = Prisma.PrazoGetPayload<{ select: typeof prazoSelect }>

function mapPrazo(p: PrazoSelected, hoje: string): PrazoRow {
  const dataFatal = isoReq(p.dataFatal)
  const dataInterna = iso(p.dataInterna)
  // urgência também p/ propostos (a fila "A confirmar" precisa do semáforo); as
  // leituras de prazos reais filtram status:"pendente" antes, então não vaza.
  const ativo = p.status === "pendente" || p.status === "proposto"
  return {
    id: p.id,
    processoId: p.processoId,
    numeroCnj: p.processo?.numeroCnj ?? null,
    caso: p.processo?.caso?.titulo ?? null,
    descricao: p.descricao,
    tipo: p.tipo,
    origem: p.origem as PrazoOrigem,
    tipoContagem: p.tipoContagem as TipoContagem,
    quantidadeDias: p.quantidadeDias,
    dataPublicacao: iso(p.dataPublicacao),
    dataInicio: isoReq(p.dataInicio),
    dataFatal,
    dataInterna,
    diasMargem: p.diasMargem,
    status: p.status as PrazoStatus,
    responsavelUserId: p.responsavelUserId,
    responsavel: p.responsavelUser?.nome ?? null,
    cumpridoEm: iso(p.cumpridoEm),
    urgencia: ativo ? urgenciaDe(dataFatal, dataInterna, hoje) : null,
  }
}

// ── Processos list ──────────────────────────────────────────────────────────────
export interface ProcessoFiltros {
  casoId?: number
  status?: string
  responsavelUserId?: number
  tribunal?: string
  uf?: string
  q?: string
}

const PROCESSO_SORTABLE = ["createdAt", "dataDistribuicao", "status", "numeroCnj"] as const

export async function listProcessos(
  filtros: ProcessoFiltros,
  q: ListQuery,
  user: SessionUser,
): Promise<Paginated<ProcessoRow>> {
  const scope = await scopeProcessoWhere(user)
  const where: Prisma.ProcessoWhereInput = { AND: [scope, { excluidoEm: null }] }
  const and = where.AND as Prisma.ProcessoWhereInput[]
  if (filtros.casoId) and.push({ casoId: filtros.casoId })
  if (filtros.status) and.push({ status: filtros.status })
  if (filtros.responsavelUserId) and.push({ responsavelUserId: filtros.responsavelUserId })
  if (filtros.tribunal) and.push({ tribunal: filtros.tribunal })
  if (filtros.uf) and.push({ uf: filtros.uf.toUpperCase() })
  if (filtros.q) {
    and.push({
      OR: [
        { numeroCnj: { contains: filtros.q } },
        { classe: { contains: filtros.q } },
        { assunto: { contains: filtros.q } },
      ],
    })
  }

  const orderBy: Prisma.ProcessoOrderByWithRelationInput = {
    [q.sort]: q.order,
  } as Prisma.ProcessoOrderByWithRelationInput

  const [rows, total] = await Promise.all([
    prisma.processo.findMany({
      where,
      orderBy,
      skip: q.skip,
      take: q.take,
      select: {
        id: true,
        casoId: true,
        numeroCnj: true,
        classe: true,
        assunto: true,
        status: true,
        faseAtual: true,
        instancia: true,
        vara: true,
        comarca: true,
        tribunal: true,
        uf: true,
        sistema: true,
        segredoJustica: true,
        valorCausaCents: true,
        dataDistribuicao: true,
        responsavelUserId: true,
        createdAt: true,
        caso: { select: { titulo: true } },
        responsavelUser: { select: { nome: true } },
        prazos: {
          where: { excluidoEm: null, status: "pendente" },
          select: { dataFatal: true },
          orderBy: { dataFatal: "asc" },
        },
      },
    }),
    prisma.processo.count({ where }),
  ])

  const items: ProcessoRow[] = rows.map((r) => ({
    id: r.id,
    casoId: r.casoId,
    caso: r.caso?.titulo ?? null,
    numeroCnj: r.numeroCnj,
    classe: r.classe,
    assunto: r.assunto,
    status: r.status as ProcessoStatus,
    faseAtual: r.faseAtual,
    instancia: r.instancia,
    vara: r.vara,
    comarca: r.comarca,
    tribunal: r.tribunal,
    uf: r.uf,
    sistema: (r.sistema ?? null) as Sistema | null,
    segredoJustica: r.segredoJustica,
    valorCausaCents: r.valorCausaCents,
    dataDistribuicao: iso(r.dataDistribuicao),
    responsavelUserId: r.responsavelUserId,
    responsavel: r.responsavelUser?.nome ?? null,
    prazosPendentes: r.prazos.length,
    proximaDataFatal: r.prazos[0] ? isoReq(r.prazos[0].dataFatal) : null,
    createdAt: r.createdAt.toISOString(),
  }))

  return paginated(items, total, q)
}

export { PROCESSO_SORTABLE }

// ── Processo detail ──────────────────────────────────────────────────────────
export async function getProcessoDetail(id: number, user: SessionUser): Promise<ProcessoDetail | null> {
  if (!(await podeAcessarProcesso(user, id))) return null
  const hoje = hojeISO()
  const p = await prisma.processo.findFirst({
    where: { id, excluidoEm: null, caso: { excluidoEm: null } },
    select: {
      id: true,
      casoId: true,
      numeroCnj: true,
      classe: true,
      assunto: true,
      status: true,
      faseAtual: true,
      instancia: true,
      vara: true,
      comarca: true,
      tribunal: true,
      uf: true,
      sistema: true,
      segredoJustica: true,
      valorCausaCents: true,
      dataDistribuicao: true,
      responsavelUserId: true,
      createdAt: true,
      caso: { select: { titulo: true, clientePrincipalId: true, clientePrincipal: { select: { id: true, nome: true } } } },
      responsavelUser: { select: { nome: true } },
      partes: {
        where: { parte: { excluidoEm: null } },
        select: {
          id: true,
          parteId: true,
          papel: true,
          polo: true,
          ehCliente: true,
          parte: { select: { nome: true, tipo: true, documento: true, clienteId: true } },
        },
      },
      andamentos: {
        where: { excluidoEm: null },
        orderBy: { data: "desc" },
        select: { id: true, data: true, tipo: true, descricao: true, fonte: true, relevante: true, prazoId: true },
      },
      prazos: { where: { excluidoEm: null }, orderBy: { dataFatal: "asc" }, select: prazoSelect },
      publicacoes: {
        where: { excluidoEm: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          processoId: true,
          dataDisponibilizacao: true,
          dataPublicacao: true,
          diario: true,
          conteudo: true,
          numeroProcessoBruto: true,
          statusTriagem: true,
          prazoId: true,
          createdAt: true,
        },
      },
      anotacoes: {
        where: { excluidoEm: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, autor: true, conteudo: true, interno: true, createdAt: true },
      },
      documentos: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          nome: true,
          tipo: true,
          status: true,
          formato: true,
          createdAt: true,
          _count: { select: { versoes: true } },
        },
      },
    },
  })
  if (!p) return null

  const partes: ParteRow[] = p.partes.map((x) => ({
    id: x.id,
    parteId: x.parteId,
    nome: x.parte.nome,
    tipo: x.parte.tipo as ParteTipo,
    documento: x.parte.documento,
    papel: x.papel as PartePapel,
    polo: x.polo as Polo,
    ehCliente: x.ehCliente,
    clienteId: x.parte.clienteId,
  }))
  const andamentos: AndamentoRow[] = p.andamentos.map((a) => ({
    id: a.id,
    data: isoReq(a.data),
    tipo: a.tipo,
    descricao: a.descricao,
    fonte: a.fonte as FonteAndamento,
    relevante: a.relevante,
    prazoId: a.prazoId,
  }))
  const prazos: PrazoRow[] = p.prazos.map((x) => mapPrazo(x, hoje))
  const publicacoes: PublicacaoRow[] = p.publicacoes.map((pub) => ({
    id: pub.id,
    processoId: pub.processoId,
    processo: p.numeroCnj,
    numeroCnj: p.numeroCnj,
    dataDisponibilizacao: iso(pub.dataDisponibilizacao),
    dataPublicacao: iso(pub.dataPublicacao),
    diario: pub.diario,
    conteudo: pub.conteudo,
    numeroProcessoBruto: pub.numeroProcessoBruto,
    statusTriagem: pub.statusTriagem as TriagemStatus,
    prazoId: pub.prazoId,
    createdAt: pub.createdAt.toISOString(),
  }))
  const anotacoes: AnotacaoRow[] = p.anotacoes.map((n) => ({
    id: n.id,
    autor: n.autor,
    conteudo: n.conteudo,
    interno: n.interno,
    createdAt: n.createdAt.toISOString(),
  }))
  const documentos: DocumentoVersaoRefRow[] = p.documentos.map((d) => ({
    id: d.id,
    nome: d.nome,
    tipo: d.tipo,
    status: d.status,
    formato: d.formato,
    versoes: d._count.versoes,
    createdAt: d.createdAt.toISOString(),
  }))

  let financeiro: ProcessoFinanceiro | null = null
  if (podeVerFinanceiro(user.role)) {
    const lancs = await prisma.lancamento.findMany({
      where: { processoId: id, isAnomalia: false },
      orderBy: { dataVencimento: "desc" },
      select: {
        id: true,
        tipo: true,
        status: true,
        descricao: true,
        valorCents: true,
        naturezaLegal: true,
        dataVencimento: true,
        dataLancamento: true,
      },
    })
    const mapped = lancs.map((l) => {
      const venc = l.dataVencimento ?? l.dataLancamento
      return {
        id: l.id,
        dir: (l.tipo === "saida" ? "out" : "in") as "in" | "out",
        desc: l.descricao ?? "—",
        valorCents: Math.abs(l.valorCents),
        naturezaLegal: (l.naturezaLegal ?? null) as NaturezaLegal | null,
        venc: venc ? venc.toISOString() : null,
        pago: l.status === "feito",
      }
    })
    const entradas = mapped.filter((l) => l.dir === "in")
    // Honorários (fee-lançamentos) estruturadamente ligados a este processo — o id
    // devolvido é de LANÇAMENTO (Honorario é dormente, substituído pelo ledger).
    const hons = await prisma.lancamento.findMany({
      where: { processoId: id, tipo: "entrada", subTipo: "honorario", isAnomalia: false },
      orderBy: { dataVencimento: "desc" },
      select: { id: true, descricao: true, valorCents: true, status: true },
    })
    financeiro = {
      recebidoCents: entradas.filter((l) => l.pago).reduce((a, l) => a + l.valorCents, 0),
      abertoCents: entradas.filter((l) => !l.pago).reduce((a, l) => a + l.valorCents, 0),
      lancamentos: mapped,
      honorarios: hons.map((h) => ({ id: h.id, descricao: h.descricao ?? "Honorário", valorCents: Math.abs(h.valorCents), status: h.status === "feito" ? "recebido" : "lancado" })),
    }
  }

  return {
    id: p.id,
    casoId: p.casoId,
    caso: p.caso?.titulo ?? null,
    clienteId: p.caso?.clientePrincipalId ?? null,
    cliente: p.caso?.clientePrincipal ? { id: p.caso.clientePrincipal.id, nome: p.caso.clientePrincipal.nome } : null,
    numeroCnj: p.numeroCnj,
    classe: p.classe,
    assunto: p.assunto,
    status: p.status as ProcessoStatus,
    faseAtual: p.faseAtual,
    instancia: p.instancia,
    vara: p.vara,
    comarca: p.comarca,
    tribunal: p.tribunal,
    uf: p.uf,
    sistema: (p.sistema ?? null) as Sistema | null,
    segredoJustica: p.segredoJustica,
    valorCausaCents: p.valorCausaCents,
    dataDistribuicao: iso(p.dataDistribuicao),
    responsavelUserId: p.responsavelUserId,
    responsavel: p.responsavelUser?.nome ?? null,
    prazosPendentes: prazos.filter((x) => x.status === "pendente").length,
    proximaDataFatal: prazos.find((x) => x.status === "pendente")?.dataFatal ?? null,
    createdAt: p.createdAt.toISOString(),
    partes,
    andamentos,
    prazos,
    publicacoes,
    anotacoes,
    documentos,
    financeiro,
  }
}

// ── Prazos list (across processos) ─────────────────────────────────────────────
export interface PrazoFiltros {
  processoId?: number
  status?: string
  responsavelUserId?: number
  vencidos?: boolean // dataFatal < hoje (pendentes)
  ateISO?: string // dataFatal <= ateISO
}

const PRAZO_SORTABLE = ["dataFatal", "createdAt", "dataInicio"] as const
export { PRAZO_SORTABLE }

export async function listPrazos(filtros: PrazoFiltros, q: ListQuery, user: SessionUser): Promise<Paginated<PrazoRow>> {
  const hoje = hojeISO()
  const scope = await scopeProcessoWhere(user)
  // Exclude prazos whose parent processo was soft-deleted (the processo's soft-delete
  // cascades, but this also hides any pre-existing orphans).
  const where: Prisma.PrazoWhereInput = { AND: [{ excluidoEm: null }, { processo: { AND: [scope, { excluidoEm: null }] } }] }
  const and = where.AND as Prisma.PrazoWhereInput[]
  if (filtros.processoId) and.push({ processoId: filtros.processoId })
  if (filtros.status) and.push({ status: filtros.status })
  if (filtros.responsavelUserId) and.push({ responsavelUserId: filtros.responsavelUserId })
  if (filtros.vencidos) and.push({ status: "pendente", dataFatal: { lt: noon(hoje) } })
  if (filtros.ateISO) and.push({ dataFatal: { lte: noon(filtros.ateISO) } })

  const orderBy = { [q.sort]: q.order } as Prisma.PrazoOrderByWithRelationInput
  const [rows, total] = await Promise.all([
    prisma.prazo.findMany({ where, orderBy, skip: q.skip, take: q.take, select: prazoSelect }),
    prisma.prazo.count({ where }),
  ])
  return paginated(rows.map((r) => mapPrazo(r, hoje)), total, q)
}

// ── Publicações (triagem queue) ─────────────────────────────────────────────────
const PUB_SORTABLE = ["createdAt", "dataPublicacao"] as const
export { PUB_SORTABLE }

export async function listPublicacoes(
  filtros: { statusTriagem?: string; processoId?: number },
  q: ListQuery,
  user: SessionUser,
): Promise<Paginated<PublicacaoRow>> {
  const scope = await scopeProcessoWhere(user)
  // unmatched publicações (processoId null) are visible to non-scoped roles only
  const where: Prisma.PublicacaoWhereInput = {
    AND: [
      { excluidoEm: null },
      veTudo(user.role) ? {} : { OR: [{ processo: scope }, { processoId: null }] },
    ],
  }
  const and = where.AND as Prisma.PublicacaoWhereInput[]
  if (filtros.statusTriagem) and.push({ statusTriagem: filtros.statusTriagem })
  if (filtros.processoId) and.push({ processoId: filtros.processoId })

  const orderBy = { [q.sort]: q.order } as Prisma.PublicacaoOrderByWithRelationInput
  const [rows, total] = await Promise.all([
    prisma.publicacao.findMany({
      where,
      orderBy,
      skip: q.skip,
      take: q.take,
      select: {
        id: true,
        processoId: true,
        dataDisponibilizacao: true,
        dataPublicacao: true,
        diario: true,
        conteudo: true,
        numeroProcessoBruto: true,
        statusTriagem: true,
        prazoId: true,
        createdAt: true,
        processo: { select: { numeroCnj: true } },
      },
    }),
    prisma.publicacao.count({ where }),
  ])
  const items: PublicacaoRow[] = rows.map((pub) => ({
    id: pub.id,
    processoId: pub.processoId,
    processo: pub.processo?.numeroCnj ?? null,
    numeroCnj: pub.processo?.numeroCnj ?? null,
    dataDisponibilizacao: iso(pub.dataDisponibilizacao),
    dataPublicacao: iso(pub.dataPublicacao),
    diario: pub.diario,
    conteudo: pub.conteudo,
    numeroProcessoBruto: pub.numeroProcessoBruto,
    statusTriagem: pub.statusTriagem as TriagemStatus,
    prazoId: pub.prazoId,
    createdAt: pub.createdAt.toISOString(),
  }))
  return paginated(items, total, q)
}

// ── Movimentos a revisar (inbox agrupado POR PROCESSO) ──────────────────────────
// A captura do DataJud joga centenas de andamentos; a fila de revisão é por
// PROCESSO (vê-se N processos, não N andamentos). RBAC via scopeProcessoWhere.
export async function listMovimentosInbox(user: SessionUser): Promise<MovimentoInboxRow[]> {
  // counts exatos por processo (groupBy é version-safe); o RBAC entra no findMany.
  const grupos = await prisma.andamento.groupBy({
    by: ["processoId"],
    where: { statusRevisao: "novo", excluidoEm: null },
    _count: { _all: true },
  })
  if (!grupos.length) return []
  const totalPorProc = new Map(grupos.map((g) => [g.processoId, g._count._all]))
  const scope = await scopeProcessoWhere(user)
  const procs = await prisma.processo.findMany({
    where: { AND: [scope, { excluidoEm: null }, { id: { in: grupos.map((g) => g.processoId) } }] },
    select: {
      id: true,
      numeroCnj: true,
      caso: { select: { titulo: true, clientePrincipal: { select: { nome: true } } } },
      andamentos: {
        where: { statusRevisao: "novo", excluidoEm: null },
        orderBy: { data: "desc" },
        take: 6,
        select: { data: true, descricao: true, relevante: true },
      },
    },
  })
  const items: MovimentoInboxRow[] = procs.map((p) => ({
    processoId: p.id,
    numeroCnj: p.numeroCnj,
    caso: p.caso?.titulo ?? null,
    cliente: p.caso?.clientePrincipal?.nome ?? null,
    totalNovos: totalPorProc.get(p.id) ?? p.andamentos.length,
    temRelevante: p.andamentos.some((a) => a.relevante),
    ultimaData: p.andamentos[0] ? iso(p.andamentos[0].data) : null,
    exemplos: p.andamentos.slice(0, 3).map((a) => a.descricao),
  }))
  // relevantes primeiro, depois mais recentes (pré-ordenação heurística)
  items.sort(
    (a, b) => Number(b.temRelevante) - Number(a.temRelevante) || (b.ultimaData ?? "").localeCompare(a.ultimaData ?? ""),
  )
  return items
}

/** Andamentos 'novo' de UM processo (painel de revisão). RBAC-gated. */
export async function getMovimentosNovos(processoId: number, user: SessionUser): Promise<AndamentoRow[] | null> {
  if (!(await podeAcessarProcesso(user, processoId))) return null
  const rows = await prisma.andamento.findMany({
    where: { processoId, statusRevisao: "novo", excluidoEm: null },
    orderBy: [{ relevante: "desc" }, { data: "desc" }],
    select: { id: true, data: true, tipo: true, descricao: true, fonte: true, relevante: true, prazoId: true },
  })
  return rows.map((a) => ({
    id: a.id,
    data: isoReq(a.data),
    tipo: a.tipo,
    descricao: a.descricao,
    fonte: a.fonte as FonteAndamento,
    relevante: a.relevante,
    prazoId: a.prazoId,
  }))
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export async function getDashboard(user: SessionUser): Promise<DashboardData> {
  const hoje = hojeISO()
  const semana = addDiasISO(hoje, 7)
  const proximos30 = addDiasISO(hoje, 30)
  const uid = veTudo(user.role) ? null : await resolveUserId(user.email)
  const procScope = await scopeProcessoWhere(user)
  const prazoProcessoFilter: Prisma.PrazoWhereInput = { processo: { AND: [procScope, { excluidoEm: null }] } }
  const eventoScope: Prisma.EventoWhereInput = veTudo(user.role)
    ? {}
    : uid == null
      ? { id: -1 }
      : { OR: [{ responsavelId: uid }, { processo: { responsavelUserId: uid } }, { caso: { responsavelUserId: uid } }] }

  const [processosAtivos, prazosSemana, audienciasSemana, publicacoesPendentesCount, prazosVencidos, prazoRows, audienciasHojeRows, tarefasRows, pubRows] =
    await Promise.all([
      prisma.processo.count({ where: { AND: [procScope, { excluidoEm: null }, { status: "ativo" }] } }),
      prisma.prazo.count({
        where: { AND: [{ excluidoEm: null }, prazoProcessoFilter, { status: "pendente", dataFatal: { gte: noon(hoje), lte: noon(semana) } }] },
      }),
      prisma.evento.count({
        where: { AND: [eventoScope, { tipo: { in: ["audiencia", "pericia"] }, status: "confirmado", dataInicio: { gte: noon(hoje), lte: noon(semana) } }] },
      }),
      prisma.publicacao.count({
        where: { AND: [{ excluidoEm: null, statusTriagem: "pendente" }, veTudo(user.role) ? {} : { OR: [{ processo: procScope }, { processoId: null }] }] },
      }),
      prisma.prazo.count({
        where: { AND: [{ excluidoEm: null }, prazoProcessoFilter, { status: "pendente", dataFatal: { lt: noon(hoje) } }] },
      }),
      prisma.prazo.findMany({
        where: { AND: [{ excluidoEm: null }, prazoProcessoFilter, { status: "pendente", dataFatal: { lte: noon(proximos30) } }] },
        orderBy: { dataFatal: "asc" },
        take: 50,
        select: prazoSelect,
      }),
      prisma.evento.findMany({
        where: { AND: [eventoScope, { tipo: { in: ["audiencia", "pericia", "reuniao"] }, status: "confirmado", dataInicio: { gte: noon(hoje), lt: noon(addDiasISO(hoje, 1)) } }] },
        orderBy: { dataInicio: "asc" },
        select: { id: true, titulo: true, tipo: true, dataInicio: true, local: true, caso: { select: { titulo: true } } },
      }),
      prisma.tarefa.findMany({
        // Scoped roles must NOT fail open: an unresolvable uid matches no tarefas
        // (mirrors eventoScope), never the whole office's tasks.
        where: {
          AND: [
            { done: false, prazo: { not: null } },
            veTudo(user.role) ? {} : uid == null ? { id: -1 } : { responsavelId: uid },
          ],
        },
        orderBy: { prazo: "asc" },
        take: 20,
        select: { id: true, titulo: true, status: true, prio: true, prazo: true },
      }),
      prisma.publicacao.findMany({
        where: { AND: [{ excluidoEm: null, statusTriagem: "pendente" }, veTudo(user.role) ? {} : { OR: [{ processo: procScope }, { processoId: null }] }] },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          processoId: true,
          dataDisponibilizacao: true,
          dataPublicacao: true,
          diario: true,
          conteudo: true,
          numeroProcessoBruto: true,
          statusTriagem: true,
          prazoId: true,
          createdAt: true,
          processo: { select: { numeroCnj: true } },
        },
      }),
    ])

  return {
    hoje,
    indicadores: {
      processosAtivos,
      prazosSemana,
      audienciasSemana,
      publicacoesPendentes: publicacoesPendentesCount,
      prazosVencidos,
    },
    prazos: prazoRows.map((r) => mapPrazo(r, hoje)),
    audienciasHoje: audienciasHojeRows.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      tipo: e.tipo,
      inicio: e.dataInicio.toISOString(),
      local: e.local,
      caso: e.caso?.titulo ?? null,
    })),
    tarefasPendentes: tarefasRows.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      status: t.status,
      prio: t.prio,
      prazo: iso(t.prazo),
    })),
    publicacoesPendentes: pubRows.map((pub) => ({
      id: pub.id,
      processoId: pub.processoId,
      processo: pub.processo?.numeroCnj ?? null,
      numeroCnj: pub.processo?.numeroCnj ?? null,
      dataDisponibilizacao: iso(pub.dataDisponibilizacao),
      dataPublicacao: iso(pub.dataPublicacao),
      diario: pub.diario,
      conteudo: pub.conteudo,
      numeroProcessoBruto: pub.numeroProcessoBruto,
      statusTriagem: pub.statusTriagem as TriagemStatus,
      prazoId: pub.prazoId,
      createdAt: pub.createdAt.toISOString(),
    })),
  }
}

// ── Documento (versões) ──────────────────────────────────────────────────────
export async function listVersoesDocumento(documentoId: number) {
  const rows = await prisma.documentoVersao.findMany({
    where: { documentoId },
    orderBy: { versao: "desc" },
    select: { id: true, versao: true, nome: true, formato: true, tamanho: true, mimeType: true, criadoPor: true, createdAt: true },
  })
  return rows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }))
}

// ── Feriados / Suspensões (config) ───────────────────────────────────────────
export async function listFeriados() {
  const rows = await prisma.feriado.findMany({ orderBy: { data: "asc" } })
  return rows.map((f) => ({
    id: f.id,
    data: isoReq(f.data),
    descricao: f.descricao,
    abrangencia: f.abrangencia,
    uf: f.uf,
    tribunal: f.tribunal,
  }))
}

export async function listSuspensoes() {
  const rows = await prisma.suspensaoPrazo.findMany({ orderBy: { de: "asc" } })
  return rows.map((s) => ({
    id: s.id,
    de: isoReq(s.de),
    ate: isoReq(s.ate),
    descricao: s.descricao,
    jurisdicao: s.jurisdicao,
  }))
}

// ── Notificações (per-user) ──────────────────────────────────────────────────
export async function listNotificacoes(userEmail: string, apenasNaoLidas = false): Promise<NotificacaoRow[]> {
  const rows = await prisma.notificacao.findMany({
    where: { userEmail, ...(apenasNaoLidas ? { lida: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      tipo: true,
      modulo: true,
      prioridade: true,
      refTipo: true,
      refId: true,
      mensagem: true,
      link: true,
      actorEmail: true,
      contador: true,
      lida: true,
      createdAt: true,
    },
  })
  return rows.map((n) => toRow(n as NotificacaoDb))
}

// ── Captura CNJ (OABs monitoradas + log de execuções) ─────────────────────────
export interface OabRow {
  id: number
  numero: string
  uf: string
  advogadoNome: string | null
  ativo: boolean
  createdAt: string
}

export async function listOabs(): Promise<OabRow[]> {
  const rows = await prisma.oabMonitorada.findMany({ orderBy: [{ ativo: "desc" }, { uf: "asc" }, { numero: "asc" }] })
  return rows.map((o) => ({
    id: o.id,
    numero: o.numero,
    uf: o.uf,
    advogadoNome: o.advogadoNome,
    ativo: o.ativo,
    createdAt: o.createdAt.toISOString(),
  }))
}

export interface ExecucaoCapturaRow {
  id: number
  fonte: string
  escopo: string
  status: string // 'ok' | 'erro' | 'dry-run'
  iniciadoEm: string
  finalizadoEm: string | null
  janelaDe: string | null
  janelaAte: string | null
  encontrados: number
  criados: number
  ignorados: number
  semVinculo: number
  erro: string | null
}

export async function listExecucoesCaptura(limite = 50): Promise<ExecucaoCapturaRow[]> {
  const rows = await prisma.execucaoCaptura.findMany({ orderBy: { iniciadoEm: "desc" }, take: limite })
  return rows.map((e) => ({
    id: e.id,
    fonte: e.fonte,
    escopo: e.escopo,
    status: e.status,
    iniciadoEm: e.iniciadoEm.toISOString(),
    finalizadoEm: e.finalizadoEm ? e.finalizadoEm.toISOString() : null,
    janelaDe: iso(e.janelaDe),
    janelaAte: iso(e.janelaAte),
    encontrados: e.encontrados,
    criados: e.criados,
    ignorados: e.ignorados,
    semVinculo: e.semVinculo,
    erro: e.erro,
  }))
}

export interface CapturaFonteStatus {
  ultima: ExecucaoCapturaRow | null
  falhasRecentes: ExecucaoCapturaRow[]
  total: number
}
export interface CapturaStatus {
  comunica: CapturaFonteStatus
  datajud: CapturaFonteStatus
  execucoes: ExecucaoCapturaRow[]
}

/** Status agregado para a aba Captura / o banner de falha do app. */
export async function getCapturaStatus(): Promise<CapturaStatus> {
  const execucoes = await listExecucoesCaptura(60)
  const resumoFonte = (fonte: string): CapturaFonteStatus => {
    const lista = execucoes.filter((e) => e.fonte === fonte)
    return {
      ultima: lista[0] ?? null,
      falhasRecentes: lista.filter((e) => e.status === "erro").slice(0, 10),
      total: lista.length,
    }
  }
  return { comunica: resumoFonte("comunica"), datajud: resumoFonte("datajud"), execucoes }
}
