// Clientes — read layer for the individual cliente page. SERVER ONLY.
// Financial semantics mirror src/lib/finance/queries.ts: anomalia rows are
// excluded, money is integer centavos, "vencido" is relative to the real today.
import { prisma } from "@/lib/db"
import { getCobrancaCliente } from "./cobranca"
import { getDocumentos } from "@/lib/documentos/queries"
import { listEventos } from "@/lib/agenda/queries"
import {
  getCategoriaOptions,
  getClienteOptions,
  getContaOptions,
  getContratosPorCliente,
  getFornecedorOptions,
} from "@/lib/finance/queries"
import type { LancamentoRow } from "@/lib/finance/types"
import type { ProcessoMini, ProcessoStatus } from "@/lib/processos/types"
import type { ClienteCasoRow, ClienteDetail, ClienteHeader, ClienteResumo, ClienteTarefaRow } from "./types"

const isoDate = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null)

const splitJoined = (s: string | null): string[] =>
  (s ?? "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean)

export async function getClienteDetail(id: number): Promise<ClienteDetail | null> {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      apelido: true,
      tipo: true,
      classificacao: true,
      cpfCnpj: true,
      simplesNacional: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      uf: true,
      cep: true,
      emails: true,
      telefones: true,
      origem: true,
    },
  })
  if (!cliente) return null

  const [lancRows, contratos, casoRows, tarefaRows, eventos, documentos, cobranca, cats, clienteOpts, fornecedores, contas] = await Promise.all([
    prisma.lancamento.findMany({
      where: { clienteId: id, isAnomalia: false },
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
        caso: { select: { titulo: true } },
        categoria: { select: { nome: true } },
        conta: { select: { nome: true } },
        _count: { select: { recorrenteFilhos: true } },
      },
      orderBy: { dataVencimento: "desc" },
    }),
    getContratosPorCliente(id),
    prisma.caso.findMany({
      where: { clientePrincipalId: id, excluidoEm: null },
      select: {
        id: true,
        titulo: true,
        tipo: true,
        status: true,
        responsavel: true,
        lancamentos: { where: { tipo: "entrada", isAnomalia: false }, select: { valorCents: true } },
        processos: {
          where: { excluidoEm: null },
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
              orderBy: { dataFatal: "asc" },
              take: 1,
              select: { dataFatal: true },
            },
            _count: { select: { prazos: { where: { excluidoEm: null, status: "pendente" } } } },
          },
        },
      },
      orderBy: { titulo: "asc" },
    }),
    prisma.tarefa.findMany({
      where: { clienteId: id },
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
    listEventos({ clienteId: id }),
    getDocumentos({ clienteId: id }),
    getCobrancaCliente(id),
    getCategoriaOptions(),
    getClienteOptions(),
    getFornecedorOptions(),
    getContaOptions(),
  ])

  const header: ClienteHeader = {
    id: cliente.id,
    nome: cliente.nome,
    apelido: cliente.apelido,
    tipo: cliente.tipo as ClienteHeader["tipo"],
    classificacao: cliente.classificacao as ClienteHeader["classificacao"],
    cpfCnpj: cliente.cpfCnpj,
    simplesNacional: cliente.simplesNacional,
    logradouro: cliente.logradouro,
    numero: cliente.numero,
    complemento: cliente.complemento,
    bairro: cliente.bairro,
    cidade: cliente.cidade,
    uf: cliente.uf,
    cep: cliente.cep,
    emails: splitJoined(cliente.emails),
    telefones: splitJoined(cliente.telefones),
    origem: cliente.origem,
  }

  const lancamentos: LancamentoRow[] = lancRows.map((r) => {
    const vencDate = r.dataVencimento ?? r.dataLancamento
    const recorrente = r.recorrenteParentId != null || r._count.recorrenteFilhos > 0
    return {
      id: r.id,
      dir: r.tipo === "saida" ? "out" : "in",
      desc: r.descricao ?? "—",
      party: cliente.nome,
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

  const casos: ClienteCasoRow[] = casoRows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo as ClienteCasoRow["tipo"],
    status: r.status,
    responsavel: r.responsavel,
    honorariosCents: r.lancamentos.reduce((a, l) => a + Math.abs(l.valorCents), 0),
    honorariosCount: r.lancamentos.length,
    processos: r.processos.map(
      (p): ProcessoMini => ({
        id: p.id,
        numeroCnj: p.numeroCnj,
        classe: p.classe,
        status: p.status as ProcessoStatus,
        vara: p.vara,
        tribunal: p.tribunal,
        prazosPendentes: p._count.prazos,
        proximaDataFatal: p.prazos[0] ? p.prazos[0].dataFatal.toISOString().slice(0, 10) : null,
      }),
    ),
  }))

  const tarefas: ClienteTarefaRow[] = tarefaRows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    status: r.status,
    prio: r.prio,
    data: isoDate(r.data),
    hora: r.hora,
    prazo: isoDate(r.prazo),
    responsavelId: r.responsavelId,
  }))

  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const resumo: ClienteResumo = {
    casosTotal: casos.length,
    casosAtivos: casos.filter((c) => c.status === "Ativo").length,
    recebidoCents: lancamentos.filter((l) => l.dir === "in" && l.pago).reduce((a, l) => a + l.valorCents, 0),
    aReceberCents: lancamentos.filter((l) => l.dir === "in" && !l.pago).reduce((a, l) => a + l.valorCents, 0),
    vencidoCents: lancamentos
      .filter((l) => l.dir === "in" && !l.pago && l.venc !== null && new Date(l.venc) < today)
      .reduce((a, l) => a + l.valorCents, 0),
  }

  return {
    header,
    resumo,
    lancamentos,
    contratos,
    casos,
    tarefas,
    eventos,
    documentos,
    anotacoes: cobranca.anotacoes,
    cobranca: cobranca.estado,
    lancOptions: { cats, clientes: clienteOpts.map((c) => c.nome), fornecedores, contas, casos: casoRows.map((c) => c.titulo) },
  }
}
