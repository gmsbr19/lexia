// Tarefas tools — list (readonly) + create (confirmation-gated, enforcing the
// office task standard: a "verbo de ação + objeto" title, a description, a
// responsável, a prazo, and DoR + DoD (the agent drafts the DoR/DoD itself).
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getTarefasDataset } from "@/lib/tarefas/queries"
import { createTarefa, deleteTarefa, updateTarefa } from "@/lib/tarefas/mutations"
import { idOpt, idReq } from "@/lib/validation"
import { dataBr, diffRow, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"
import { cap, limite } from "./shared"

const STATUS_LABEL: Record<string, string> = { todo: "A fazer", doing: "Em andamento", review: "Em revisão", done: "Concluída" }

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")

// A task may only be created when it has ALL of these — the loop's schema check
// rejects (with a descriptive error) any proposal missing a field, so the agent
// asks the user for what's missing instead of creating an incomplete task.
const tarefaChatSchema = z.object({
  titulo: z
    .string()
    .min(3)
    .max(300)
    .refine((t) => t.trim().split(/\s+/).length >= 2, "use 'verbo de ação + objeto' (ex.: 'Protocolar contestação')")
    .describe("Nome no formato 'verbo de ação + objeto', ex.: 'Protocolar contestação no processo X'"),
  descricao: z.string().min(3).max(4000).describe("Descrição/contexto da tarefa (obrigatória)"),
  responsavelId: idReq.describe("Id do responsável — obtenha em listar_tarefas (campo socios)"),
  prazo: dataISO.describe("Prazo / data limite (obrigatório)"),
  dor: z
    .array(z.string().min(1))
    .min(3)
    .max(6)
    .describe("Definition of Ready: 3 a 5 critérios objetivos para a tarefa PODER começar"),
  dod: z
    .array(z.string().min(1))
    .min(3)
    .max(6)
    .describe("Definition of Done: 3 a 5 critérios para considerá-la concluída com qualidade"),
  prio: z.number().int().min(1).max(4).optional().describe("Prioridade 1=Urgente .. 4=Normal (padrão 3)"),
  projeto: z.string().max(40).optional().describe("Área: inbox/trab/soc/trib/civ/int"),
  projetoId: idOpt.describe("Id do projeto (container) ao qual vincular a tarefa — via listar_projetos"),
  data: dataISO.optional().describe("Data planejada para fazer (opcional, diferente do prazo)"),
  hora: z.string().max(10).optional(),
  casoId: idOpt.describe("Vincular a um caso (id via buscar)"),
  clienteId: idOpt.describe("Vincular a um cliente (id via buscar)"),
})

export const tarefasTools = [
  defineTool({
    name: "listar_tarefas",
    kind: "readonly",
    description:
      "Lista as tarefas da equipe (status, prioridade, prazos, responsáveis, vínculos) e os 'socios' " +
      "(membros da equipe com id+nome — use para resolver o responsável de uma nova tarefa). " +
      "Use para 'o que tenho para fazer?', 'tarefas atrasadas', 'tarefas do sócio X'.",
    schema: z.object({
      status: z.string().max(20).optional().describe("Filtra por status (ex.: 'todo', 'doing', 'done')"),
      limite,
    }),
    run: async (_ctx, { status, limite: l }) => {
      const ds = await getTarefasDataset()
      const tarefas = status ? ds.tarefas.filter((t) => t.status === status) : ds.tarefas
      return { ...cap(tarefas, l), socios: ds.socios }
    },
  }),
  defineTool({
    name: "criar_tarefa",
    kind: "mutation",
    description:
      "Cria uma tarefa seguindo o PADRÃO OBRIGATÓRIO do escritório. NÃO proponha se faltar qualquer item — " +
      "pergunte ao usuário antes (nunca invente responsável ou prazo). Requisitos: (1) título 'verbo de ação + objeto'; " +
      "(2) descrição; (3) responsável (responsavelId via listar_tarefas → socios); (4) prazo; (5) DoR e (6) DoD, " +
      "com 3 a 5 critérios cada — VOCÊ redige o DoR/DoD adequados à tarefa e à área jurídica. " +
      "Vincule caso/cliente quando indicado (casoId/clienteId via buscar).",
    schema: tarefaChatSchema,
    resumo: (i) =>
      `Criar tarefa: ${i.titulo} — resp. #${i.responsavelId}, prazo ${i.prazo} (${i.dor.length} DoR / ${i.dod.length} DoD)`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Criar tarefa: ${i.titulo}`,
      detalhes: [
        { label: "Tarefa", valor: i.titulo },
        { label: "Responsável", valor: await nomeUsuario(i.responsavelId) },
        { label: "Prazo", valor: dataBr(i.prazo) },
        { label: "Critérios", valor: `${i.dor.length} DoR · ${i.dod.length} DoD` },
      ],
    }),
    run: async (ctx, i) =>
      createTarefa(
        {
          titulo: i.titulo,
          notes: i.descricao,
          responsavelId: i.responsavelId,
          prazo: i.prazo,
          prio: i.prio ?? 3,
          projeto: i.projeto,
          projetoId: i.projetoId ?? null,
          data: i.data ?? null,
          hora: i.hora ?? null,
          casoId: i.casoId ?? null,
          clienteId: i.clienteId ?? null,
          dor: i.dor.map((text) => ({ text, done: false })),
          dod: i.dod.map((text) => ({ text, done: false })),
          ai: true,
        },
        ctx.user.email,
      ),
  }),
  defineTool({
    name: "editar_tarefa",
    kind: "mutation",
    description: "Edita uma tarefa (id via listar_tarefas). Envie só o que muda: titulo, prazo, prio (1=Urgente..4=Normal), status (todo/doing/review/done), notes.",
    schema: z.object({
      id: idReq.describe("Id da tarefa"),
      titulo: z.string().min(2).max(300).optional(),
      prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      prio: z.number().int().min(1).max(4).optional(),
      status: z.enum(["todo", "doing", "review", "done"]).optional(),
      notes: z.string().max(4000).optional(),
    }),
    resumo: (i) => `Editar tarefa #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const antes = await prisma.tarefa.findUnique({ where: { id: i.id }, select: { titulo: true, prazo: true, status: true, prio: true } })
      const det = [
        diffRow("Título", i.titulo, antes?.titulo),
        diffRow("Prazo", i.prazo ? dataBr(i.prazo) : undefined, antes?.prazo ? dataBr(antes.prazo.toISOString().slice(0, 10)) : undefined),
        diffRow("Status", i.status ? STATUS_LABEL[i.status] : undefined, antes?.status ? STATUS_LABEL[antes.status] : undefined),
        diffRow("Prioridade", i.prio != null ? String(i.prio) : undefined, antes?.prio != null ? String(antes.prio) : undefined),
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: "Editar tarefa", detalhes: det.length ? det : undefined }
    },
    run: async (ctx, i) => updateTarefa(i.id, { titulo: i.titulo, prazo: i.prazo, prio: i.prio, status: i.status, notes: i.notes }, ctx.user.email),
  }),
  defineTool({
    name: "excluir_tarefa",
    kind: "mutation",
    description: "Exclui uma tarefa. Id via listar_tarefas.",
    schema: z.object({ id: idReq.describe("Id da tarefa") }),
    resumo: (i) => `Excluir tarefa #${i.id}`,
    run: async (_ctx, i) => deleteTarefa(i.id),
  }),
]
