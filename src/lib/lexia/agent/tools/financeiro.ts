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
  setCasoResponsaveis,
  updateLancamento,
} from "@/lib/finance/mutations"
import { novoLancamentoSchema, pagarLancamentoSchema } from "@/lib/finance/schemas"
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

/** O caso existe, está vivo e é do mesmo cliente do lançamento? */
async function assertCasoCompativel(lancamentoId: number, casoId: number) {
  const [lanc, caso] = await Promise.all([
    prisma.lancamento.findUnique({ where: { id: lancamentoId }, select: { clienteId: true } }),
    prisma.caso.findUnique({ where: { id: casoId }, select: { excluidoEm: true, clientePrincipalId: true } }),
  ])
  if (!caso || caso.excluidoEm) throw new UserError("Caso não encontrado (ou excluído).")
  if (lanc?.clienteId && caso.clientePrincipalId && lanc.clienteId !== caso.clientePrincipalId) {
    throw new UserError(
      "Esse caso é de outro cliente. Escolha um caso do mesmo cliente do lançamento, ou corrija antes o cliente do lançamento.",
    )
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
      if (v.casoId !== undefined) {
        const caso = v.casoId == null ? null : await prisma.caso.findUnique({ where: { id: v.casoId }, select: { titulo: true } })
        det.push({ label: "Caso", valor: v.casoId == null ? "— (desvincular)" : (caso?.titulo ?? `#${v.casoId}`) })
      }
      return { resumo: `Editar lançamento: ${l?.descricao ?? `#${v.id}`}`, detalhes: det }
    },
    run: async (_ctx, input) => {
      const { id, ...patch } = input as EditarLancamentoIn
      // Vincular dinheiro ao caso do cliente ERRADO é caro de desfazer: valida antes.
      if (patch.casoId != null) await assertCasoCompativel(id, patch.casoId)
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
  // NB: honorários são lançamentos (subTipo='honorario') — editar/excluir usam as
  // tools de lançamento (editar_lancamento / excluir_lancamento / excluir_lancamentos).
]
