// Projetos tools — list/detail (readonly) + criar/instanciar (confirmation-gated,
// gated to sócio/advogado). Lets the LexIA read project health and create or
// instantiate projects (e.g. "crie um projeto Holding para o cliente X").
import { z } from "zod"
import { prisma } from "@/lib/db"
import { createProjeto, instanciarTemplateProjeto } from "@/lib/projetos/mutations"
import { getProjeto, getProjetosDataset, getTemplates } from "@/lib/projetos/queries"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { idOpt, idReq } from "@/lib/validation"
import { dataBr, nomeCaso, nomeCliente, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"
import { cap, limite } from "./shared"

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")

export const projetosTools = [
  defineTool({
    name: "listar_projetos",
    kind: "readonly",
    description:
      "Lista os projetos (containers de trabalho) com saúde, progresso (%), nº de tarefas e atrasadas, " +
      "responsável, prazo-alvo e vínculo. Use para 'quais projetos temos?', 'saúde dos projetos', " +
      "'projetos atrasados', 'projetos do cliente X'.",
    schema: z.object({
      status: z.string().max(20).optional().describe("Filtra por status (ativo/pausado/concluido/arquivado)"),
      limite,
    }),
    run: async (_ctx, { status, limite: l }) => {
      const ds = await getProjetosDataset()
      const projetos = status ? ds.projetos.filter((p) => p.status === status) : ds.projetos
      return { ...cap(projetos, l), socios: ds.socios }
    },
  }),
  defineTool({
    name: "detalhe_projeto",
    kind: "readonly",
    description: "Detalha um projeto: status, saúde, progresso, prazo-alvo, responsável e contagem de tarefas. Id via listar_projetos.",
    schema: z.object({ id: idReq.describe("Id do projeto") }),
    run: async (_ctx, { id }) => {
      const p = await getProjeto(id)
      if (!p) return { erro: "Projeto não encontrado" }
      return p
    },
  }),
  defineTool({
    name: "listar_templates_projeto",
    kind: "readonly",
    description:
      "Lista os templates de projeto do escritório (processos repetíveis, ex.: 'Holding Patrimonial') com o nº de tarefas e quantas vezes já foram usados. Use antes de instanciar_template_projeto.",
    schema: z.object({ limite }),
    run: async (_ctx, { limite: l }) => {
      const templates = await getTemplates()
      const resumo = templates.map((t) => ({ id: t.id, nome: t.nome, area: t.area, tarefas: t.itens.length, usos: t.usos }))
      return cap(resumo, l)
    },
  }),
  defineTool({
    name: "criar_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Cria um projeto (container de trabalho) em branco. Informe nome e, quando indicado, responsável (id via " +
      "listar_projetos → socios), prazo-alvo e vínculo a um caso OU cliente (id via buscar). Para um processo " +
      "repetível (ex.: Holding), prefira instanciar_template_projeto.",
    schema: z.object({
      nome: z.string().min(2).max(200).describe("Nome do projeto"),
      descricao: z.string().max(2000).optional(),
      area: z.string().max(40).optional().describe("Área de prática (tag), ex.: trab/soc/trib/civ"),
      responsavelId: idOpt.describe("Líder do projeto (id via listar_projetos → socios)"),
      prazo: dataISO.optional().describe("Data-alvo do projeto"),
      casoId: idOpt.describe("Vincular a um caso (id via buscar)"),
      clienteId: idOpt.describe("Vincular a um cliente (id via buscar)"),
    }),
    resumo: (i) => `Criar projeto: ${i.nome}`,
    montarConfirmacao: async (_ctx, i) => {
      const det: { label: string; valor: string }[] = [{ label: "Projeto", valor: i.nome }]
      if (i.responsavelId) det.push({ label: "Responsável", valor: await nomeUsuario(i.responsavelId) })
      if (i.prazo) det.push({ label: "Prazo-alvo", valor: dataBr(i.prazo) })
      if (i.casoId) det.push({ label: "Caso", valor: await nomeCaso(i.casoId) })
      if (i.clienteId) det.push({ label: "Cliente", valor: await nomeCliente(i.clienteId) })
      return { resumo: `Criar projeto: ${i.nome}`, detalhes: det }
    },
    run: async (_ctx, i) =>
      createProjeto({
        nome: i.nome,
        descricao: i.descricao ?? null,
        area: i.area ?? null,
        responsavelId: i.responsavelId ?? null,
        prazo: i.prazo ?? null,
        casoId: i.casoId ?? null,
        clienteId: i.clienteId ?? null,
      }),
  }),
  defineTool({
    name: "instanciar_template_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Instancia um template de projeto: cria 1 projeto + as tarefas-padrão com prazos relativos calculados em " +
      "DIAS ÚTEIS a partir da data de início. Obtenha o templateId em listar_templates_projeto. Vincule a um " +
      "caso/cliente quando indicado e defina o responsável (líder + responsável-padrão das tarefas).",
    schema: z.object({
      templateId: idReq.describe("Id do template (via listar_templates_projeto)"),
      dataInicio: dataISO.describe("Data de início (AAAA-MM-DD) — base dos prazos relativos"),
      nome: z.string().max(200).optional().describe("Nome do projeto (padrão = nome do template)"),
      responsavelId: idOpt.describe("Líder + responsável-padrão (id via listar_projetos → socios)"),
      casoId: idOpt.describe("Vincular a um caso (id via buscar)"),
      clienteId: idOpt.describe("Vincular a um cliente (id via buscar)"),
    }),
    resumo: (i) => `Instanciar template #${i.templateId} em ${i.dataInicio}`,
    montarConfirmacao: async (_ctx, i) => {
      const t = await prisma.projetoTemplate.findUnique({ where: { id: i.templateId }, select: { nome: true } })
      const det: { label: string; valor: string }[] = [
        { label: "Template", valor: t?.nome ?? `#${i.templateId}` },
        { label: "Início", valor: dataBr(i.dataInicio) },
      ]
      if (i.nome) det.push({ label: "Nome do projeto", valor: i.nome })
      if (i.responsavelId) det.push({ label: "Responsável", valor: await nomeUsuario(i.responsavelId) })
      if (i.casoId) det.push({ label: "Caso", valor: await nomeCaso(i.casoId) })
      if (i.clienteId) det.push({ label: "Cliente", valor: await nomeCliente(i.clienteId) })
      return { resumo: `Instanciar "${t?.nome ?? "template"}"`, detalhes: det }
    },
    run: async (ctx, i) =>
      instanciarTemplateProjeto(
        {
          templateId: i.templateId,
          dataInicio: i.dataInicio,
          nome: i.nome,
          responsavelId: i.responsavelId ?? null,
          casoId: i.casoId ?? null,
          clienteId: i.clienteId ?? null,
        },
        ctx.user.email,
      ),
  }),
]
