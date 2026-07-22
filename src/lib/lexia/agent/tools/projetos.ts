// Projetos tools — list/detail (readonly) + criar/instanciar (confirmation-gated,
// gated to sócio/advogado). Lets the LexIA read project health and create or
// instantiate projects (e.g. "crie um projeto Holding para o cliente X").
import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  createProjeto,
  createSecao,
  createSecoes,
  deleteProjeto,
  deleteSecao,
  instanciarTemplateProjeto,
  montarEstruturaProjetos,
  reordenarSecoes,
  updateProjeto,
  updateSecao,
} from "@/lib/projetos/mutations"
import { getProjeto, getProjetosDataset, getTemplates } from "@/lib/projetos/queries"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { idOpt, idReq } from "@/lib/validation"
import { dataBr, diffRow, nomeCaso, nomeCliente, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"
import { cap, limite } from "./shared"

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")

const STATUS_PROJETO = ["ativo", "pausado", "concluido", "arquivado"] as const
const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  concluido: "Concluído",
  arquivado: "Arquivado",
}

// Árvore projeto → seções → tarefas para criação em UMA chamada (criar_estrutura_projetos).
const estTarefa = z.object({
  titulo: z.string().min(3).max(300).describe("Título 'verbo de ação + objeto'"),
  descricao: z.string().max(4000).optional().describe("Descrição/contexto (opcional aqui)"),
  responsavelId: idOpt.describe("Responsável (id via listar_tarefas → socios)"),
  prazo: dataISO.optional().describe("Prazo (YYYY-MM-DD)"),
  prio: z.number().int().min(1).max(4).optional().describe("1=Urgente..4=Normal (padrão 3)"),
  dor: z.array(z.string().min(1)).max(6).optional().describe("Definition of Ready (opcional)"),
  dod: z.array(z.string().min(1)).max(6).optional().describe("Definition of Done (opcional)"),
})
const estSecao = z.object({
  nome: z.string().min(1).max(120).describe("Nome da seção (coluna)"),
  cor: z.string().max(40).optional(),
  tarefas: z.array(estTarefa).max(100).optional().describe("Tarefas desta seção"),
})
const estProjeto = z.object({
  nome: z.string().min(2).max(200).describe("Nome do projeto"),
  descricao: z.string().max(2000).optional(),
  area: z.string().max(40).optional().describe("Área (tag): trab/soc/trib/civ…"),
  responsavelId: idOpt.describe("Líder do projeto (id via listar_tarefas → socios)"),
  prazo: dataISO.optional(),
  casoId: idOpt.describe("Vincular a um caso (id via buscar)"),
  clienteId: idOpt.describe("Vincular a um cliente (id via buscar)"),
  secoes: z.array(estSecao).max(50).optional().describe("Seções (colunas), cada uma com suas tarefas"),
  tarefas: z.array(estTarefa).max(100).optional().describe("Tarefas do projeto sem seção"),
})

function contarEstrutura(projetos: z.infer<typeof estProjeto>[]) {
  let secoes = 0
  let tarefas = 0
  for (const p of projetos) {
    tarefas += p.tarefas?.length ?? 0
    for (const s of p.secoes ?? []) {
      secoes += 1
      tarefas += s.tarefas?.length ?? 0
    }
  }
  return { projetos: projetos.length, secoes, tarefas }
}

export const projetosTools = [
  defineTool({
    name: "criar_estrutura_projetos",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Cria uma ESTRUTURA INTEIRA de uma vez, numa ÚNICA chamada: um ou mais projetos, cada um com suas SEÇÕES e as TAREFAS de cada seção. Use SEMPRE que o pedido for 'crie um projeto com as seções A/B/C e as tarefas …' ou vários projetos — em vez de criar em etapas (criar_projeto → criar_secao → criar_tarefa). Você NÃO precisa descobrir ids de seção antes: mande a árvore aninhada e o servidor conecta tudo (projeto→seção→tarefa) numa transação. Cada tarefa: título 'verbo + objeto' e, quando souber, responsavelId (via listar_tarefas → socios) e prazo; DoR/DoD são OPCIONAIS aqui. DICA: se forem MUITAS tarefas, chame esta ferramenta UM PROJETO por vez (evita estourar o limite de tamanho da resposta). Só para sócio/advogado.",
    schema: z.object({
      projetos: z.array(estProjeto).min(1).max(20).describe("Árvore de projetos → seções → tarefas"),
    }),
    resumo: (i) => {
      const c = contarEstrutura(i.projetos)
      return `Criar ${c.projetos} projeto(s), ${c.secoes} seções e ${c.tarefas} tarefas`
    },
    montarConfirmacao: async (_ctx, i) => {
      const c = contarEstrutura(i.projetos)
      return {
        resumo: `Criar estrutura: ${c.projetos} projeto(s), ${c.secoes} seções, ${c.tarefas} tarefas`,
        detalhes: [
          { label: "Projetos", valor: i.projetos.map((p) => p.nome).join(" · ") },
          { label: "Seções", valor: String(c.secoes) },
          { label: "Tarefas", valor: String(c.tarefas) },
        ],
      }
    },
    run: async (ctx, i) => montarEstruturaProjetos(i.projetos, ctx.user.email),
  }),
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
    description:
      "Detalha um projeto: status, saúde, progresso, prazo-alvo, responsável, contagem de tarefas e as SEÇÕES " +
      "(colunas do quadro, com id/nome/cor/ordem). Id via listar_projetos. Use os ids das seções para " +
      "editar_secao/excluir_secao/reordenar_secoes e para colocar uma tarefa numa seção (criar_tarefa/editar_tarefa).",
    schema: z.object({ id: idReq.describe("Id do projeto") }),
    run: async (_ctx, { id }) => {
      const p = await getProjeto(id)
      if (!p) return { erro: "Projeto não encontrado" }
      const secoes = await prisma.projetoSecao.findMany({
        where: { projetoId: id },
        orderBy: { ordem: "asc" },
        select: { id: true, nome: true, cor: true, ordem: true },
      })
      return { ...p, secoes }
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
    name: "editar_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Edita um projeto (id via listar_projetos). Envie SÓ o que muda. Para arquivar/pausar/concluir use " +
      "status ('ativo'/'pausado'/'concluido'/'arquivado'). Também: nome, descrição, área, prazo-alvo, " +
      "responsável (id via listar_projetos → socios) e vínculo a caso/cliente.",
    schema: z.object({
      id: idReq.describe("Id do projeto"),
      nome: z.string().min(2).max(200).optional(),
      descricao: z.string().max(2000).optional(),
      status: z.enum(STATUS_PROJETO).optional().describe("ativo/pausado/concluido/arquivado"),
      area: z.string().max(40).optional(),
      prazo: dataISO.optional().describe("Data-alvo (YYYY-MM-DD)"),
      responsavelId: idOpt.describe("Novo líder (id via listar_projetos → socios)"),
      casoId: idOpt.describe("Vincular a um caso (id via buscar)"),
      clienteId: idOpt.describe("Vincular a um cliente (id via buscar)"),
    }),
    resumo: (i) => `Editar projeto #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const antes = await prisma.projeto.findFirst({
        where: { id: i.id, excluidoEm: null },
        select: { nome: true, status: true, prazo: true, responsavelId: true },
      })
      const det = [
        diffRow("Nome", i.nome, antes?.nome),
        diffRow("Status", i.status ? STATUS_LABEL[i.status] : undefined, antes?.status ? STATUS_LABEL[antes.status] ?? antes.status : undefined),
        diffRow("Prazo-alvo", i.prazo ? dataBr(i.prazo) : undefined, antes?.prazo ? dataBr(antes.prazo.toISOString().slice(0, 10)) : undefined),
        i.responsavelId != null
          ? diffRow("Responsável", await nomeUsuario(i.responsavelId), antes?.responsavelId ? await nomeUsuario(antes.responsavelId) : undefined)
          : null,
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: "Editar projeto", detalhes: det.length ? det : undefined }
    },
    run: async (_ctx, i) =>
      updateProjeto(i.id, {
        nome: i.nome,
        descricao: i.descricao,
        status: i.status,
        area: i.area,
        prazo: i.prazo,
        responsavelId: i.responsavelId,
        casoId: i.casoId,
        clienteId: i.clienteId,
      }),
  }),
  defineTool({
    name: "excluir_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Exclui um projeto (soft-delete REVERSÍVEL). As tarefas do projeto NÃO são apagadas — passam a ler como " +
      "'sem projeto'. Id via listar_projetos.",
    schema: z.object({ id: idReq.describe("Id do projeto") }),
    resumo: (i) => `Excluir projeto #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.projeto.findFirst({ where: { id: i.id, excluidoEm: null }, select: { nome: true } })
      return { resumo: "Excluir projeto", detalhes: [{ label: "Projeto", valor: p?.nome ?? `#${i.id}` }] }
    },
    run: async (_ctx, i) => deleteProjeto(i.id),
  }),
  defineTool({
    name: "criar_secao",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Cria uma seção (coluna do quadro / grupo da lista, estilo Todoist) num projeto. Informe o projetoId " +
      "(via listar_projetos) e o nome; a ordem é anexada ao final automaticamente.",
    schema: z.object({
      projetoId: idReq.describe("Id do projeto (via listar_projetos)"),
      nome: z.string().min(1).max(120).describe("Nome da seção"),
      cor: z.string().max(40).optional().describe("Cor opcional (hex ou token)"),
    }),
    resumo: (i) => `Criar seção "${i.nome}"`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.projeto.findFirst({ where: { id: i.projetoId, excluidoEm: null }, select: { nome: true } })
      return {
        resumo: `Criar seção: ${i.nome}`,
        detalhes: [
          { label: "Projeto", valor: p?.nome ?? `#${i.projetoId}` },
          { label: "Seção", valor: i.nome },
        ],
      }
    },
    run: async (_ctx, i) => createSecao(i.projetoId, { nome: i.nome, cor: i.cor ?? null }),
  }),
  defineTool({
    name: "criar_secoes_lote",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Cria VÁRIAS seções num projeto de UMA vez (prefira isto a repetir criar_secao — muito mais rápido e barato). " +
      "Informe o projetoId (via listar_projetos) e a lista de seções (nome + cor opcional), na ordem desejada. " +
      "DEVOLVE os ids das seções criadas — use-os direto em criar_tarefas_lote (secaoId) SEM re-detalhar o projeto.",
    schema: z.object({
      projetoId: idReq.describe("Id do projeto (via listar_projetos)"),
      secoes: z
        .array(z.object({ nome: z.string().min(1).max(120).describe("Nome da seção"), cor: z.string().max(40).optional() }))
        .min(1)
        .max(50)
        .describe("Seções a criar, na ordem desejada"),
    }),
    resumo: (i) => `Criar ${i.secoes.length} seções`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.projeto.findFirst({ where: { id: i.projetoId, excluidoEm: null }, select: { nome: true } })
      return {
        resumo: `Criar ${i.secoes.length} seções`,
        detalhes: [
          { label: "Projeto", valor: p?.nome ?? `#${i.projetoId}` },
          { label: "Seções", valor: i.secoes.map((s) => s.nome).join(" · ") },
        ],
      }
    },
    run: async (_ctx, i) => createSecoes(i.projetoId, i.secoes.map((s) => ({ nome: s.nome, cor: s.cor ?? null }))),
  }),
  defineTool({
    name: "editar_secao",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description: "Renomeia/recolore uma seção. Id da seção via detalhe_projeto. Envie só o que muda (nome, cor).",
    schema: z.object({
      id: idReq.describe("Id da seção (via detalhe_projeto → secoes)"),
      nome: z.string().min(1).max(120).optional(),
      cor: z.string().max(40).optional(),
    }),
    resumo: (i) => `Editar seção #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const antes = await prisma.projetoSecao.findUnique({ where: { id: i.id }, select: { nome: true } })
      const det = [diffRow("Nome", i.nome, antes?.nome)].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: "Editar seção", detalhes: det.length ? det : undefined }
    },
    run: async (_ctx, i) => updateSecao(i.id, { nome: i.nome, cor: i.cor }),
  }),
  defineTool({
    name: "excluir_secao",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Exclui uma seção. As tarefas dela NÃO são apagadas — viram 'Sem seção'. Id da seção via detalhe_projeto.",
    schema: z.object({ id: idReq.describe("Id da seção (via detalhe_projeto → secoes)") }),
    resumo: (i) => `Excluir seção #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const s = await prisma.projetoSecao.findUnique({ where: { id: i.id }, select: { nome: true } })
      return { resumo: "Excluir seção", detalhes: [{ label: "Seção", valor: s?.nome ?? `#${i.id}` }] }
    },
    run: async (_ctx, i) => deleteSecao(i.id),
  }),
  defineTool({
    name: "reordenar_secoes",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Reordena as seções de um projeto. Passe o projetoId e a lista de ids das seções na NOVA ordem desejada " +
      "(ids via detalhe_projeto → secoes).",
    schema: z.object({
      projetoId: idReq.describe("Id do projeto"),
      ids: z.array(idReq).min(1).max(100).describe("Ids das seções na nova ordem"),
    }),
    resumo: (i) => `Reordenar ${i.ids.length} seções do projeto #${i.projetoId}`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.projeto.findFirst({ where: { id: i.projetoId, excluidoEm: null }, select: { nome: true } })
      return {
        resumo: "Reordenar seções",
        detalhes: [{ label: "Projeto", valor: p?.nome ?? `#${i.projetoId}` }, { label: "Nova ordem", valor: `${i.ids.length} seções` }],
      }
    },
    run: async (_ctx, i) => reordenarSecoes(i.projetoId, i.ids),
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
