// Clientes tools — list/detail (readonly) + criar/editar/excluir (confirmation-gated).
// "excluir_cliente" = anonimização LGPD: apaga os dados pessoais e MANTÉM o financeiro.
import { z } from "zod"
import { anotarCliente, pausarCobranca, retomarCobranca, suspenderCobranca } from "@/lib/clientes/cobranca"
import { createCliente, updateCliente } from "@/lib/clientes/mutations"
import { getClienteDetail } from "@/lib/clientes/queries"
import { clienteCreateSchema, clientePatchSchema } from "@/lib/clientes/schemas"
import { anonimizarCliente } from "@/lib/finance/mutations"
import { getClientes } from "@/lib/finance/queries"
import { idReq } from "@/lib/validation"
import { verFinanceiro } from "@/lib/users/types"
import type { ClienteDetail } from "@/lib/clientes/types"
import { nomeCliente } from "../confirmar"
import { defineTool } from "../types"
import { cap, limite } from "./shared"

/** Remove os blocos financeiros do detalhe de cliente para quem é "Equipe". */
function semFinanceiroCliente(d: ClienteDetail) {
  return {
    header: d.header,
    resumo: { casosAtivos: d.resumo.casosAtivos, casosTotal: d.resumo.casosTotal },
    casos: d.casos.map((c) => ({ id: c.id, titulo: c.titulo, tipo: c.tipo, status: c.status, responsavel: c.responsavel, honorariosCount: c.honorariosCount, processos: c.processos })),
    tarefas: d.tarefas,
    eventos: d.eventos,
    documentos: d.documentos,
    anotacoes: d.anotacoes,
    cobranca: d.cobranca,
    financeiroOculto: true,
  }
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD")
const dataBR = (iso?: string | null) => {
  if (!iso) return null
  const [y, m, d] = iso.split("-")
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export const clientesTools = [
  defineTool({
    name: "listar_clientes",
    kind: "readonly",
    description: "Lista os clientes do escritório (com nº de casos). Para encontrar um cliente específico pelo nome, prefira buscar.",
    schema: z.object({ limite }),
    run: async (_ctx, { limite: l }) => cap(await getClientes(), l),
  }),
  defineTool({
    name: "detalhe_cliente",
    kind: "readonly",
    description:
      "Detalhe completo de um cliente por id: dados, casos, honorários, lançamentos, tarefas, eventos e documentos. " +
      "Obtenha o id via buscar. Use para 'resuma a situação do cliente X', 'há valores vencidos do cliente Y?'.",
    schema: z.object({ id: idReq.describe("Id do cliente") }),
    run: async (ctx, { id }) => {
      const d = await getClienteDetail(id)
      if (!d) return { erro: "Cliente não encontrado" }
      return verFinanceiro(ctx.user.role) ? d : semFinanceiroCliente(d)
    },
  }),
  defineTool({
    name: "criar_cliente",
    kind: "mutation",
    description:
      "Cadastra um novo cliente (PF ou PJ). Chame apenas quando o usuário pedir explicitamente para criar/cadastrar um cliente.",
    schema: clienteCreateSchema,
    resumo: (i) => `Cadastrar cliente: ${(i as z.infer<typeof clienteCreateSchema>).nome}`,
    montarConfirmacao: async (_ctx, input) => {
      const i = input as z.infer<typeof clienteCreateSchema>
      const det: { label: string; valor: string }[] = [{ label: "Nome", valor: i.nome }]
      if (i.tipo) det.push({ label: "Tipo", valor: i.tipo === "pj" ? "Pessoa jurídica" : "Pessoa física" })
      if (i.cpfCnpj) det.push({ label: i.tipo === "pj" ? "CNPJ" : "CPF", valor: i.cpfCnpj })
      if (i.cidade) det.push({ label: "Cidade", valor: `${i.cidade}${i.uf ? `/${i.uf}` : ""}` })
      return { resumo: `Cadastrar cliente: ${i.nome}`, detalhes: det }
    },
    run: async (_ctx, input) => createCliente(input as z.infer<typeof clienteCreateSchema>),
  }),
  defineTool({
    name: "editar_cliente",
    kind: "mutation",
    description: "Edita os dados de um cliente (id via buscar). Envie só o que muda: nome, apelido, cpfCnpj, cidade, uf, emails, telefones.",
    schema: clientePatchSchema.extend({ id: idReq }),
    resumo: (i) => `Editar cliente #${(i as { id: number }).id}`,
    montarConfirmacao: async (_ctx, input) => {
      const i = input as z.infer<typeof clientePatchSchema> & { id: number }
      const det: { label: string; valor: string }[] = [{ label: "Cliente", valor: await nomeCliente(i.id) }]
      if (i.nome) det.push({ label: "Novo nome", valor: i.nome })
      if (i.cpfCnpj) det.push({ label: "CPF/CNPJ", valor: i.cpfCnpj })
      if (i.cidade) det.push({ label: "Cidade", valor: `${i.cidade}${i.uf ? `/${i.uf}` : ""}` })
      if (i.emails?.length) det.push({ label: "E-mails", valor: i.emails.join(", ") })
      if (i.telefones?.length) det.push({ label: "Telefones", valor: i.telefones.join(", ") })
      return { resumo: "Editar cliente", detalhes: det }
    },
    run: async (_ctx, input) => {
      const { id, ...patch } = input as z.infer<typeof clientePatchSchema> & { id: number }
      return updateCliente(id, patch)
    },
  }),
  defineTool({
    name: "excluir_cliente",
    kind: "mutation",
    roles: ["socio"],
    description:
      "Exclui um cliente pela LGPD: APAGA os dados pessoais (nome, CPF/CNPJ, contatos, endereço) e MANTÉM todo o histórico " +
      "financeiro. Irreversível. Só sócios/admin. Id via buscar.",
    schema: z.object({ id: idReq.describe("Id do cliente") }),
    resumo: (i) => `Excluir cliente #${i.id} (LGPD)`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Excluir cliente: ${await nomeCliente(i.id)}`,
      detalhes: [
        { label: "Cliente", valor: await nomeCliente(i.id) },
        { label: "O que acontece", valor: "Apaga os dados pessoais (LGPD); o histórico financeiro é mantido. Irreversível." },
      ],
    }),
    run: async (_ctx, i) => anonimizarCliente(i.id),
  }),
  defineTool({
    name: "anotar_cliente",
    kind: "mutation",
    description:
      "Adiciona uma ANOTAÇÃO de contexto a um cliente (a IA lê essas notas ao analisar o cliente e ao montar o plano de " +
      "cobrança). Use para registrar combinados, negociações, observações ('cliente em negociação', 'só atende à tarde'). " +
      "Para mudar o estado de cobrança (pausar/não cobrar/retomar), use as ferramentas de cobrança. Id via buscar.",
    schema: z.object({
      id: idReq.describe("Id do cliente"),
      conteudo: z.string().min(1).max(2000).describe("Texto da anotação"),
      fixar: z.boolean().optional().describe("Fixar no topo como contexto importante"),
    }),
    resumo: (i) => `Anotar cliente #${(i as { id: number }).id}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Anotar: ${await nomeCliente(i.id)}`,
      detalhes: [
        { label: "Cliente", valor: await nomeCliente(i.id) },
        { label: "Anotação", valor: i.conteudo },
        ...(i.fixar ? [{ label: "Fixar", valor: "Sim" }] : []),
      ],
    }),
    run: async (ctx, i) => anotarCliente(i.id, { autor: ctx.user.email, conteudo: i.conteudo, fixado: i.fixar }),
  }),
  defineTool({
    name: "pausar_cobranca",
    kind: "mutation",
    description:
      "Pausa a cobrança de um cliente (ele PARA de aparecer no plano de ação/próximo passo) até uma data — por N dias " +
      "(padrão 30) OU até uma data específica. Use quando o cliente começou a regularizar ou pediu prazo. Exige motivo. Id via buscar.",
    schema: z.object({
      id: idReq.describe("Id do cliente"),
      motivo: z.string().min(1).max(500).describe("Por que pausar (ex.: 'começou a regularizar')"),
      dias: z.number().int().min(1).max(3650).optional().describe("Dias de pausa (padrão 30; ignore se usar 'ate')"),
      ate: isoDate.nullish().describe("Pausar até esta data YYYY-MM-DD (opcional)"),
    }),
    resumo: (i) => `Pausar cobrança do cliente #${(i as { id: number }).id}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Pausar cobrança: ${await nomeCliente(i.id)}`,
      detalhes: [
        { label: "Cliente", valor: await nomeCliente(i.id) },
        { label: "Até", valor: i.ate ? (dataBR(i.ate) as string) : `${i.dias ?? 30} dias` },
        { label: "Motivo", valor: i.motivo },
      ],
    }),
    run: async (ctx, i) =>
      pausarCobranca(i.id, { autor: ctx.user.email, motivo: i.motivo, dias: i.dias, ate: i.ate }),
  }),
  defineTool({
    name: "suspender_cobranca",
    kind: "mutation",
    description:
      "Marca um cliente como NÃO COBRAR MAIS (cobrança suspensa por tempo indeterminado — ex.: perda, acordo de não cobrar). " +
      "Ele sai do plano de cobrança até que se use retomar_cobranca. Exige motivo. Id via buscar.",
    schema: z.object({
      id: idReq.describe("Id do cliente"),
      motivo: z.string().min(1).max(500).describe("Por que não cobrar mais"),
    }),
    resumo: (i) => `Não cobrar mais o cliente #${(i as { id: number }).id}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Não cobrar mais: ${await nomeCliente(i.id)}`,
      detalhes: [
        { label: "Cliente", valor: await nomeCliente(i.id) },
        { label: "O que acontece", valor: "Sai do plano de cobrança por tempo indeterminado (reversível com 'retomar')." },
        { label: "Motivo", valor: i.motivo },
      ],
    }),
    run: async (ctx, i) => suspenderCobranca(i.id, { autor: ctx.user.email, motivo: i.motivo }),
  }),
  defineTool({
    name: "retomar_cobranca",
    kind: "mutation",
    description:
      "Reativa a cobrança de um cliente que estava pausado ou marcado como 'não cobrar' — ele volta ao plano de ação. Id via buscar.",
    schema: z.object({
      id: idReq.describe("Id do cliente"),
      motivo: z.string().max(500).optional().describe("Observação opcional"),
    }),
    resumo: (i) => `Retomar cobrança do cliente #${(i as { id: number }).id}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Retomar cobrança: ${await nomeCliente(i.id)}`,
      detalhes: [{ label: "Cliente", valor: await nomeCliente(i.id) }],
    }),
    run: async (ctx, i) => retomarCobranca(i.id, { autor: ctx.user.email, motivo: i.motivo }),
  }),
]
