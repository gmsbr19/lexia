// Comercial tools — funnel/leads reports (readonly) + lead writes (gated).
import { z } from "zod"
import { getComercialKpis, getFunil, getLeads } from "@/lib/comercial/queries"
import { createLead, deleteLead, marcarPerdido, moverEtapa, updateLead } from "@/lib/comercial/mutations"
import { leadCreateSchema, leadEtapaSchema } from "@/lib/comercial/schemas"
import type { LeadEtapa } from "@/lib/comercial/types"
import { idReq } from "@/lib/validation"
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
    run: async (_ctx, input) => createLead(input as z.infer<typeof leadCreateSchema>),
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
      const v = input as { id: number; etapa: LeadEtapa; motivo?: string | null }
      return v.etapa === "perdido" && v.motivo ? marcarPerdido(v.id, v.motivo) : moverEtapa(v.id, v.etapa, ctx.user.email)
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
      const det: { label: string; valor: string }[] = []
      if (i.nome) det.push({ label: "Nome", valor: i.nome })
      if (i.email) det.push({ label: "E-mail", valor: i.email })
      if (i.telefone) det.push({ label: "Telefone", valor: i.telefone })
      return { resumo: "Editar lead", detalhes: det.length ? det : undefined }
    },
    run: async (_ctx, i) => updateLead(i.id, { nome: i.nome, email: i.email, telefone: i.telefone, observacoes: i.observacoes }),
  }),
  defineTool({
    name: "excluir_lead",
    kind: "mutation",
    description: "Exclui um lead do funil. Id via listar_leads.",
    schema: z.object({ id: idReq.describe("Id do lead") }),
    resumo: (i) => `Excluir lead #${i.id}`,
    run: async (_ctx, i) => deleteLead(i.id),
  }),
]
