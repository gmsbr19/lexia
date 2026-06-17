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
import { criarLancamentos, deleteLancamento, pagarLancamento } from "@/lib/finance/mutations"
import { novoLancamentoSchema, pagarLancamentoSchema } from "@/lib/finance/schemas"
import { prisma } from "@/lib/db"
import { idReq } from "@/lib/validation"
import { dataBr } from "../confirmar"
import { defineTool } from "../types"
import { brl, cap, limite } from "./shared"

const mesArg = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional()
  .describe("Mês no formato YYYY-MM (padrão: mês corrente)")
const periodoArg = z.enum(["mes", "trimestre", "ano"]).optional().describe("Recorte do período (padrão: mes)")

export const financeiroTools = [
  defineTool({
    name: "financeiro_resumo",
    kind: "readonly",
    description:
      "Resumo financeiro do mês: KPIs (recebido, a receber, vencido, margens) e o fechamento mensal " +
      "(entradas, saídas, saldo). Use para perguntas como 'como está o caixa?', 'quanto recebi este mês?'.",
    schema: z.object({ mes: mesArg }),
    run: async (_ctx, { mes }) => ({ kpis: await getKpis(mes), mes: await getMonthlySummary(mes) }),
  }),
  defineTool({
    name: "listar_lancamentos",
    kind: "readonly",
    description:
      "Lista lançamentos do ledger (entradas a receber e saídas a pagar) no período. " +
      "Use para 'o que tenho a pagar?', 'lançamentos de maio', extratos. Valores em centavos.",
    schema: z.object({ mes: mesArg, periodo: periodoArg, limite }),
    run: async (_ctx, { mes, periodo, limite: l }) => cap(await getLancamentos(mes, periodo ?? "mes"), l),
  }),
  defineTool({
    name: "inadimplencia",
    kind: "readonly",
    description:
      "Recebíveis vencidos e o aging (faixas de atraso). Use para 'quem está devendo?', 'vencidos há mais de 60 dias'.",
    schema: z.object({ limite }),
    run: async (_ctx, { limite: l }) => ({ aging: await getReceivablesAging(), vencidos: cap(await getOverdue(50), l) }),
  }),
  defineTool({
    name: "dre",
    kind: "readonly",
    description: "DRE do período (receita, custos por categoria, pró-labore, resultado). Use para análise de resultado.",
    schema: z.object({ mes: mesArg, periodo: periodoArg }),
    run: async (_ctx, { mes, periodo }) => getDre(mes, periodo ?? "mes"),
  }),
  defineTool({
    name: "listar_honorarios",
    kind: "readonly",
    description: "Lista os honorários (contratos) e os totais pago/pendente. Use para 'contratos', 'honorários a receber'.",
    schema: z.object({ limite }),
    run: async (_ctx, { limite: l }) => ({ totais: await getHonorarioTotals(), itens: cap(await getHonorarios(), l) }),
  }),
  defineTool({
    name: "detalhe_honorario",
    kind: "readonly",
    description: "Detalhe de um honorário por id (incluindo a série de parcelas). Obtenha o id via buscar ou listar_honorarios.",
    schema: z.object({ id: idReq.describe("Id do honorário") }),
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
      return pagarLancamento(v.id, v.dataPagamento ?? null)
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
]
