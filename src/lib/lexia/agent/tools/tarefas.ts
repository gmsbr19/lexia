// Tarefas tools (redesign): listar (com os estados derivados das regras únicas —
// vencida, em risco, aguardando), criar (só o título é obrigatório; prazo
// padrão = sexta da semana; responsável padrão = quem pediu), criar em lote,
// editar, mudar status (com as regras do quadro), concluir (libera as seguintes
// e avisa "Sua vez"), ligar/desligar ("só começa depois de") e excluir.
// Mutações são confirmation-gated pelo loop; nenhuma tem gate de papel
// (qualquer usuário edita tarefas do escritório).
import { z } from "zod"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import {
  atualizarTarefa,
  concluirTarefa,
  criarTarefa,
  criarTarefas,
  definirPrazo,
  desligar,
  excluirTarefa,
  ligar,
  moverStatus,
  resolverAtor,
  type NovaTarefa,
} from "@/lib/tarefas/mutations"
import { getTarefasBoard } from "@/lib/tarefas/queries"
import {
  aguardandoRotulo,
  faixa,
  indexar,
  motivosRisco,
  vencida,
} from "@/lib/tarefas/regras"
import { statusLabel } from "@/lib/tarefas/types"
import { idOpt, idReq } from "@/lib/validation"
import { dataBr, diffRow, nomeCliente, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"
import { limite } from "./shared"


const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")
const STATUS = z.enum(["todo", "doing", "wait", "done"])

const tarefaChat = z.object({
  titulo: z.string().min(2).max(300).describe("Título curto, de preferência 'verbo + objeto' (ex.: 'Protocolar contestação')"),
  descricao: z.string().max(4000).optional().describe("Descrição/contexto (opcional)"),
  responsavelId: idOpt.describe("Responsável (id via listar_tarefas → pessoas). Omitido = quem pediu; null = sem responsável"),
  prazo: dataISO.optional().describe("Prazo (YYYY-MM-DD). Omitido = sexta-feira desta semana"),
  prazoFatal: z.boolean().optional().describe("true para prazo legal/processual (contestação, recurso…)"),
  projetoId: idOpt.describe("Projeto (id via listar_projetos). Omitido = sem projeto"),
  grupo: z.string().max(160).optional().describe("Grupo dentro do projeto (ex.: 'Protocolo 01 · 1º RI Taubaté')"),
  clienteId: idOpt.describe("Cliente (id via buscar) — ignorado se o projeto já tem cliente"),
  casoId: idOpt.describe("Vincular a um caso (id via buscar)"),
  processoId: idOpt.describe("Vincular a um processo (id via buscar)"),
  checklist: z.array(z.string().min(1).max(300)).max(30).optional().describe("Itens de checklist (opcional)"),
})

function paraNova(i: z.infer<typeof tarefaChat>): NovaTarefa {
  return {
    titulo: i.titulo,
    descricao: i.descricao ?? null,
    responsavelId: i.responsavelId === undefined ? undefined : i.responsavelId,
    prazo: i.prazo ?? null,
    prazoFatal: i.prazoFatal,
    projetoId: i.projetoId ?? null,
    grupo: i.grupo ?? null,
    clienteId: i.clienteId ?? null,
    casoId: i.casoId ?? null,
    processoId: i.processoId ?? null,
    checklist: i.checklist,
    origem: "lexia",
  }
}

async function nomeProjeto(id?: number | null): Promise<string> {
  if (!id) return "Sem projeto"
  const p = await prisma.projeto.findUnique({ where: { id }, select: { nomeCurto: true } })
  return p?.nomeCurto ?? `projeto #${id}`
}

async function tituloTarefa(id: number): Promise<string> {
  const t = await prisma.tarefa.findUnique({ where: { id }, select: { titulo: true } })
  return t?.titulo ?? `tarefa #${id}`
}

export const tarefasTools = [
  defineTool({
    name: "listar_tarefas",
    kind: "readonly",
    description:
      "Lista as tarefas do escritório com os estados calculados pelas regras do sistema (vencida, faixa de prazo, em risco + motivo, aguardando o quê), " +
      "e devolve 'pessoas' (id + nome — use para o responsável) e 'projetos' (id + nome curto). " +
      "Filtros: status, responsavelId, projetoId, prazo ('vencidas'|'hoje'|'semana'|'fatal'). Concluídas só se pedir status 'done'. " +
      "Use para 'o que tenho para fazer?', 'o que está vencido?', 'tarefas do projeto X', 'o que está travado?'.",
    schema: z.object({
      status: STATUS.optional(),
      responsavelId: idOpt,
      projetoId: idOpt,
      prazo: z.enum(["vencidas", "hoje", "semana", "fatal"]).optional(),
      limite,
    }),
    run: async (_ctx, f) => {
      const b = await getTarefasBoard()
      const map = indexar(b.tarefas)
      const nomes = new Map(b.pessoas.map((p) => [p.id, p.first]))
      const nome = (id: number | null) => (id == null ? "sem responsável" : (nomes.get(id) ?? "sem responsável"))
      const proj = new Map(b.projetos.map((p) => [p.id, p.nomeCurto]))
      const lista = b.tarefas.filter((t) => {
        if (f.status ? t.status !== f.status : t.status === "done") return false
        if (f.responsavelId != null && t.responsavelId !== f.responsavelId) return false
        if (f.projetoId != null && t.projetoId !== f.projetoId) return false
        if (f.prazo === "vencidas" && !vencida(t, b.hoje)) return false
        if (f.prazo === "hoje" && t.prazo !== b.hoje) return false
        if (f.prazo === "semana" && faixa(t, b.hoje) !== "week") return false
        if (f.prazo === "fatal" && !t.prazoFatal) return false
        return true
      })
      const lim = Math.min(Math.max(f.limite ?? 30, 1), 50)
      return {
        hoje: b.hoje,
        total: lista.length,
        mostrando: Math.min(lista.length, lim),
        tarefas: lista.slice(0, lim).map((t) => ({
          id: t.id,
          titulo: t.titulo,
          status: t.status,
          statusLabel: statusLabel(t.status),
          prazo: t.prazo,
          prazoFatal: t.prazoFatal,
          vencida: vencida(t, b.hoje),
          projeto: t.projetoId != null ? proj.get(t.projetoId) ?? null : null,
          projetoId: t.projetoId,
          grupo: t.grupo,
          responsavel: nome(t.responsavelId),
          responsavelId: t.responsavelId,
          emRisco: motivosRisco(t, map, b.hoje).map((r) => `${r.titulo} venceu ${dataBr(r.prazo)}`),
          aguardando: t.status === "wait" ? aguardandoRotulo(t, map, nome) : null,
          anteriores: t.anteriores,
        })),
        pessoas: b.pessoas.map((p) => ({ id: p.id, nome: p.nome })),
        projetos: b.projetos.filter((p) => !p.arquivadoEm).map((p) => ({ id: p.id, nome: p.nomeCurto })),
      }
    },
  }),
  defineTool({
    name: "criar_tarefa",
    kind: "mutation",
    description:
      "Cria uma tarefa. Só o TÍTULO é obrigatório: sem prazo informado vale a sexta-feira desta semana; sem responsável, fica com quem pediu. " +
      "Nunca invente responsável nem prazo — se o usuário citar alguém, resolva o id com listar_tarefas (pessoas). " +
      "Marque prazoFatal para prazos legais/processuais. Vincule projeto/grupo/cliente quando indicado.",
    schema: tarefaChat,
    resumo: (i) => `Criar tarefa: ${i.titulo}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Criar tarefa: ${i.titulo}`,
      detalhes: [
        { label: "Tarefa", valor: i.titulo },
        { label: "Responsável", valor: i.responsavelId === undefined ? "Você" : i.responsavelId ? await nomeUsuario(i.responsavelId) : "Sem responsável" },
        { label: "Prazo", valor: `${i.prazo ? dataBr(i.prazo) : "Sexta desta semana"}${i.prazoFatal ? " · prazo fatal" : ""}` },
        { label: "Projeto", valor: `${await nomeProjeto(i.projetoId)}${i.grupo ? ` · ${i.grupo}` : ""}` },
        ...(i.clienteId ? [{ label: "Cliente", valor: await nomeCliente(i.clienteId) }] : []),
      ],
    }),
    run: async (ctx, i) => criarTarefa(paraNova(i), await resolverAtor(ctx.user.email)),
  }),
  defineTool({
    name: "criar_tarefas_lote",
    kind: "mutation",
    description:
      "Cria VÁRIAS tarefas de UMA vez (prefira isto a repetir criar_tarefa — muito mais rápido e barato). Cada tarefa segue as mesmas regras de criar_tarefa. " +
      "Não dispara aviso individual por tarefa.",
    schema: z.object({ tarefas: z.array(tarefaChat).min(1).max(60) }),
    resumo: (i) => `Criar ${i.tarefas.length} tarefas`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Criar ${i.tarefas.length} tarefas`,
      detalhes: [
        { label: "Tarefas", valor: String(i.tarefas.length) },
        { label: "Exemplos", valor: i.tarefas.slice(0, 4).map((t) => t.titulo).join(" · ") + (i.tarefas.length > 4 ? " …" : "") },
      ],
    }),
    run: async (ctx, i) => criarTarefas(i.tarefas.map(paraNova), await resolverAtor(ctx.user.email)),
  }),
  defineTool({
    name: "editar_tarefa",
    kind: "mutation",
    description:
      "Edita uma tarefa (id via listar_tarefas). Envie só o que muda: titulo, descricao, prazo (ajustarSeguintes=true desloca as seguintes pelo mesmo número de dias — prazo fatal nunca muda), " +
      "prazoFatal, responsavelId, projetoId (trocar de projeto remove as ligações e o grupo), grupo, clienteId, status ('todo'|'doing'|'wait'|'done'). " +
      "Status 'wait' sem tarefa anterior pendente exige aguardandoTexto (o terceiro aguardado, ex.: 'Prefeitura — ITBI').",
    schema: z.object({
      id: idReq.describe("Id da tarefa"),
      titulo: z.string().min(2).max(300).optional(),
      descricao: z.string().max(4000).optional(),
      prazo: dataISO.optional(),
      ajustarSeguintes: z.boolean().optional(),
      prazoFatal: z.boolean().optional(),
      responsavelId: idOpt,
      projetoId: idOpt,
      grupo: z.string().max(160).optional(),
      clienteId: idOpt,
      status: STATUS.optional(),
      aguardandoTexto: z.string().max(200).optional(),
    }),
    resumo: (i) => `Editar tarefa #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const a = await prisma.tarefa.findUnique({ where: { id: i.id }, select: { titulo: true, prazo: true, status: true, prazoFatal: true } })
      const det = [
        diffRow("Título", i.titulo, a?.titulo),
        diffRow("Prazo", i.prazo ? dataBr(i.prazo) : undefined, a?.prazo ? dataBr(a.prazo.toISOString().slice(0, 10)) : undefined),
        diffRow("Status", i.status ? statusLabel(i.status) : undefined, a?.status ? statusLabel(a.status) : undefined),
        diffRow("Prazo fatal", i.prazoFatal === undefined ? undefined : i.prazoFatal ? "Sim" : "Não", a ? (a.prazoFatal ? "Sim" : "Não") : undefined),
        i.responsavelId !== undefined ? { label: "Responsável", valor: i.responsavelId ? await nomeUsuario(i.responsavelId) : "Sem responsável" } : null,
        i.projetoId !== undefined ? { label: "Projeto", valor: await nomeProjeto(i.projetoId) } : null,
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: `Editar tarefa: ${a?.titulo ?? `#${i.id}`}`, detalhes: det.length ? det : undefined }
    },
    run: async (ctx, i) => {
      const ator = await resolverAtor(ctx.user.email)
      const patch = {
        titulo: i.titulo,
        descricao: i.descricao,
        prazoFatal: i.prazoFatal,
        responsavelId: i.responsavelId,
        projetoId: i.projetoId,
        grupo: i.grupo,
        clienteId: i.clienteId,
      }
      const temPatch = Object.values(patch).some((v) => v !== undefined)
      if (temPatch) await atualizarTarefa(i.id, patch, ator)
      if (i.prazo) await definirPrazo(i.id, i.prazo, !!i.ajustarSeguintes, ator)
      if (i.status) {
        const r = await moverStatus(i.id, i.status, { aguardandoTexto: i.aguardandoTexto, confirmarInicio: true }, ator)
        if ("precisaTexto" in r) throw new UserError("Informe aguardandoTexto: o que ou quem está sendo aguardado.")
      }
      return { id: i.id }
    },
  }),
  defineTool({
    name: "concluir_tarefa",
    kind: "mutation",
    description:
      "Conclui uma tarefa: as seguintes que só esperavam por ela são liberadas e o responsável de cada uma recebe 'Sua vez'. " +
      "Devolve as liberadas; se alguma liberada estiver sem responsável, pergunte ao usuário quem cuida do próximo passo e use editar_tarefa.",
    schema: z.object({ id: idReq.describe("Id da tarefa") }),
    resumo: (i) => `Concluir tarefa #${i.id}`,
    montarConfirmacao: async (_ctx, i) => ({ resumo: `Concluir: ${await tituloTarefa(i.id)}` }),
    run: async (ctx, i) => concluirTarefa(i.id, await resolverAtor(ctx.user.email)),
  }),
  defineTool({
    name: "ligar_tarefas",
    kind: "mutation",
    description:
      "Cria a ligação 'a SEGUINTE só começa depois que a ANTERIOR terminar' (anteriorId → seguinteId). Só entre tarefas do MESMO projeto; ciclos são recusados. " +
      "Se a seguinte estava 'a fazer' e a anterior não terminou, ela passa a 'aguardando'.",
    schema: z.object({ anteriorId: idReq, seguinteId: idReq }),
    resumo: (i) => `Ligar #${i.anteriorId} → #${i.seguinteId}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `${await tituloTarefa(i.seguinteId)} só começa depois de ${await tituloTarefa(i.anteriorId)}`,
    }),
    run: async (ctx, i) => ligar(i.anteriorId, i.seguinteId, await resolverAtor(ctx.user.email)),
  }),
  defineTool({
    name: "desligar_tarefas",
    kind: "mutation",
    description: "Remove a ligação 'só começa depois de' entre duas tarefas (anteriorId → seguinteId).",
    schema: z.object({ anteriorId: idReq, seguinteId: idReq }),
    resumo: (i) => `Remover ligação #${i.anteriorId} → #${i.seguinteId}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Remover ligação: ${await tituloTarefa(i.anteriorId)} → ${await tituloTarefa(i.seguinteId)}`,
    }),
    run: async (ctx, i) => desligar(i.anteriorId, i.seguinteId, await resolverAtor(ctx.user.email)),
  }),
  defineTool({
    name: "excluir_tarefa",
    kind: "mutation",
    description: "Exclui uma tarefa (id via listar_tarefas). As seguintes que só esperavam por ela voltam para 'a fazer'.",
    schema: z.object({ id: idReq.describe("Id da tarefa") }),
    resumo: (i) => `Excluir tarefa #${i.id}`,
    montarConfirmacao: async (_ctx, i) => ({ resumo: `Excluir: ${await tituloTarefa(i.id)}` }),
    run: async (ctx, i) => excluirTarefa(i.id, await resolverAtor(ctx.user.email)),
  }),
]
