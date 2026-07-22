// Financeiro tools — readonly reports + confirmation-gated ledger writes.
import { z } from "zod"
import {
  getAcertoSocios,
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
  updateLancamento,
} from "@/lib/finance/mutations"
import { novoLancamentoSchema, pagarLancamentoSchema } from "@/lib/finance/schemas"
import { prisma } from "@/lib/db"
import { dateStr, idReq, money } from "@/lib/validation"
import { ROLES_FINANCEIRO } from "@/lib/users/types"
import { dataBr } from "../confirmar"
import { defineTool } from "../types"
import { brl, cap, limite } from "./shared"

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
})
type EditarLancamentoIn = z.infer<typeof editarLancamentoSchema>

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
    description: "Acerto entre os sócios (direito vs. recebido, despesas rateadas) — quem deve quanto a quem.",
    schema: z.object({}),
    run: async () => getAcertoSocios(),
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
      "Chame apenas quando o usuário pedir para marcar algo como pago/recebido.",
    schema: pagarLancamentoSchema.extend({ id: idReq.describe("Id do lançamento a pagar") }),
    resumo: (i) => {
      const v = i as { id: number; dataPagamento?: string | null }
      return `Dar baixa no lançamento #${v.id}`
    },
    montarConfirmacao: async (_ctx, input) => {
      const v = input as { id: number; dataPagamento?: string | null }
      const l = await prisma.lancamento.findUnique({ where: { id: v.id }, select: { descricao: true, valorCents: true } })
      const det: { label: string; valor: string }[] = [{ label: "Lançamento", valor: l?.descricao ?? `#${v.id}` }]
      if (l) det.push({ label: "Valor", valor: brl(l.valorCents) })
      det.push({ label: "Baixa em", valor: v.dataPagamento ? dataBr(v.dataPagamento) : "hoje" })
      return { resumo: `Dar baixa: ${l?.descricao ?? "lançamento"}`, detalhes: det }
    },
    run: async (_ctx, input) => {
      const v = input as { id: number; dataPagamento?: string | null }
      return pagarLancamento(v.id, { dataPagamento: v.dataPagamento ?? null })
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
      "Edita um lançamento existente pelo id: descrição, valor, vencimento e/ou status. Só os campos informados mudam. " +
      "Use para corrigir/ajustar parcelas (ex.: registrar um adiantamento reagrupando o valor das parcelas). " +
      "Obtenha o id via detalhe_cliente (lista todas as parcelas do cliente) ou listar_lancamentos.",
    schema: editarLancamentoSchema,
    resumo: (i) => `Editar lançamento #${(i as EditarLancamentoIn).id}`,
    montarConfirmacao: async (_ctx, input) => {
      const v = input as EditarLancamentoIn
      const l = await prisma.lancamento.findUnique({ where: { id: v.id }, select: { descricao: true, valorCents: true } })
      const det: { label: string; valor: string }[] = [{ label: "Lançamento", valor: l?.descricao ?? `#${v.id}` }]
      if (v.descricao !== undefined) det.push({ label: "Nova descrição", valor: v.descricao })
      if (v.valorCents !== undefined) det.push({ label: "Valor", valor: `${l ? brl(Math.abs(l.valorCents)) + " → " : ""}${brl(v.valorCents)}` })
      if (v.dataVencimento !== undefined) det.push({ label: "Vencimento", valor: v.dataVencimento ? dataBr(v.dataVencimento) : "—" })
      if (v.status !== undefined) det.push({ label: "Status", valor: v.status === "feito" ? "Pago" : "Em aberto" })
      return { resumo: `Editar lançamento: ${l?.descricao ?? `#${v.id}`}`, detalhes: det }
    },
    run: async (_ctx, input) => {
      const { id, ...patch } = input as EditarLancamentoIn
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
  // NB: honorários são lançamentos (subTipo='honorario') — editar/excluir usam as
  // tools de lançamento (editar_lancamento / excluir_lancamento / excluir_lancamentos).
]
