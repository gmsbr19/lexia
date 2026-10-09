// Casos — read layer for the casos page/grid, the caso page and the paginated
// API list. SERVER ONLY.
import type { Prisma } from "@prisma/client"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { type ListQuery, type Paginated, paginated } from "@/lib/list"
import { listEventos } from "@/lib/agenda/queries"
import type { HonorarioRow, LancamentoRow } from "@/lib/finance/types"
import { lancamentoToHonorarioRow } from "@/lib/finance/honorario-map"
import { scopeCasoWhere } from "@/lib/processos/rbac"
import type { ProcessoMini, ProcessoStatus } from "@/lib/processos/types"
import { hojeSP } from "@/lib/tarefas/regras"
import { getInformacoes } from "@/lib/informacoes/queries"
import type { CasoDetail, CasoDocumentoRow, CasoListRow, CasoPageRow, CasoTarefaRow } from "./types"

const isoDate = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null)

export const CASO_SORTABLE = ["titulo", "dataCriacao", "status"] as const

export interface CasoFiltros {
  tipo?: string
  status?: string
  area?: string
  clienteId?: number
  responsavelUserId?: number
  q?: string
}

export async function listCasos(filtros: CasoFiltros, q: ListQuery, user: SessionUser): Promise<Paginated<CasoListRow>> {
  const scope = await scopeCasoWhere(user)
  const where: Prisma.CasoWhereInput = { AND: [scope, { excluidoEm: null }] }
  const and = where.AND as Prisma.CasoWhereInput[]
  if (filtros.tipo) and.push({ tipo: filtros.tipo })
  if (filtros.status) and.push({ status: filtros.status })
  if (filtros.area) and.push({ area: filtros.area })
  if (filtros.clienteId) and.push({ clientePrincipalId: filtros.clienteId })
  if (filtros.responsavelUserId) and.push({ responsavelUserId: filtros.responsavelUserId })
  if (filtros.q) {
    and.push({
      OR: [
        { titulo: { contains: filtros.q, mode: "insensitive" } },
        { processos: { some: { excluidoEm: null, numeroCnj: { contains: filtros.q } } } },
      ],
    })
  }

  const orderBy = { [q.sort]: q.order } as Prisma.CasoOrderByWithRelationInput
  const [rows, total] = await Promise.all([
    prisma.caso.findMany({
      where,
      orderBy,
      skip: q.skip,
      take: q.take,
      select: {
        id: true,
        titulo: true,
        tipo: true,
        area: true,
        status: true,
        clientePrincipalId: true,
        clientePrincipal: { select: { nome: true } },
        responsavelUserId: true,
        responsavelUser: { select: { nome: true } },
        dataCriacao: true,
        _count: { select: { processos: { where: { excluidoEm: null } } } },
      },
    }),
    prisma.caso.count({ where }),
  ])
  const items: CasoListRow[] = rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo as CasoListRow["tipo"],
    area: r.area,
    status: r.status,
    clienteId: r.clientePrincipalId,
    cliente: r.clientePrincipal?.nome ?? null,
    responsavelUserId: r.responsavelUserId,
    responsavel: r.responsavelUser?.nome ?? null,
    numProcessos: r._count.processos,
    dataCriacao: isoDate(r.dataCriacao),
  }))
  return paginated(items, total, q)
}

export async function getCasoDetail(id: number): Promise<CasoDetail | null> {
  const caso = await prisma.caso.findFirst({
    where: { id, excluidoEm: null },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      area: true,
      status: true,
      responsavel: true,
      responsavelUserId: true,
      responsavelUser: { select: { nome: true } },
      clientePrincipalId: true,
      clientePrincipal: { select: { nome: true } },
      contrato: { select: { id: true, titulo: true, dataFechamento: true, excluidoEm: true } },
      dataCriacao: true,
      ultimaMovimentacao: true,
      nomeCurto: true,
      cor: true,
      prazo: true,
      descricao: true,
      modeloOrigemId: true,
      responsaveis: {
        select: { contaId: true, percentual: true, conta: { select: { nome: true, titular: true, ordem: true } } },
      },
    },
  })
  if (!caso) return null

  const [lancRows, honRows, tarefaRows, eventos, processoRows, documentoRows, anotacoes, fixadasCliente] = await Promise.all([
    prisma.lancamento.findMany({
      where: { casoId: id, isAnomalia: false },
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
        categoria: { select: { nome: true } },
        conta: { select: { nome: true } },
        _count: { select: { recorrenteFilhos: true } },
      },
      orderBy: { dataVencimento: "desc" },
    }),
    prisma.lancamento.findMany({
      where: { casoId: id, tipo: "entrada", subTipo: "honorario", isAnomalia: false },
      select: {
        id: true,
        descricao: true,
        valorCents: true,
        status: true,
        tipoHonorario: true,
        dataVencimento: true,
        dataPagamento: true,
        contaId: true,
        clienteId: true,
        casoId: true,
        cliente: { select: { nome: true } },
        conta: { select: { nome: true } },
      },
      orderBy: { dataVencimento: "desc" },
    }),
    prisma.tarefa.findMany({
      where: { casoId: id },
      select: {
        id: true,
        titulo: true,
        status: true,
        prazoFatal: true,
        prazo: true,
        responsavelId: true,
      },
      orderBy: [{ done: "asc" }, { prazo: "asc" }],
    }),
    listEventos({ casoId: id }),
    prisma.processo.findMany({
      where: { casoId: id, excluidoEm: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        numeroCnj: true,
        classe: true,
        status: true,
        vara: true,
        tribunal: true,
        prazos: {
          where: { excluidoEm: null, status: "pendente" },
          select: { dataFatal: true },
          orderBy: { dataFatal: "asc" },
        },
      },
    }),
    prisma.documento.findMany({
      where: { casoId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, nome: true, tipo: true, status: true, createdAt: true },
    }),
    getInformacoes({ tipo: "caso", id }),
    caso.clientePrincipalId != null ? getInformacoes({ tipo: "cliente", id: caso.clientePrincipalId }, { soFixadas: true }) : [],
  ])

  const processos: ProcessoMini[] = processoRows.map((p) => ({
    id: p.id,
    numeroCnj: p.numeroCnj,
    classe: p.classe,
    status: p.status as ProcessoStatus,
    vara: p.vara,
    tribunal: p.tribunal,
    prazosPendentes: p.prazos.length,
    proximaDataFatal: p.prazos[0] ? p.prazos[0].dataFatal.toISOString().slice(0, 10) : null,
  }))

  const documentos: CasoDocumentoRow[] = documentoRows.map((d) => ({
    id: d.id,
    nome: d.nome,
    tipo: d.tipo,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
  }))

  const lancamentos: LancamentoRow[] = lancRows.map((r) => {
    const vencDate = r.dataVencimento ?? r.dataLancamento
    const recorrente = r.recorrenteParentId != null || r._count.recorrenteFilhos > 0
    return {
      id: r.id,
      dir: r.tipo === "saida" ? "out" : "in",
      desc: r.descricao ?? "—",
      party: r.cliente?.nome ?? r.pagoPara ?? null,
      caso: caso.titulo,
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

  const honorarios: HonorarioRow[] = honRows.map((r) =>
    lancamentoToHonorarioRow({
      id: r.id,
      descricao: r.descricao,
      valorCents: r.valorCents,
      status: r.status,
      tipoHonorario: r.tipoHonorario,
      dataVencimento: r.dataVencimento,
      dataPagamento: r.dataPagamento,
      contaId: r.contaId,
      clienteId: r.clienteId,
      casoId: r.casoId,
      clienteNome: r.cliente?.nome ?? null,
      casoTitulo: caso.titulo,
      contaNome: r.conta?.nome ?? null,
    }),
  )

  const tarefas: CasoTarefaRow[] = tarefaRows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    status: r.status,
    prazoFatal: r.prazoFatal,
    prazo: isoDate(r.prazo) ?? "",
    responsavelId: r.responsavelId,
  }))

  const entradas = lancamentos.filter((l) => l.dir === "in")
  return {
    id: caso.id,
    titulo: caso.titulo,
    tipo: caso.tipo as CasoDetail["tipo"],
    area: caso.area,
    status: caso.status,
    responsavel: caso.responsavel,
    responsavelUserId: caso.responsavelUserId,
    responsavelUser: caso.responsavelUser?.nome ?? null,
    clienteId: caso.clientePrincipalId,
    cliente: caso.clientePrincipal?.nome ?? null,
    contrato:
      caso.contrato && !caso.contrato.excluidoEm
        ? { id: caso.contrato.id, titulo: caso.contrato.titulo, dataFechamento: isoDate(caso.contrato.dataFechamento) }
        : null,
    dataCriacao: isoDate(caso.dataCriacao),
    ultimaMovimentacao: isoDate(caso.ultimaMovimentacao),
    nomeCurto: caso.nomeCurto,
    cor: caso.cor,
    prazo: isoDate(caso.prazo),
    descricao: caso.descricao,
    modeloOrigemId: caso.modeloOrigemId,
    responsaveis: caso.responsaveis
      .slice()
      .sort((a, b) => a.conta.ordem - b.conta.ordem)
      .map((cr) => ({ contaId: cr.contaId, nome: cr.conta.titular ?? cr.conta.nome, percentual: cr.percentual })),
    financeiro: {
      recebidoCents: entradas.filter((l) => l.pago).reduce((a, l) => a + l.valorCents, 0),
      abertoCents: entradas.filter((l) => !l.pago).reduce((a, l) => a + l.valorCents, 0),
      honorarios,
      lancamentos,
    },
    tarefas,
    eventos,
    processos,
    documentos,
    anotacoes,
    fixadasCliente,
  }
}

/**
 * Lista da página /casos — escopada por papel (advogado vê só os seus, mesma
 * regra do detalhe). Identidade + contrato + contagem de processos + soma dos
 * honorários (fee-lançamentos) + o andamento das tarefas do caso (o caso é o
 * "projeto" do quadro). `verFin=false` zera os valores.
 */
export async function listCasosPagina(user: SessionUser, verFin: boolean): Promise<CasoPageRow[]> {
  const scope = await scopeCasoWhere(user)
  const hoje = hojeSP()
  const tarefasPorCaso = new Map<number, { total: number; feitas: number; vencidas: number }>()
  for (const t of await prisma.tarefa.findMany({
    where: { casoId: { not: null } },
    select: { casoId: true, status: true, prazo: true },
  })) {
    const c = tarefasPorCaso.get(t.casoId!) ?? { total: 0, feitas: 0, vencidas: 0 }
    c.total++
    if (t.status === "done") c.feitas++
    else if (t.prazo.toISOString().slice(0, 10) < hoje) c.vencidas++
    tarefasPorCaso.set(t.casoId!, c)
  }
  const rows = await prisma.caso.findMany({
    where: { AND: [scope, { excluidoEm: null }] },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      area: true,
      status: true,
      responsavel: true,
      responsavelUserId: true,
      responsavelUser: { select: { nome: true } },
      clientePrincipalId: true,
      clientePrincipal: { select: { nome: true } },
      contratoId: true,
      contrato: { select: { titulo: true, dataFechamento: true, excluidoEm: true } },
      dataCriacao: true,
      ultimaMovimentacao: true,
      nomeCurto: true,
      prazo: true,
      _count: { select: { processos: { where: { excluidoEm: null } } } },
      lancamentos: { where: { tipo: "entrada", subTipo: "honorario", isAnomalia: false }, select: { valorCents: true, status: true } },
    },
  })
  const out: CasoPageRow[] = rows.map((r) => {
    const fees = verFin ? r.lancamentos : []
    const recebido = fees.filter((l) => l.status === "feito").reduce((a, l) => a + Math.abs(l.valorCents), 0)
    const total = fees.reduce((a, l) => a + Math.abs(l.valorCents), 0)
    const contratoVivo = r.contrato && !r.contrato.excluidoEm ? r.contrato : null
    const tar = tarefasPorCaso.get(r.id) ?? { total: 0, feitas: 0, vencidas: 0 }
    return {
      id: r.id,
      titulo: r.titulo,
      nomeCurto: r.nomeCurto,
      prazo: isoDate(r.prazo),
      tarefasTotal: tar.total,
      tarefasFeitas: tar.feitas,
      tarefasAbertas: tar.total - tar.feitas,
      tarefasVencidas: tar.vencidas,
      tipo: r.tipo as CasoPageRow["tipo"],
      area: r.area,
      status: r.status,
      clienteId: r.clientePrincipalId,
      cliente: r.clientePrincipal?.nome ?? null,
      responsavelUserId: r.responsavelUserId,
      responsavel: r.responsavelUser?.nome ?? r.responsavel ?? null,
      contratoId: contratoVivo ? r.contratoId : null,
      contrato: contratoVivo ? (contratoVivo.titulo ?? `Contrato de ${brDate(contratoVivo.dataFechamento)}`) : null,
      numProcessos: r._count.processos,
      honorariosCents: total,
      recebidoCents: recebido,
      abertoCents: total - recebido,
      dataCriacao: isoDate(r.dataCriacao),
      ultimaMovimentacao: isoDate(r.ultimaMovimentacao ?? r.dataCriacao),
    }
  })
  // Mais recente primeiro (movimentação → criação); sem data vai para o fim.
  return out.sort((a, b) => (b.ultimaMovimentacao ?? "").localeCompare(a.ultimaMovimentacao ?? ""))
}

const brDate = (d: Date) => {
  const iso = d.toISOString().slice(0, 10)
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}
