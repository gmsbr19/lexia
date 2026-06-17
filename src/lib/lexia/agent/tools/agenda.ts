// Agenda tools — list events (readonly) + create event (confirmation-gated).
import { z } from "zod"
import { listEventos } from "@/lib/agenda/queries"
import { createEvento, deleteEvento, updateEvento } from "@/lib/agenda/mutations"
import { eventoCreateSchema } from "@/lib/agenda/schemas"
import { idReq } from "@/lib/validation"
import { dataBr } from "../confirmar"
import { defineTool } from "../types"
import { addDiasISO, hojeISO } from "../datas"
import { cap, limite } from "./shared"

const dataArg = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()

export const agendaTools = [
  defineTool({
    name: "agenda",
    kind: "readonly",
    description:
      "Eventos da agenda (audiências, prazos, reuniões) num intervalo de datas. " +
      "Sem datas, retorna os próximos 14 dias. Use para 'o que tenho hoje?', 'próximas audiências'.",
    schema: z.object({
      de: dataArg.describe("Início YYYY-MM-DD (padrão: hoje)"),
      ate: dataArg.describe("Fim YYYY-MM-DD (padrão: +14 dias)"),
      limite,
    }),
    run: async (_ctx, { de, ate, limite: l }) => {
      const inicio = de ?? hojeISO()
      const fim = ate ?? addDiasISO(inicio, 14)
      return cap(await listEventos({ de: inicio, ate: fim }), l)
    },
  }),
  defineTool({
    name: "criar_evento",
    kind: "mutation",
    description:
      "Agenda um evento (audiência/prazo/reunião/outro). Chame quando o usuário pedir para marcar/agendar algo. " +
      "Vincule a cliente/caso/responsável quando indicado — obtenha os ids via buscar.",
    schema: eventoCreateSchema,
    resumo: (i) => {
      const v = i as z.infer<typeof eventoCreateSchema>
      const t = v.tipo ? `${v.tipo}: ` : ""
      return `Agendar ${t}${v.titulo} em ${v.dataInicio}`
    },
    montarConfirmacao: async (_ctx, input) => {
      const v = input as z.infer<typeof eventoCreateSchema>
      const det: { label: string; valor: string }[] = [{ label: "Evento", valor: v.titulo }]
      if (v.tipo) det.push({ label: "Tipo", valor: v.tipo })
      det.push({ label: "Quando", valor: dataBr(v.dataInicio.slice(0, 10)) + (v.dataInicio.length > 10 ? ` ${v.dataInicio.slice(11, 16)}` : "") })
      if (v.local) det.push({ label: "Local", valor: v.local })
      return { resumo: `Agendar ${v.titulo}`, detalhes: det }
    },
    run: async (ctx, input) => createEvento(input as z.infer<typeof eventoCreateSchema>, ctx.user.email),
  }),
  defineTool({
    name: "editar_evento",
    kind: "mutation",
    description: "Edita um evento da agenda (id via agenda). Envie só o que muda: titulo, dataInicio (YYYY-MM-DD ou YYYY-MM-DDTHH:MM), local, status.",
    schema: z.object({
      id: idReq.describe("Id do evento"),
      titulo: z.string().min(2).max(200).optional(),
      dataInicio: z.string().max(40).optional(),
      local: z.string().max(200).optional(),
      status: z.string().max(20).optional(),
    }),
    resumo: (i) => `Editar evento #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const det: { label: string; valor: string }[] = []
      if (i.titulo) det.push({ label: "Novo título", valor: i.titulo })
      if (i.dataInicio) det.push({ label: "Quando", valor: dataBr(i.dataInicio.slice(0, 10)) })
      if (i.local) det.push({ label: "Local", valor: i.local })
      if (i.status) det.push({ label: "Status", valor: i.status })
      return { resumo: "Editar evento", detalhes: det.length ? det : undefined }
    },
    run: async (ctx, i) => updateEvento(i.id, { titulo: i.titulo, dataInicio: i.dataInicio, local: i.local, status: i.status }, ctx.user.email),
  }),
  defineTool({
    name: "excluir_evento",
    kind: "mutation",
    description: "Exclui um evento da agenda. Id via agenda.",
    schema: z.object({ id: idReq.describe("Id do evento") }),
    resumo: (i) => `Excluir evento #${i.id}`,
    run: async (_ctx, i) => deleteEvento(i.id),
  }),
]
