// Casos — read layer for the caso detail modal + paginated list. SERVER ONLY.
import type { Prisma } from "@prisma/client"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { type ListQuery, type Paginated, paginated } from "@/lib/list"
import { listEventos } from "@/lib/agenda/queries"
import type { HonorarioRow, HonorarioStatus, LancamentoRow } from "@/lib/finance/types"
import { scopeCasoWhere } from "@/lib/processos/rbac"
import type { ProcessoMini, ProcessoStatus } from "@/lib/processos/types"
import type { CasoDetail, CasoDocumentoRow, CasoListRow, CasoTarefaRow } from "./types"

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
  if (filtros.q) and.push({ OR: [{ titulo: { contains: filtros.q } }, { numeroProcesso: { contains: filtros.q } }] })

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
      numeroProcesso: true,
      tribunal: true,
      vara: true,
      instancia: true,
      tipoAcao: true,
      valorCausaCents: true,
      dataDistribuicao: true,
      dataCriacao: true,
      ultimaMovimentacao: true,
      responsaveis: {
        select: { contaId: true, percentual: true, conta: { select: { nome: true, titular: true, ordem: true } } },
      },
    },
  })
  if (!caso) return null

  const [lancRows, honRows, tarefaRows, eventos, processoRows, documentoRows] = await Promise.all([
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
    prisma.honorario.findMany({
      where: { casoId: id },
      select: {
        id: true,
        descricao: true,
        dataVencimento: true,
        valorCents: true,
        status: true,
        tipo: true,
        dataPagamento: true,
        clienteId: true,
        contaId: true,
        lancamentoId: true,
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
        prio: true,
        data: true,
        hora: true,
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

  const honorarios: HonorarioRow[] = honRows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    cliente: r.cliente?.nome ?? null,
    clienteId: r.clienteId,
    caso: caso.titulo,
    casoId: id,
    vencimento: r.dataVencimento ? r.dataVencimento.toISOString() : null,
    valorCents: r.valorCents,
    status: (r.status ?? null) as HonorarioStatus | null,
    tipo: (r.tipo ?? null) as HonorarioRow["tipo"],
    dataPagamento: r.dataPagamento ? r.dataPagamento.toISOString() : null,
    contaId: r.contaId,
    conta: r.conta?.nome ?? null,
    lancamentoId: r.lancamentoId,
  }))

  const tarefas: CasoTarefaRow[] = tarefaRows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    status: r.status,
    prio: r.prio,
    data: isoDate(r.data),
    hora: r.hora,
    prazo: isoDate(r.prazo),
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
    numeroProcesso: caso.numeroProcesso,
    tribunal: caso.tribunal,
    vara: caso.vara,
    instancia: caso.instancia,
    tipoAcao: caso.tipoAcao,
    valorCausaCents: caso.valorCausaCents,
    dataDistribuicao: isoDate(caso.dataDistribuicao),
    dataCriacao: isoDate(caso.dataCriacao),
    ultimaMovimentacao: isoDate(caso.ultimaMovimentacao),
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
  }
}
