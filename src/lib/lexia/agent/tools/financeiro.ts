// Financeiro tools — readonly reports + confirmation-gated ledger writes.
import { z } from "zod"
import {
  getAcertoSocios,
  getAcertoSociosDetalhado,
  getDre,
  getHonorarioDetail,
  getHonorarios,
  getHonorarioTotals,
  getKpis,
  getLancamentos,
  getMonthlySummary,
  getOverdue,
  getReceivablesAging,
} from "@/lib/finance/queries"
import {
  bulkLancamentos,
  criarLancamentos,
  deleteLancamento,
  pagarLancamento,
  setCasoResponsaveis,
  updateLancamento,
} from "@/lib/finance/mutations"
import { novoLancamentoSchema, pagarLancamentoSchema } from "@/lib/finance/schemas"
import { faixaRange, normalizeFaixa } from "@/lib/finance/relatorio-periodo"
import { mesclarClientes } from "@/lib/clientes/mutations"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { dateStr, idReq, money } from "@/lib/validation"
import { ROLES_FINANCEIRO } from "@/lib/users/types"
import { dataBr } from "../confirmar"
import { defineTool } from "../types"
import { brl, cap, limite } from "./shared"


/** Contas de SÓCIO ativas — são as únicas que podem receber percentual no rateio. */
async function contasDeSocio() {
  return prisma.conta.findMany({ where: { kind: "socio", ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } })
}

/** Nome de exibição de uma conta (sócio aparece pelo titular). */
const nomeConta = (c?: { nome: string; titular?: string | null } | null) => (c ? (c.titular ?? c.nome) : null)

/**
 * Valida TODOS os vínculos do patch antes de gravar. Dinheiro no caso/cliente
 * errado é caro de desfazer, e um FK solto voltaria ao chat como erro genérico.
 */
async function assertVinculosLancamento(id: number, patch: EditarLancamentoIn) {
  const lanc = await prisma.lancamento.findUnique({
    where: { id },
    select: { tipo: true, clienteId: true, casoId: true },
  })
  if (!lanc) throw new UserError("Lançamento não encontrado.")

  // Cliente e caso são validados pelo estado DEPOIS do patch: trocar só o
  // cliente não pode deixar pendurado um caso que é de outra pessoa.
  const clienteId = patch.clienteId !== undefined ? patch.clienteId : lanc.clienteId
  const casoId = patch.casoId !== undefined ? patch.casoId : lanc.casoId
  if (casoId != null) {
    const caso = await prisma.caso.findUnique({
      where: { id: casoId },
      select: { excluidoEm: true, clientePrincipalId: true, titulo: true },
    })
    if (!caso || caso.excluidoEm) throw new UserError("Caso não encontrado (ou excluído).")
    if (clienteId != null && caso.clientePrincipalId != null && caso.clientePrincipalId !== clienteId) {
      throw new UserError(
        `O caso "${caso.titulo}" é de outro cliente. Corrija o cliente e o caso na MESMA chamada, ou desvincule o caso (casoId: null).`,
      )
    }
  }
  if (patch.clienteId != null) {
    const cli = await prisma.cliente.findUnique({ where: { id: patch.clienteId }, select: { id: true } })
    if (!cli) throw new UserError("Contato não encontrado.")
  }
  if (patch.contaId != null) {
    const conta = await prisma.conta.findUnique({ where: { id: patch.contaId }, select: { ativo: true } })
    if (!conta) throw new UserError("Conta não encontrada. Veja os ids em listar_contas.")
    if (!conta.ativo) throw new UserError("Essa conta está inativa. Veja as ativas em listar_contas.")
  }
  if (patch.categoriaId != null) {
    const cat = await prisma.categoria.findUnique({ where: { id: patch.categoriaId }, select: { id: true } })
    if (!cat) throw new UserError("Categoria não encontrada. Veja os ids em listar_categorias.")
  }
  if (patch.campanhaId != null) {
    const camp = await prisma.campanha.findUnique({ where: { id: patch.campanhaId }, select: { id: true } })
    if (!camp) throw new UserError("Campanha não encontrada. Veja os ids em listar_campanhas.")
  }
  if (patch.socioResponsavelId != null) {
    if (lanc.tipo !== "saida") {
      throw new UserError(
        "Sócio responsável só vale para SAÍDA (despesa): é o que tira a despesa do rateio 50/50. A divisão de uma ENTRADA vem do rateio do caso (definir_rateio).",
      )
    }
    const conta = await prisma.conta.findUnique({
      where: { id: patch.socioResponsavelId },
      select: { kind: true, ativo: true },
    })
    if (!conta || !conta.ativo || conta.kind !== "socio") {
      throw new UserError("Essa conta não é de um sócio ativo. Veja os ids em listar_socios.")
    }
  }
  if (patch.recorrenteParentId != null && patch.recorrenteParentId === id) {
    throw new UserError("Um lançamento não pode ser a própria parcela-mãe.")
  }
}

const rateioSchema = z
  .object({
    casoId: idReq.describe("Id do caso cujo rateio será definido"),
    partes: z
      .array(
        z.object({
          contaId: idReq.describe("Id da conta de SÓCIO (via listar_socios)"),
          percentual: z.number().int().min(0).max(100).describe("Percentual do sócio neste caso (0–100)"),
        }),
      )
      .min(1)
      .max(10)
      .describe("Partes do rateio. A soma tem de ser exatamente 100; quem fica com 0% pode ser omitido."),
  })
  .refine((v) => v.partes.reduce((s, p) => s + p.percentual, 0) === 100, {
    message: "A soma dos percentuais do rateio tem de ser exatamente 100",
    path: ["partes"],
  })
type RateioIn = z.infer<typeof rateioSchema>

const mesArg = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional()
  .describe("Mês no formato YYYY-MM (padrão: mês corrente)")
const periodoArg = z.enum(["mes", "trimestre", "ano"]).optional().describe("Recorte do período (padrão: mes)")

// Partial edit for a single lançamento (usa updateLancamento — reassina o valor pelo tipo).
const editarLancamentoSchema = z.object({
  id: idReq.describe("Id do lançamento a editar (via listar_lancamentos ou detalhe_cliente)"),
  descricao: z.string().min(1).max(300).optional().describe("Nova descrição"),
  valorCents: money.optional().describe("Novo valor em centavos (magnitude; o sinal segue o tipo)"),
  dataVencimento: dateStr.nullish().describe("Novo vencimento (YYYY-MM-DD)"),
  dataPagamento: dateStr.nullish().describe("Data de pagamento (YYYY-MM-DD) — prefira pagar_lancamento p/ dar baixa"),
  status: z.enum(["aberto", "feito"]).optional().describe("'feito' = pago, 'aberto' = em aberto"),
  casoId: idReq
    .nullish()
    .describe(
      "Vincula o lançamento a um caso (id do caso). null DESVINCULA. Obtenha o id via buscar, listar_casos ou detalhe_cliente.",
    ),
  contaId: idReq
    .nullish()
    .describe(
      "Conta que RECEBEU (entrada) ou PAGOU (saída) — id via listar_contas. null limpa a conta. Vale para lançamento pago ou em aberto.",
    ),
  categoriaId: idReq.nullish().describe("Categoria do lançamento — id via listar_categorias. null limpa."),
  clienteId: idReq
    .nullish()
    .describe(
      "Contato (cliente) do lançamento — id via buscar/listar_clientes. null desvincula. Se o lançamento tem caso, mande o casoId na mesma chamada.",
    ),
  campanhaId: idReq
    .nullish()
    .describe("Campanha de anúncio do gasto — id via listar_campanhas. null desvincula."),
  recorrenteParentId: idReq
    .nullish()
    .describe(
      "Religa esta parcela à série de recorrência: id da parcela-mãe. null solta a parcela da série. Use para reatar parcelas recriadas à mão.",
    ),
  socioResponsavelId: idReq
    .nullish()
    .describe(
      "Só para SAÍDA: marca a despesa como 100% DESTE sócio (pró-labore, anuidade da OAB, custa de um caso de um só) — o acerto lança a cota inteira nele em vez de dividir 50/50, então quando ele é o próprio pagador a despesa sai do rateio. Id da conta de sócio via listar_socios; null volta a ser compartilhada.",
    ),
  isAnomalia: z
    .boolean()
    .optional()
    .describe(
      "Marca a linha como MOVIMENTO DE SALDO (repasse entre sócios, compensação de sistema), não como despesa/receita real: ela sai do acerto E de TODOS os relatórios financeiros (DRE, custos, KPIs). Não use para tirar uma despesa real do rateio — para isso existe socioResponsavelId.",
    ),
})
type EditarLancamentoIn = z.infer<typeof editarLancamentoSchema>

type PagarIn = { id: number; dataPagamento?: string | null; contaId?: number | null }

const excluirLancamentosSchema = z.object({
  ids: z.array(idReq).min(1).max(200).describe("Ids dos lançamentos a excluir (via detalhe_cliente/listar_lancamentos)"),
})

export const financeiroTools = [
  defineTool({
    name: "financeiro_resumo",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description:
      "Resumo financeiro do mês: KPIs (recebido, a receber, vencido, margens) e o fechamento mensal " +
      "(entradas, saídas, saldo). Use para perguntas como 'como está o caixa?', 'quanto recebi este mês?'.",
    schema: z.object({ mes: mesArg }),
    run: async (_ctx, { mes }) => ({ kpis: await getKpis(mes), mes: await getMonthlySummary(mes) }),
  }),
  defineTool({
    name: "listar_lancamentos",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description:
      "Lista lançamentos do ledger (entradas a receber e saídas a pagar) no período. " +
      "Use para 'o que tenho a pagar?', 'lançamentos de maio', extratos. Valores em centavos.",
    schema: z.object({ mes: mesArg, periodo: periodoArg, limite }),
    run: async (_ctx, { mes, periodo, limite: l }) => cap(await getLancamentos(mes, periodo ?? "mes"), l),
  }),
  defineTool({
    name: "inadimplencia",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description:
      "Recebíveis vencidos e o aging (faixas de atraso). Use para 'quem está devendo?', 'vencidos há mais de 60 dias'.",
    schema: z.object({ limite }),
    run: async (_ctx, { limite: l }) => ({ aging: await getReceivablesAging(), vencidos: cap(await getOverdue(50), l) }),
  }),
  defineTool({
    name: "dre",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description: "DRE do período (receita, custos por categoria, pró-labore, resultado). Use para análise de resultado.",
    schema: z.object({ mes: mesArg, periodo: periodoArg }),
    run: async (_ctx, { mes, periodo }) => getDre(mes, periodo ?? "mes"),
  }),
  defineTool({
    name: "listar_honorarios",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description: "Lista os honorários (recebíveis do ledger) e os totais pago/pendente. Use para 'honorários a receber', 'quanto falta receber'.",
    schema: z.object({ limite }),
    run: async (_ctx, { limite: l }) => ({ totais: await getHonorarioTotals(), itens: cap(await getHonorarios(), l) }),
  }),
  defineTool({
    name: "detalhe_honorario",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description: "Detalhe de um honorário por id (incluindo a série de parcelas). Um honorário é um lançamento (subTipo honorário); obtenha o id via listar_honorarios ou detalhe_cliente.",
    schema: z.object({ id: idReq.describe("Id do lançamento de honorário") }),
    run: async (_ctx, { id }) => (await getHonorarioDetail(id)) ?? { erro: "Honorário não encontrado" },
  }),
  defineTool({
    name: "acerto_socios",
    kind: "readonly",
    roles: ["socio"],
    description:
      "Acerto entre os sócios (direito vs. recebido, despesas rateadas) — quem deve quanto a quem. " +
      "Sem datas, cobre todo o histórico (é o número da aba Contas); com de/ate, só o que foi gerado no período (ex.: desde o último repasse). " +
      "Com detalhado: true devolve também cada honorário com a parte de cada sócio, cada despesa com a cota, as transferências e o que ficou FORA da conta com o motivo — é o relatório do repasse, pronto, sem SQL.",
    schema: z.object({
      de: dateStr.optional().describe("Início do período (YYYY-MM-DD), ex.: a data do último repasse"),
      ate: dateStr.optional().describe("Fim do período (YYYY-MM-DD, inclusivo)"),
      detalhado: z
        .boolean()
        .optional()
        .describe("true = totais + linha a linha (entradas, despesas, transferências, ignorados). Padrão false (só os totais)."),
    }),
    run: async (_ctx, { de, ate, detalhado }) => {
      if (detalhado) return getAcertoSociosDetalhado({ de, ate })
      if (!de && !ate) return getAcertoSocios()
      // Só os totais, mas recortados pela janela pedida.
      const faixa = normalizeFaixa(de, ate)
      return { faixa, ...(await getAcertoSocios(faixaRange(faixa))) }
    },
  }),

  // ── mutations (confirmation-gated) ──
  defineTool({
    name: "criar_lancamento",
    kind: "mutation",
    roles: ROLES_FINANCEIRO,
    description:
      "Cria um lançamento financeiro (entrada a receber ou saída a pagar), com recorrência opcional (única/mensal/parcelado). " +
      "Chame APENAS quando o usuário pedir explicitamente para lançar/registrar um valor — nunca para consultar. Valores em centavos.",
    schema: novoLancamentoSchema,
    resumo: (i) => {
      const v = i as z.infer<typeof novoLancamentoSchema>
      const tipo = v.dir === "in" ? "entrada" : "saída"
      const quem = v.party ? ` — ${v.party}` : ""
      const rec = v.modo && v.modo !== "unica" ? ` (${v.modo}${v.vezes ? ` ${v.vezes}x` : ""})` : ""
      return `Lançar ${tipo} de ${brl(v.valorCents)}${quem}, venc. ${v.venc}${rec}: ${v.desc}`
    },
    montarConfirmacao: async (_ctx, input) => {
      const v = input as z.infer<typeof novoLancamentoSchema>
      const det: { label: string; valor: string }[] = [
        { label: "Tipo", valor: v.dir === "in" ? "Entrada (a receber)" : "Saída (a pagar)" },
        { label: "Descrição", valor: v.desc },
        { label: "Valor", valor: brl(v.valorCents) },
        { label: "Vencimento", valor: dataBr(v.venc) },
      ]
      if (v.party) det.push({ label: v.dir === "in" ? "Cliente" : "Fornecedor", valor: v.party })
      if (v.modo && v.modo !== "unica") det.push({ label: "Recorrência", valor: `${v.modo}${v.vezes ? ` · ${v.vezes}x` : ""}` })
      return { resumo: `Lançar ${v.dir === "in" ? "entrada" : "saída"}: ${v.desc}`, detalhes: det }
    },
    run: async (_ctx, input) => criarLancamentos(input as z.infer<typeof novoLancamentoSchema>),
  }),
  defineTool({
    name: "pagar_lancamento",
    kind: "mutation",
    roles: ROLES_FINANCEIRO,
    description:
      "Dá baixa (marca como pago) em um lançamento existente, pelo id. Obtenha o id via listar_lancamentos. " +
      "Informe o contaId (via listar_contas) para registrar de qual conta o dinheiro saiu/entrou — é o que o acerto entre sócios lê. " +
      "Chame apenas quando o usuário pedir para marcar algo como pago/recebido.",
    schema: pagarLancamentoSchema.extend({ id: idReq.describe("Id do lançamento a pagar") }),
    resumo: (i) => {
      const v = i as { id: number; dataPagamento?: string | null }
      return `Dar baixa no lançamento #${v.id}`
    },
    montarConfirmacao: async (_ctx, input) => {
      const v = input as PagarIn
      const l = await prisma.lancamento.findUnique({ where: { id: v.id }, select: { descricao: true, valorCents: true } })
      const det: { label: string; valor: string }[] = [{ label: "Lançamento", valor: l?.descricao ?? `#${v.id}` }]
      if (l) det.push({ label: "Valor", valor: brl(l.valorCents) })
      det.push({ label: "Baixa em", valor: v.dataPagamento ? dataBr(v.dataPagamento) : "hoje" })
      if (v.contaId != null) {
        const c = await prisma.conta.findUnique({ where: { id: v.contaId }, select: { nome: true, titular: true } })
        det.push({ label: "Conta", valor: nomeConta(c) ?? `#${v.contaId}` })
      }
      return { resumo: `Dar baixa: ${l?.descricao ?? "lançamento"}`, detalhes: det }
    },
    run: async (_ctx, input) => {
      const v = input as PagarIn
      if (v.contaId != null) {
        const conta = await prisma.conta.findUnique({ where: { id: v.contaId }, select: { ativo: true } })
        if (!conta) throw new UserError("Conta não encontrada. Veja os ids em listar_contas.")
        if (!conta.ativo) throw new UserError("Essa conta está inativa. Veja as ativas em listar_contas.")
      }
      // A conta da baixa é parte da baixa: sem ela o acerto entre sócios não
      // sabe de qual bolso o dinheiro saiu/entrou.
      return pagarLancamento(v.id, { dataPagamento: v.dataPagamento ?? null, contaId: v.contaId ?? null })
    },
  }),
  defineTool({
    name: "excluir_lancamento",
    kind: "mutation",
    roles: ["socio"],
    description: "Exclui um lançamento financeiro pelo id (sensível — só sócios/admin). Obtenha o id via listar_lancamentos.",
    schema: z.object({ id: idReq.describe("Id do lançamento") }),
    resumo: (i) => `Excluir lançamento #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const l = await prisma.lancamento.findUnique({ where: { id: i.id }, select: { descricao: true, valorCents: true } })
      const det: { label: string; valor: string }[] = [{ label: "Lançamento", valor: l?.descricao ?? `#${i.id}` }]
      if (l) det.push({ label: "Valor", valor: brl(l.valorCents) })
      return { resumo: `Excluir lançamento: ${l?.descricao ?? "lançamento"}`, detalhes: det }
    },
    run: async (_ctx, i) => deleteLancamento(i.id),
  }),
  defineTool({
    name: "editar_lancamento",
    kind: "mutation",
    roles: ROLES_FINANCEIRO,
    description:
      "Edita um lançamento existente pelo id, sem recriá-lo (preserva histórico, série de parcelas e vínculos): descrição, valor, " +
      "vencimento, status, conta, categoria, contato, caso, campanha, série de recorrência e sócio responsável pela despesa. " +
      "Só os campos informados mudam. Use para corrigir a conta de um gasto, vincular dinheiro ao caso, tirar uma despesa do rateio " +
      "(socioResponsavelId) ou reagrupar parcelas num adiantamento. " +
      "Obtenha o id via detalhe_cliente (lista todas as parcelas do cliente) ou listar_lancamentos.",
    schema: editarLancamentoSchema,
    resumo: (i) => `Editar lançamento #${(i as EditarLancamentoIn).id}`,
    montarConfirmacao: async (_ctx, input) => {
      const v = input as EditarLancamentoIn
      const l = await prisma.lancamento.findUnique({
        where: { id: v.id },
        select: {
          descricao: true,
          valorCents: true,
          isAnomalia: true,
          conta: { select: { nome: true, titular: true } },
          categoria: { select: { nome: true } },
          cliente: { select: { nome: true } },
          caso: { select: { titulo: true } },
          campanha: { select: { nome: true } },
          socioResponsavel: { select: { nome: true, titular: true } },
        },
      })
      const det: { label: string; valor: string; valorAntigo?: string }[] = [
        { label: "Lançamento", valor: l?.descricao ?? `#${v.id}` },
      ]
      const linha = async (
        label: string,
        id: number | null | undefined,
        antigo: string | null | undefined,
        nome: (id: number) => Promise<string | null>,
      ) => {
        if (id === undefined) return
        const valor = id == null ? "— (desvincular)" : ((await nome(id)) ?? `#${id}`)
        det.push({ label, valor, valorAntigo: antigo ?? undefined })
      }
      if (v.descricao !== undefined) det.push({ label: "Nova descrição", valor: v.descricao, valorAntigo: l?.descricao ?? undefined })
      if (v.valorCents !== undefined) det.push({ label: "Valor", valor: brl(v.valorCents), valorAntigo: l ? brl(Math.abs(l.valorCents)) : undefined })
      if (v.dataVencimento !== undefined) det.push({ label: "Vencimento", valor: v.dataVencimento ? dataBr(v.dataVencimento) : "—" })
      if (v.dataPagamento !== undefined) det.push({ label: "Pagamento", valor: v.dataPagamento ? dataBr(v.dataPagamento) : "—" })
      if (v.status !== undefined) det.push({ label: "Status", valor: v.status === "feito" ? "Pago" : "Em aberto" })
      await linha("Caso", v.casoId, l?.caso?.titulo, async (id) =>
        (await prisma.caso.findUnique({ where: { id }, select: { titulo: true } }))?.titulo ?? null,
      )
      await linha("Contato", v.clienteId, l?.cliente?.nome, async (id) =>
        (await prisma.cliente.findUnique({ where: { id }, select: { nome: true } }))?.nome ?? null,
      )
      await linha("Conta", v.contaId, nomeConta(l?.conta), async (id) =>
        nomeConta(await prisma.conta.findUnique({ where: { id }, select: { nome: true, titular: true } })),
      )
      await linha("Categoria", v.categoriaId, l?.categoria?.nome, async (id) =>
        (await prisma.categoria.findUnique({ where: { id }, select: { nome: true } }))?.nome ?? null,
      )
      await linha("Campanha", v.campanhaId, l?.campanha?.nome, async (id) =>
        (await prisma.campanha.findUnique({ where: { id }, select: { nome: true } }))?.nome ?? null,
      )
      await linha("Despesa 100% de", v.socioResponsavelId, nomeConta(l?.socioResponsavel), async (id) =>
        nomeConta(await prisma.conta.findUnique({ where: { id }, select: { nome: true, titular: true } })),
      )
      if (v.socioResponsavelId === null && l?.socioResponsavel) {
        det[det.length - 1].valor = "— (volta a ser 50/50)"
      }
      if (v.recorrenteParentId !== undefined) {
        det.push({
          label: "Série de parcelas",
          valor: v.recorrenteParentId == null ? "— (solta da série)" : `parcela-mãe #${v.recorrenteParentId}`,
        })
      }
      if (v.isAnomalia !== undefined) {
        det.push({
          label: "Movimento de saldo",
          valor: v.isAnomalia ? "Sim — sai de TODOS os relatórios financeiros" : "Não — volta a contar como despesa/receita",
          valorAntigo: l ? (l.isAnomalia ? "Sim" : "Não") : undefined,
        })
      }
      return { resumo: `Editar lançamento: ${l?.descricao ?? `#${v.id}`}`, detalhes: det }
    },
    run: async (_ctx, input) => {
      const { id, ...patch } = input as EditarLancamentoIn
      await assertVinculosLancamento(id, input as EditarLancamentoIn)
      return updateLancamento(id, patch)
    },
  }),
  defineTool({
    name: "excluir_lancamentos",
    kind: "mutation",
    roles: ["socio"],
    description:
      "Exclui VÁRIOS lançamentos de uma vez, por lista de ids (sensível — só sócios/admin). " +
      "Use para remover as parcelas excedentes ao reagrupar/adiantar honorários. Obtenha os ids via detalhe_cliente/listar_lancamentos.",
    schema: excluirLancamentosSchema,
    resumo: (i) => `Excluir ${(i as z.infer<typeof excluirLancamentosSchema>).ids.length} lançamento(s)`,
    montarConfirmacao: async (_ctx, input) => {
      const v = input as z.infer<typeof excluirLancamentosSchema>
      const rows = await prisma.lancamento.findMany({ where: { id: { in: v.ids } }, select: { descricao: true, valorCents: true } })
      const soma = rows.reduce((a, r) => a + Math.abs(r.valorCents), 0)
      const det: { label: string; valor: string }[] = [
        { label: "Quantidade", valor: String(rows.length) },
        { label: "Soma", valor: brl(soma) },
      ]
      const nomes = rows.slice(0, 8).map((r) => r.descricao ?? "—").join("; ")
      if (nomes) det.push({ label: "Itens", valor: nomes + (rows.length > 8 ? ` +${rows.length - 8}` : "") })
      return { resumo: `Excluir ${v.ids.length} lançamento(s)`, detalhes: det }
    },
    run: async (_ctx, input) => bulkLancamentos((input as z.infer<typeof excluirLancamentosSchema>).ids, "excluir"),
  }),
  defineTool({
    name: "listar_socios",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description:
      "Lista as contas de SÓCIO ativas (id e nome). São elas que recebem percentual no rateio de um caso — use antes de definir_rateio para descobrir os contaId.",
    schema: z.object({}),
    run: async () => ({ socios: await contasDeSocio() }),
  }),
  defineTool({
    name: "definir_rateio",
    kind: "mutation",
    roles: ["socio"],
    description:
      "Define o rateio de um caso entre os sócios, SUBSTITUINDO o rateio atual por inteiro. A soma dos percentuais tem de ser 100 " +
      "(ex.: 50/50, 70/30, ou 100 para um sócio só). Veja o rateio atual em detalhe_caso e os ids das contas em listar_socios.",
    schema: rateioSchema,
    resumo: (i) => `Definir rateio do caso #${(i as RateioIn).casoId}`,
    montarConfirmacao: async (_ctx, input) => {
      const v = input as RateioIn
      const [caso, socios, atual] = await Promise.all([
        prisma.caso.findUnique({ where: { id: v.casoId }, select: { titulo: true } }),
        contasDeSocio(),
        prisma.casoResponsavel.findMany({ where: { casoId: v.casoId }, select: { contaId: true, percentual: true } }),
      ])
      const nome = (id: number) => socios.find((s) => s.id === id)?.nome ?? `Conta #${id}`
      const antes = new Map(atual.map((r) => [r.contaId, r.percentual]))
      const det: { label: string; valor: string; valorAntigo?: string }[] = v.partes.map((p) => ({
        label: nome(p.contaId),
        valor: `${p.percentual}%`,
        valorAntigo: antes.has(p.contaId) ? `${antes.get(p.contaId)}%` : undefined,
      }))
      // Sócio que estava no rateio e não aparece na lista nova sai dele.
      for (const r of atual) {
        if (!v.partes.some((p) => p.contaId === r.contaId)) {
          det.push({ label: nome(r.contaId), valor: "0% (sai do rateio)", valorAntigo: `${r.percentual}%` })
        }
      }
      return { resumo: `Rateio de "${caso?.titulo ?? `caso #${v.casoId}`}"`, detalhes: det }
    },
    run: async (_ctx, input) => {
      const v = input as RateioIn
      const caso = await prisma.caso.findUnique({ where: { id: v.casoId }, select: { excluidoEm: true } })
      if (!caso || caso.excluidoEm) throw new UserError("Caso não encontrado (ou excluído).")
      return setCasoResponsaveis(v.casoId, v.partes)
    },
  }),
  defineTool({
    name: "listar_contas",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description:
      "Lista as contas ativas (id, nome, titular e tipo: socio/banco/caixa). Use para descobrir o contaId ao corrigir de qual conta um lançamento saiu ou entrou.",
    schema: z.object({}),
    run: async () => ({
      contas: await prisma.conta.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, titular: true, kind: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),
    }),
  }),
  defineTool({
    name: "listar_categorias",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description: "Lista as categorias ativas de lançamento (id e nome). Use para descobrir o categoriaId ao classificar uma despesa/receita.",
    schema: z.object({}),
    run: async () => ({
      categorias: await prisma.categoria.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      }),
    }),
  }),
  defineTool({
    name: "mesclar_clientes",
    kind: "mutation",
    roles: ["socio"],
    description:
      "Junta DOIS cadastros do mesmo contato (duplicata): casos, lançamentos, contratos, leads, tarefas, eventos, documentos, partes e notas são todos repontados para o cadastro que fica, e o duplicado é EXCLUÍDO. Campos vazios do que fica são preenchidos com os do duplicado — nada é sobrescrito. Irreversível.",
    schema: z.object({
      destinoId: idReq.describe("Id do cadastro que FICA (sobrevive e recebe tudo)"),
      origemId: idReq.describe("Id do cadastro DUPLICADO, que será excluído depois de mover tudo"),
    }),
    resumo: (i) => {
      const v = i as { destinoId: number; origemId: number }
      return `Mesclar o contato #${v.origemId} no #${v.destinoId}`
    },
    montarConfirmacao: async (_ctx, input) => {
      const v = input as { destinoId: number; origemId: number }
      const [destino, origem, lanc, casos, contratos, leads] = await Promise.all([
        prisma.cliente.findUnique({ where: { id: v.destinoId }, select: { nome: true } }),
        prisma.cliente.findUnique({ where: { id: v.origemId }, select: { nome: true } }),
        prisma.lancamento.count({ where: { clienteId: v.origemId } }),
        prisma.caso.count({ where: { clientePrincipalId: v.origemId } }),
        prisma.contrato.count({ where: { clienteId: v.origemId } }),
        prisma.lead.count({ where: { clienteId: v.origemId } }),
      ])
      return {
        resumo: `Mesclar "${origem?.nome ?? `#${v.origemId}`}" em "${destino?.nome ?? `#${v.destinoId}`}"`,
        detalhes: [
          { label: "Fica", valor: destino?.nome ?? `#${v.destinoId}` },
          { label: "Será excluído", valor: origem?.nome ?? `#${v.origemId}` },
          { label: "Lançamentos que mudam de dono", valor: String(lanc) },
          { label: "Casos", valor: String(casos) },
          { label: "Contratos", valor: String(contratos) },
          { label: "Leads", valor: String(leads) },
          { label: "Atenção", valor: "A exclusão do duplicado é definitiva." },
        ],
      }
    },
    run: async (_ctx, input) => {
      const v = input as { destinoId: number; origemId: number }
      return mesclarClientes(v.destinoId, v.origemId)
    },
  }),
  // NB: honorários são lançamentos (subTipo='honorario') — editar/excluir usam as
  // tools de lançamento (editar_lancamento / excluir_lancamento / excluir_lancamentos).
]
