// Relatório financeiro por período — a ÚNICA consulta do módulo que monta o
// documento inteiro (resumo, DRE, composições, inadimplência, contas, acerto
// entre sócios, evolução e o detalhe dos lançamentos) para uma faixa de datas
// arbitrária. SERVER ONLY (importa prisma).
//
// Semântica (a mesma do resto do módulo, para os números baterem com as abas):
//   · realizado  → status 'feito', pela dataPagamento (caixa)
//   · em aberto  → status 'aberto', pelo dataVencimento (competência)
//   · isAnomalia → sempre excluído (artefatos de saldo/compensação), exceto nos
//     saldos de conta, que re-incluem as transferências internas (BALANCE_MOV)
import { prisma } from "@/lib/db"
import { getEscritorio } from "@/lib/settings"
import {
  comporAging,
  comporCategorias,
  comporDevedores,
  comporDre,
  comporEvolucao,
  comporExtratoContas,
  comporHonorarios,
  comporKpis,
  comporRateios,
  type AbertoRow,
} from "./relatorio-core"
import {
  faixaAnterior,
  faixaLabel,
  faixaRange,
  mesesDaFaixa,
  mesesNaFaixa,
  type Faixa,
} from "./relatorio-periodo"
import { LANC_SELECT, toLancamentoRow } from "./lancamento-map"
import { BALANCE_MOV, FEE, REVENUE, getAcertoSocios } from "./queries"
import type { RelatorioFinanceiro, RelatorioSocios, TransferenciaRow } from "./types"

function startOfToday(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function diasDeAtraso(venc: Date | null, hoje: Date): number {
  if (!venc) return -1 // sem vencimento → trata como "a vencer"
  return Math.round((hoje.getTime() - new Date(venc.getFullYear(), venc.getMonth(), venc.getDate()).getTime()) / 86_400_000)
}
function mesKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export async function getRelatorioFinanceiro(faixa: Faixa): Promise<RelatorioFinanceiro> {
  const { start, end } = faixaRange(faixa)
  const anterior = faixaAnterior(faixa)
  const { start: prevStart, end: prevEnd } = faixaRange(anterior)
  const hoje = startOfToday()

  const pagoNoPeriodo = { dataPagamento: { gte: start, lt: end } }
  const vencNoPeriodo = { dataVencimento: { gte: start, lt: end } }
  // "Vencido do período" = venceu DENTRO da faixa E já passou de hoje; num
  // período futuro os dois limites não se cruzam e o agregado dá 0 naturalmente.
  const limiteVencido = end < hoje ? end : hoje

  const [
    recebido,
    pago,
    aReceber,
    aPagar,
    vencidoPeriodo,
    recebidoPrev,
    pagoPrev,
    honoRows,
    catRows,
    proLabore,
    abertasTodas,
    contas,
    movsAntes,
    movsPeriodo,
    acertoPeriodo,
    acertoAcumulado,
    transfRows,
    rateioRows,
    movsRealizados,
    lancRows,
  ] = await Promise.all([
    prisma.lancamento.aggregate({ _sum: { valorCents: true }, _count: true, where: { ...REVENUE, status: "feito", ...pagoNoPeriodo } }),
    prisma.lancamento.aggregate({ _sum: { valorCents: true }, _count: true, where: { tipo: "saida", isAnomalia: false, status: "feito", ...pagoNoPeriodo } }),
    prisma.lancamento.aggregate({ _sum: { valorCents: true }, _count: true, where: { ...REVENUE, status: "aberto", ...vencNoPeriodo } }),
    prisma.lancamento.aggregate({ _sum: { valorCents: true }, _count: true, where: { tipo: "saida", isAnomalia: false, status: "aberto", ...vencNoPeriodo } }),
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      _count: true,
      where: { ...REVENUE, status: "aberto", dataVencimento: { gte: start, lt: limiteVencido } },
    }),
    prisma.lancamento.aggregate({ _sum: { valorCents: true }, where: { ...REVENUE, status: "feito", dataPagamento: { gte: prevStart, lt: prevEnd } } }),
    prisma.lancamento.aggregate({ _sum: { valorCents: true }, where: { tipo: "saida", isAnomalia: false, status: "feito", dataPagamento: { gte: prevStart, lt: prevEnd } } }),
    // composição dos honorários recebidos no período
    prisma.lancamento.findMany({
      where: { ...FEE, status: "feito", ...pagoNoPeriodo },
      select: { tipoHonorario: true, valorCents: true },
    }),
    // custos pagos no período, por categoria
    prisma.lancamento.findMany({
      where: { tipo: "saida", isAnomalia: false, status: "feito", ...pagoNoPeriodo },
      select: { valorCents: true, categoria: { select: { nome: true, cor: true } } },
    }),
    prisma.custoFixo.aggregate({ _sum: { valorCents: true }, where: { ativo: true, categoria: "pro_labore" } }),
    // inadimplência: foto de HOJE de todo o contas-a-receber em aberto
    prisma.lancamento.findMany({
      where: { ...REVENUE, status: "aberto" },
      select: { valorCents: true, dataVencimento: true, clienteId: true, cliente: { select: { nome: true } } },
    }),
    prisma.conta.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, titular: true, kind: true, valorInicialCents: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    // Saldo de abertura da faixa. Inclui os movimentos realizados SEM data de
    // pagamento (a importação da Astrea deixa alguns assim): eles são caixa de
    // verdade e precisam cair em algum lado — no mais antigo, a abertura — ou o
    // saldo final do relatório não fecharia com a aba Contas & Balanço.
    // (O `OR` vai dentro de um AND: o próprio BALANCE_MOV já usa `OR` para
    // re-incluir as transferências internas — sobrescrevê-lo traria de volta os
    // artefatos de saldo e dobraria a abertura.)
    prisma.lancamento.findMany({
      where: { ...BALANCE_MOV, AND: [{ OR: [{ dataPagamento: { lt: start } }, { dataPagamento: null }] }] },
      select: { contaId: true, tipo: true, valorCents: true },
    }),
    prisma.lancamento.findMany({
      where: { ...BALANCE_MOV, ...pagoNoPeriodo },
      select: { contaId: true, tipo: true, valorCents: true },
    }),
    getAcertoSocios({ start, end }),
    getAcertoSocios(),
    prisma.transferencia.findMany({
      where: { dataMovimento: { gte: start, lt: end } },
      select: {
        id: true,
        valorCents: true,
        dataMovimento: true,
        descricao: true,
        contaOrigem: { select: { nome: true, kind: true } },
        contaDestino: { select: { nome: true, kind: true } },
      },
      orderBy: { dataMovimento: "desc" },
    }),
    // rateio: honorários recebidos no período em casos com split definido
    prisma.lancamento.findMany({
      where: { ...REVENUE, status: "feito", ...pagoNoPeriodo, casoId: { not: null } },
      select: {
        valorCents: true,
        casoId: true,
        caso: {
          select: {
            titulo: true,
            clientePrincipal: { select: { nome: true } },
            responsaveis: { select: { contaId: true, percentual: true } },
          },
        },
      },
    }),
    // evolução mensal do caixa realizado dentro da faixa
    prisma.lancamento.findMany({
      where: { isAnomalia: false, status: "feito", ...pagoNoPeriodo },
      select: { tipo: true, valorCents: true, dataPagamento: true },
    }),
    // detalhe: tudo que VENCE ou foi BAIXADO no período
    prisma.lancamento.findMany({
      where: { isAnomalia: false, OR: [vencNoPeriodo, pagoNoPeriodo] },
      select: LANC_SELECT,
    }),
  ])

  const kpis = comporKpis(
    {
      recebidoCents: Math.abs(recebido._sum.valorCents ?? 0),
      recebidoCount: recebido._count,
      pagoCents: Math.abs(pago._sum.valorCents ?? 0),
      pagoCount: pago._count,
      aReceberCents: Math.abs(aReceber._sum.valorCents ?? 0),
      aReceberCount: aReceber._count,
      vencidoPeriodoCents: Math.abs(vencidoPeriodo._sum.valorCents ?? 0),
      vencidoPeriodoCount: vencidoPeriodo._count,
      aPagarCents: Math.abs(aPagar._sum.valorCents ?? 0),
      aPagarCount: aPagar._count,
    },
    {
      recebidoCents: Math.abs(recebidoPrev._sum.valorCents ?? 0),
      pagoCents: Math.abs(pagoPrev._sum.valorCents ?? 0),
    },
  )

  const abertas: AbertoRow[] = abertasTodas.map((r) => ({
    valorCents: r.valorCents,
    diasAtraso: diasDeAtraso(r.dataVencimento, hoje),
    clienteId: r.clienteId,
    cliente: r.cliente?.nome ?? null,
  }))
  const vencidas = abertas.filter((r) => r.diasAtraso > 0)

  const linhasContas = comporExtratoContas(contas, movsAntes, movsPeriodo)
  const nomePorConta = new Map(contas.map((c) => [c.id, c.titular ?? c.nome]))

  const socios: RelatorioSocios = {
    periodo: acertoPeriodo,
    acumulado: acertoAcumulado,
    disponivel: acertoAcumulado.socios.length === 2,
    transferencias: transfRows
      .filter((t) => t.contaOrigem.kind === "socio" && t.contaDestino.kind === "socio")
      .map<TransferenciaRow>((t) => ({
        id: t.id,
        valorCents: t.valorCents,
        data: t.dataMovimento ? t.dataMovimento.toISOString() : null,
        descricao: t.descricao,
        contaOrigem: t.contaOrigem.nome,
        contaDestino: t.contaDestino.nome,
      })),
    rateios: comporRateios(
      rateioRows
        .filter((r) => r.casoId != null && (r.caso?.responsaveis.length ?? 0) > 0)
        .map((r) => ({
          casoId: r.casoId as number,
          caso: r.caso?.titulo ?? "—",
          cliente: r.caso?.clientePrincipal?.nome ?? null,
          valorCents: r.valorCents,
          responsaveis: r.caso?.responsaveis ?? [],
        })),
      nomePorConta,
    ),
  }

  const rotulo = faixaLabel(faixa)
  const escritorio = await getEscritorio()

  return {
    faixa,
    titulo: rotulo.titulo,
    subtitulo: rotulo.sub,
    anteriorTitulo: faixaLabel(anterior).titulo,
    geradoEm: new Date().toISOString(),
    hoje: toISO(hoje),
    escritorio: {
      razaoSocial: escritorio.razaoSocial ?? null,
      cnpj: escritorio.cnpj ?? null,
      oab: escritorio.oab ?? null,
    },
    kpis,
    dre: comporDre(
      kpis.recebidoCents,
      kpis.pagoCents,
      proLabore._sum.valorCents ?? 0,
      mesesNaFaixa(faixa),
    ),
    honorarios: comporHonorarios(honoRows),
    categorias: comporCategorias(
      catRows.map((r) => ({ categoria: r.categoria?.nome ?? null, cor: r.categoria?.cor ?? null, valorCents: r.valorCents })),
    ),
    inadimplencia: {
      aging: comporAging(abertas),
      devedores: comporDevedores(abertas),
      totalCents: vencidas.reduce((a, r) => a + Math.abs(r.valorCents), 0),
      count: vencidas.length,
    },
    contas: {
      linhas: linhasContas,
      saldoInicialCents: linhasContas.reduce((a, l) => a + l.saldoInicialCents, 0),
      entradasCents: linhasContas.reduce((a, l) => a + l.entradasCents, 0),
      saidasCents: linhasContas.reduce((a, l) => a + l.saidasCents, 0),
      saldoFinalCents: linhasContas.reduce((a, l) => a + l.saldoFinalCents, 0),
    },
    socios,
    evolucao: comporEvolucao(
      movsRealizados
        .filter((m) => m.dataPagamento != null)
        .map((m) => ({ mes: mesKey(m.dataPagamento as Date), tipo: m.tipo, valorCents: m.valorCents })),
      mesesDaFaixa(faixa),
    ),
    lancamentos: lancRows.map(toLancamentoRow).sort((a, b) => (a.venc ?? "").localeCompare(b.venc ?? "")),
  }
}
