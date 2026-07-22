// Comercial tools — funnel/leads/analytics reports (readonly) + lead/campanha
// writes (confirmation-gated).
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getComercialKpis, getDesempenhoDonos, getForecast, getFunil, getLeads, getRelatorioAtividades } from "@/lib/comercial/queries"
import { converterLead, createCampanha, createLead, deleteLead, marcarPerdido, moverEtapa, registrarGasto, updateLead } from "@/lib/comercial/mutations"
import { criarAtividade } from "@/lib/comercial/atividades"
import { atividadeCreateSchema, campanhaCreateSchema, converterLeadSchema, gastoSchema, leadCreateSchema, leadEtapaSchema } from "@/lib/comercial/schemas"
import { PLATAFORMA_LABEL, type LeadEtapa, type Plataforma } from "@/lib/comercial/types"
import { TIPO_ATIVIDADE_LABEL } from "@/lib/comercial/analytics"
import { dateStr, idReq } from "@/lib/validation"
import { brl, dataBr, diffRow } from "../confirmar"
import { defineTool } from "../types"
import { cap, limite } from "./shared"

export const comercialTools = [
  defineTool({
    name: "comercial_resumo",
    kind: "readonly",
    description:
      "Resumo do comercial/marketing: KPIs (leads, conversões, investimento, ROAS, CAC, CPL) e o funil por etapa. " +
      "Use para 'como está o marketing?', 'quantos leads este mês?', 'qual o ROAS?'.",
    schema: z.object({}),
    run: async () => ({ kpis: await getComercialKpis(), funil: await getFunil() }),
  }),
  defineTool({
    name: "listar_leads",
    kind: "readonly",
    description: "Lista leads do funil, opcionalmente filtrando por etapa. Use para 'leads sem contato', 'propostas em aberto'.",
    schema: z.object({
      etapa: z
        .enum(["novo", "contato", "qualificado", "proposta", "ganho", "perdido"])
        .optional()
        .describe("Filtra por etapa do funil"),
      limite,
    }),
    run: async (_ctx, { etapa, limite: l }) => cap(await getLeads(undefined, "mes", etapa ? { etapa } : {}), l),
  }),
  defineTool({
    name: "criar_lead",
    kind: "mutation",
    description: "Cadastra um lead no funil. Chame quando o usuário pedir para registrar um novo lead/contato comercial.",
    schema: leadCreateSchema,
    resumo: (i) => `Cadastrar lead: ${(i as z.infer<typeof leadCreateSchema>).nome}`,
    run: async (ctx, input) => createLead(input as z.infer<typeof leadCreateSchema>, ctx.user.email),
  }),
  defineTool({
    name: "mover_lead_etapa",
    kind: "mutation",
    description:
      "Move um lead para outra etapa do funil (novo→contato→qualificado→proposta→ganho/perdido). " +
      "Para 'perdido', inclua um motivo quando o usuário fornecer. Obtenha o id via listar_leads ou buscar.",
    schema: leadEtapaSchema.extend({ id: idReq.describe("Id do lead") }),
    resumo: (i) => {
      const v = i as z.infer<typeof leadEtapaSchema> & { id: number }
      return `Mover lead #${v.id} para '${v.etapa}'${v.motivo ? ` (motivo: ${v.motivo})` : ""}`
    },
    run: async (ctx, input) => {
      const v = input as { id: number; etapa: LeadEtapa; motivo?: string | null; motivoCategoria?: string | null }
      return v.etapa === "perdido"
        ? marcarPerdido(v.id, v.motivo, v.motivoCategoria)
        : moverEtapa(v.id, v.etapa, ctx.user.email)
    },
  }),
  defineTool({
    name: "editar_lead",
    kind: "mutation",
    description: "Edita um lead (id via listar_leads). Envie só o que muda: nome, email, telefone, observacoes.",
    schema: z.object({
      id: idReq.describe("Id do lead"),
      nome: z.string().min(2).max(200).optional(),
      email: z.string().max(200).optional(),
      telefone: z.string().max(40).optional(),
      observacoes: z.string().max(2000).optional(),
    }),
    resumo: (i) => `Editar lead #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const antes = await prisma.lead.findUnique({ where: { id: i.id }, select: { nome: true, email: true, telefone: true } })
      const det = [diffRow("Nome", i.nome, antes?.nome), diffRow("E-mail", i.email, antes?.email), diffRow("Telefone", i.telefone, antes?.telefone)].filter(
        (d): d is NonNullable<typeof d> => d != null,
      )
      return { resumo: "Editar lead", detalhes: det.length ? det : undefined }
    },
    run: async (ctx, i) => updateLead(i.id, { nome: i.nome, email: i.email, telefone: i.telefone, observacoes: i.observacoes }, ctx.user.email),
  }),
  defineTool({
    name: "excluir_lead",
    kind: "mutation",
    description: "Exclui um lead do funil. Id via listar_leads.",
    schema: z.object({ id: idReq.describe("Id do lead") }),
    resumo: (i) => `Excluir lead #${i.id}`,
    run: async (_ctx, i) => deleteLead(i.id),
  }),
  // ── Fase 4 · análise + campanhas / gasto / conversão / atividade / follow-up ──
  defineTool({
    name: "analise_comercial",
    kind: "readonly",
    description:
      "Análise do comercial: desempenho por responsável (leads, conversões, valor contratado, ticket), forecast ponderado do funil (valor estimado × probabilidade da etapa) e relatório de atividades (por tipo e por responsável). " +
      "Use para 'quem converteu mais?', 'qual o forecast do funil?', 'quantas ligações fizemos este mês?'.",
    schema: z.object({
      mes: z.string().max(7).optional().describe("Mês no formato YYYY-MM (padrão: mês atual)"),
      periodo: z.enum(["mes", "trimestre", "ano"]).optional().describe("Período da análise (padrão: mês)"),
    }),
    run: async (_ctx, { mes, periodo }) => ({
      desempenhoPorDono: await getDesempenhoDonos(mes, periodo),
      forecast: await getForecast(),
      atividades: await getRelatorioAtividades(mes, periodo),
    }),
  }),
  defineTool({
    name: "criar_campanha",
    kind: "mutation",
    description: "Cria uma campanha de marketing (google_ads/meta_ads/outro) no funil comercial. Use para 'crie uma campanha de Google Ads para a área trabalhista'.",
    schema: campanhaCreateSchema,
    resumo: (i) => `Criar campanha: ${i.nome}`,
    montarConfirmacao: async (_ctx, i) => {
      const det: { label: string; valor: string }[] = [{ label: "Plataforma", valor: PLATAFORMA_LABEL[i.plataforma as Plataforma] ?? i.plataforma }]
      if (i.objetivo) det.push({ label: "Objetivo", valor: i.objetivo })
      if (i.dataInicio) det.push({ label: "Início", valor: dataBr(i.dataInicio) })
      return { resumo: `Criar campanha "${i.nome}"`, detalhes: det }
    },
    run: async (_ctx, i) => createCampanha(i),
  }),
  defineTool({
    name: "registrar_gasto",
    kind: "mutation",
    description:
      "Registra um gasto (investimento) de uma campanha — lança uma SAÍDA no Financeiro sob a categoria Marketing e alimenta ROAS/CAC/CPL. Valor em CENTAVOS. Obtenha o id da campanha com o usuário ou por uma consulta anterior.",
    schema: gastoSchema.extend({ campanhaId: idReq.describe("Id da campanha") }),
    resumo: (i) => `Registrar gasto de ${brl(i.valorCents)} na campanha #${i.campanhaId}`,
    montarConfirmacao: async (_ctx, i) => {
      const camp = await prisma.campanha.findUnique({ where: { id: i.campanhaId }, select: { nome: true } })
      const det: { label: string; valor: string }[] = [
        { label: "Campanha", valor: camp?.nome ?? `campanha #${i.campanhaId}` },
        { label: "Valor", valor: brl(i.valorCents) },
      ]
      if (i.data) det.push({ label: "Data", valor: dataBr(i.data) })
      if (i.pago === false) det.push({ label: "Situação", valor: "Em aberto" })
      return { resumo: "Registrar gasto de anúncios", detalhes: det }
    },
    run: async (_ctx, i) => registrarGasto({ campanhaId: i.campanhaId, valorCents: i.valorCents, data: i.data, contaId: i.contaId, descricao: i.descricao, pago: i.pago }),
  }),
  defineTool({
    name: "converter_lead",
    kind: "mutation",
    description:
      "Converte um lead em GANHO: marca a etapa como 'ganho' e, quando houver valor contratado (CENTAVOS), lança o honorário (entrada) que alimenta ROAS/ticket. Id via listar_leads. Use para 'ganhamos o lead X, contrato de R$ 5.000'.",
    schema: converterLeadSchema.extend({ id: idReq.describe("Id do lead") }),
    resumo: (i) => `Converter lead #${i.id} em ganho`,
    montarConfirmacao: async (_ctx, i) => {
      const lead = await prisma.lead.findUnique({ where: { id: i.id }, select: { nome: true } })
      const det: { label: string; valor: string }[] = [{ label: "Lead", valor: lead?.nome ?? `lead #${i.id}` }]
      if (typeof i.valorContratadoCents === "number") det.push({ label: "Valor contratado", valor: brl(i.valorContratadoCents) })
      if (i.dataConversao) det.push({ label: "Data", valor: dataBr(i.dataConversao) })
      return { resumo: "Converter lead em ganho", detalhes: det }
    },
    run: async (ctx, i) =>
      converterLead(
        i.id,
        { clienteId: i.clienteId, casoId: i.casoId, valorContratadoCents: i.valorContratadoCents, tipoHonorario: i.tipoHonorario, clienteNome: i.clienteNome, casoTitulo: i.casoTitulo, dataConversao: i.dataConversao },
        ctx.user.email,
      ),
  }),
  defineTool({
    name: "registrar_atividade",
    kind: "mutation",
    description:
      "Registra uma atividade na timeline de um lead: ligacao, email, reuniao, whatsapp, nota ou outro. Id via listar_leads. Use para 'anote que liguei para o lead X' ou 'registre a reunião com o lead Y'.",
    schema: atividadeCreateSchema.extend({ leadId: idReq.describe("Id do lead") }),
    resumo: (i) => `Registrar ${i.tipo} no lead #${i.leadId}`,
    montarConfirmacao: async (_ctx, i) => {
      const lead = await prisma.lead.findUnique({ where: { id: i.leadId }, select: { nome: true } })
      const det: { label: string; valor: string }[] = [
        { label: "Lead", valor: lead?.nome ?? `lead #${i.leadId}` },
        { label: "Tipo", valor: TIPO_ATIVIDADE_LABEL[i.tipo] ?? i.tipo },
      ]
      if (i.titulo) det.push({ label: "Título", valor: i.titulo })
      if (i.ocorreuEm) det.push({ label: "Quando", valor: dataBr(i.ocorreuEm) })
      return { resumo: "Registrar atividade", detalhes: det }
    },
    run: async (ctx, i) => criarAtividade(i.leadId, { tipo: i.tipo, titulo: i.titulo, descricao: i.descricao, resultado: i.resultado, ocorreuEm: i.ocorreuEm }, ctx.user.email),
  }),
  defineTool({
    name: "definir_follow_up",
    kind: "mutation",
    description:
      "Define a próxima ação (follow-up) de um lead: uma data e o que fazer. O responsável recebe lembrete quando vencer. Id via listar_leads. Use para 'lembrar de ligar para o lead X na sexta'.",
    schema: z.object({
      id: idReq.describe("Id do lead"),
      proximaAcaoEm: dateStr.describe("Data da próxima ação (YYYY-MM-DD)"),
      proximaAcaoNota: z.string().max(2000).nullish().describe("O que fazer no follow-up"),
    }),
    resumo: (i) => `Follow-up do lead #${i.id} em ${dataBr(i.proximaAcaoEm)}`,
    montarConfirmacao: async (_ctx, i) => {
      const lead = await prisma.lead.findUnique({ where: { id: i.id }, select: { nome: true } })
      const det: { label: string; valor: string }[] = [
        { label: "Lead", valor: lead?.nome ?? `lead #${i.id}` },
        { label: "Próxima ação", valor: dataBr(i.proximaAcaoEm) },
      ]
      if (i.proximaAcaoNota) det.push({ label: "Nota", valor: i.proximaAcaoNota })
      return { resumo: "Definir follow-up", detalhes: det }
    },
    run: async (ctx, i) => updateLead(i.id, { proximaAcaoEm: i.proximaAcaoEm, proximaAcaoNota: i.proximaAcaoNota }, ctx.user.email),
  }),
]
