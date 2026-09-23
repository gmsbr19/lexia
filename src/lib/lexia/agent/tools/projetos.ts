// Projetos tools (redesign): projeto é FILTRO do quadro único de Tarefas.
// Leitura aberta; criar/editar/arquivar/excluir e criar a partir de modelo só
// para sócio/advogado (admin passa). `criar_estrutura_projeto` cria projeto +
// tarefas + ligações numa única chamada (economia de tokens na criação em massa).
import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  atualizarProjeto,
  criarProjeto,
  criarProjetoDeModelo,
  excluirProjeto,
  montarEstruturaProjeto,
} from "@/lib/projetos/mutations"
import { gruposPadrao } from "@/lib/projetos/modelo"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { getModelos, getProjetos, getTarefas } from "@/lib/tarefas/queries"
import { hojeSP, indexar, motivosRisco, vencida } from "@/lib/tarefas/regras"
import { resolverAtor } from "@/lib/tarefas/mutations"
import { statusLabel } from "@/lib/tarefas/types"
import { idOpt, idReq } from "@/lib/validation"
import { dataBr, diffRow, nomeArea, nomeCliente, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"
import { cap, limite } from "./shared"

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")

const projetoCampos = z.object({
  nomeCurto: z.string().min(1).max(24).describe("Nome curto (aparece nos cartões com a cor), ex.: 'Alfa'"),
  nome: z.string().min(2).max(200).describe("Nome completo, ex.: 'Integralização Holding Alfa'"),
  clienteId: idOpt.describe("Cliente (id via buscar) — todas as tarefas herdam esse cliente"),
  area: z.string().max(60).optional().describe("Chave da área do direito (ex.: 'soc', 'trab')"),
  responsavelId: idOpt.describe("Responsável (id via listar_tarefas → pessoas)"),
  prazo: dataISO.optional().describe("Prazo final (opcional)"),
  descricao: z.string().max(4000).optional(),
})

async function detalhesProjeto(i: Partial<z.infer<typeof projetoCampos>>) {
  return [
    i.nomeCurto ? { label: "Projeto", valor: `${i.nomeCurto}${i.nome ? ` — ${i.nome}` : ""}` } : null,
    i.clienteId ? { label: "Cliente", valor: await nomeCliente(i.clienteId) } : null,
    i.area ? { label: "Área", valor: await nomeArea(i.area) } : null,
    i.responsavelId ? { label: "Responsável", valor: await nomeUsuario(i.responsavelId) } : null,
    i.prazo ? { label: "Prazo final", valor: dataBr(i.prazo) } : null,
  ].filter((d): d is NonNullable<typeof d> => d != null)
}

export const projetosTools = [
  defineTool({
    name: "listar_projetos",
    kind: "readonly",
    description:
      "Lista os projetos (ativos e arquivados) com cliente, responsável, prazo final, progresso ('x de y') e nº de tarefas vencidas. " +
      "Use para 'quais projetos temos?', 'como está o projeto X?', 'projetos com tarefas vencidas'.",
    schema: z.object({ arquivados: z.boolean().optional().describe("true = só arquivados; padrão = só ativos"), limite }),
    run: async (_ctx, { arquivados, limite: l }) => {
      const [projetos, tarefas] = await Promise.all([getProjetos(), getTarefas({ projetoId: { not: null } })])
      const hoje = hojeSP()
      const lista = projetos
        .filter((p) => (arquivados ? !!p.arquivadoEm : !p.arquivadoEm))
        .map((p) => {
          const ts = tarefas.filter((t) => t.projetoId === p.id)
          return {
            id: p.id,
            nomeCurto: p.nomeCurto,
            nome: p.nome,
            clienteId: p.clienteId,
            responsavelId: p.responsavelId,
            prazo: p.prazo,
            arquivadoEm: p.arquivadoEm,
            progresso: `${ts.filter((t) => t.status === "done").length} de ${ts.length}`,
            vencidas: ts.filter((t) => vencida(t, hoje)).length,
          }
        })
      return cap(lista, l)
    },
  }),
  defineTool({
    name: "detalhe_projeto",
    kind: "readonly",
    description:
      "Detalha um projeto: dados, grupos e TODAS as tarefas (status, prazo, prazo fatal, responsável, grupo, anteriores, em risco). " +
      "Use antes de editar/ligar tarefas de um projeto.",
    schema: z.object({ id: idReq.describe("Id do projeto (via listar_projetos)") }),
    run: async (_ctx, { id }) => {
      const [p, tarefas] = await Promise.all([
        prisma.projeto.findFirst({ where: { id, excluidoEm: null } }),
        getTarefas({ projetoId: id }),
      ])
      if (!p) return { erro: "Projeto não encontrado" }
      const hoje = hojeSP()
      const map = indexar(tarefas)
      return {
        id: p.id,
        nomeCurto: p.nomeCurto,
        nome: p.nome,
        clienteId: p.clienteId,
        area: p.area,
        responsavelId: p.responsavelId,
        prazo: p.prazo?.toISOString().slice(0, 10) ?? null,
        arquivado: !!p.arquivadoEm,
        descricao: p.descricao,
        grupos: [...new Set(tarefas.map((t) => t.grupo).filter(Boolean))],
        tarefas: tarefas.map((t) => ({
          id: t.id,
          titulo: t.titulo,
          status: statusLabel(t.status),
          prazo: t.prazo,
          prazoFatal: t.prazoFatal,
          vencida: vencida(t, hoje),
          grupo: t.grupo,
          responsavelId: t.responsavelId,
          anteriores: t.anteriores,
          emRisco: motivosRisco(t, map, hoje).length > 0,
        })),
      }
    },
  }),
  defineTool({
    name: "listar_modelos_projeto",
    kind: "readonly",
    description:
      "Lista os modelos de projeto (processos repetíveis do escritório): papéis, passos, 'dias antes do prazo do grupo', prazos fatais e ligações. " +
      "Use antes de criar_projeto_de_modelo.",
    schema: z.object({}),
    run: async () => ({ modelos: await getModelos() }),
  }),
  defineTool({
    name: "criar_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description: "Cria um projeto em branco. Para projeto com tarefas prontas prefira criar_estrutura_projeto (uma chamada) ou criar_projeto_de_modelo.",
    schema: projetoCampos,
    resumo: (i) => `Criar projeto: ${i.nomeCurto}`,
    montarConfirmacao: async (_ctx, i) => ({ resumo: `Criar projeto: ${i.nomeCurto}`, detalhes: await detalhesProjeto(i) }),
    run: async (ctx, i) => criarProjeto(i, await resolverAtor(ctx.user.email)),
  }),
  defineTool({
    name: "editar_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description: "Edita um projeto (id via listar_projetos): nome curto/completo, cliente, área, responsável, prazo final, descrição, ou arquivado=true/false.",
    schema: projetoCampos.partial().extend({ id: idReq, arquivado: z.boolean().optional() }),
    resumo: (i) => `Editar projeto #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const a = await prisma.projeto.findUnique({ where: { id: i.id }, select: { nomeCurto: true, arquivadoEm: true } })
      const det = [
        ...(await detalhesProjeto(i)),
        diffRow("Arquivado", i.arquivado === undefined ? undefined : i.arquivado ? "Sim" : "Não", a ? (a.arquivadoEm ? "Sim" : "Não") : undefined),
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: `Editar projeto: ${a?.nomeCurto ?? `#${i.id}`}`, detalhes: det.length ? det : undefined }
    },
    run: async (ctx, { id, ...patch }) => atualizarProjeto(id, patch, await resolverAtor(ctx.user.email)),
  }),
  defineTool({
    name: "excluir_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description: "Exclui um projeto (reversível). As tarefas NÃO somem — ficam 'Sem projeto'.",
    schema: z.object({ id: idReq }),
    resumo: (i) => `Excluir projeto #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.projeto.findUnique({ where: { id: i.id }, select: { nomeCurto: true } })
      return { resumo: `Excluir projeto: ${p?.nomeCurto ?? `#${i.id}`}` }
    },
    run: async (ctx, i) => excluirProjeto(i.id, await resolverAtor(ctx.user.email)),
  }),
  defineTool({
    name: "criar_projeto_de_modelo",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Cria um projeto a partir de um modelo (id via listar_modelos_projeto): gera, para cada GRUPO, uma tarefa por passo do modelo, " +
      "com prazo = prazo do grupo − dias antes, e as ligações do modelo. Informe os grupos (nome + prazo) ou só a quantidade " +
      "(nomes e prazos padrão), e o responsável de cada papel (papelId → id da pessoa; omitido = padrão do modelo).",
    schema: z.object({
      modeloId: idReq,
      projeto: projetoCampos,
      grupos: z.array(z.object({ nome: z.string().min(1).max(160), prazo: dataISO })).max(12).optional(),
      quantidadeGrupos: z.number().int().min(1).max(12).optional(),
      responsaveis: z.record(z.string(), idOpt).optional().describe("{ papelId: idDaPessoa }"),
    }),
    resumo: (i) => `Criar projeto ${i.projeto.nomeCurto} a partir de modelo`,
    montarConfirmacao: async (_ctx, i) => {
      const m = (await getModelos()).find((x) => x.id === i.modeloId)
      const n = i.grupos?.length ?? i.quantidadeGrupos ?? 1
      return {
        resumo: `Criar projeto ${i.projeto.nomeCurto} (${m?.nome ?? "modelo"})`,
        detalhes: [
          ...(await detalhesProjeto(i.projeto)),
          { label: "Grupos", valor: String(n) },
          { label: "Tarefas", valor: String(n * (m?.passos.length ?? 0)) },
        ],
      }
    },
    run: async (ctx, i) => {
      const m = (await getModelos()).find((x) => x.id === i.modeloId)
      if (!m) return { erro: "Modelo não encontrado" }
      const grupos = i.grupos?.length ? i.grupos : gruposPadrao(m, i.quantidadeGrupos ?? 1, hojeSP())
      return criarProjetoDeModelo(
        { modeloId: i.modeloId, projeto: i.projeto, grupos, responsaveis: i.responsaveis },
        await resolverAtor(ctx.user.email),
      )
    },
  }),
  defineTool({
    name: "criar_estrutura_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Cria UM projeto com TODAS as tarefas (e as ligações entre elas) numa ÚNICA chamada — use SEMPRE que o pedido for 'crie um projeto com as tarefas …'. " +
      "Cada tarefa: título, grupo (opcional, ex.: 'Protocolo 01'), responsavelId e prazo quando souber (prazo omitido = sexta desta semana), prazoFatal, " +
      "e depoisDe = índices (0-based) de tarefas ANTERIORES desta mesma lista que precisam terminar antes. Não é preciso descobrir ids.",
    schema: z.object({
      projeto: projetoCampos,
      tarefas: z
        .array(
          z.object({
            titulo: z.string().min(2).max(300),
            grupo: z.string().max(160).optional(),
            responsavelId: idOpt,
            prazo: dataISO.optional(),
            prazoFatal: z.boolean().optional(),
            descricao: z.string().max(4000).optional(),
            checklist: z.array(z.string().max(300)).max(30).optional(),
            depoisDe: z.array(z.number().int().min(0)).max(20).optional(),
          }),
        )
        .max(120),
    }),
    resumo: (i) => `Criar projeto ${i.projeto.nomeCurto} com ${i.tarefas.length} tarefas`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Criar projeto ${i.projeto.nomeCurto} com ${i.tarefas.length} tarefas`,
      detalhes: [
        ...(await detalhesProjeto(i.projeto)),
        { label: "Tarefas", valor: String(i.tarefas.length) },
        { label: "Ligações", valor: String(i.tarefas.reduce((n, t) => n + (t.depoisDe?.length ?? 0), 0)) },
      ],
    }),
    run: async (ctx, i) => montarEstruturaProjeto(i.projeto, i.tarefas, await resolverAtor(ctx.user.email)),
  }),
]
