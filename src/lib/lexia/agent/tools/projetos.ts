// Projetos INTERNOS do escritório (Manutenção do Lexia, Marketing…) — projetos do
// quadro de Tarefas que NÃO são casos de cliente. Projeto COM cliente é um caso
// (tools/casos.ts). Leitura aberta; criar/editar só sócio/advogado (admin passa);
// mutações confirmation-gated pelo loop.
import { z } from "zod"
import { prisma } from "@/lib/db"
import { ROLES_PROJETO_ESCRITA } from "@/lib/modelos/types"
import { resolverAtor } from "@/lib/tarefas/mutations"
import { criarProjeto, editarProjetoInterno } from "@/lib/tarefas/projetos"
import { WHERE_INTERNO_VIVO } from "@/lib/tarefas/queries"
import { hojeSP } from "@/lib/tarefas/regras"
import { idOpt, idReq } from "@/lib/validation"
import { dataBr, diffRow, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

export const projetosTools = [
  defineTool({
    name: "listar_projetos",
    kind: "readonly",
    description:
      "Lista os projetos INTERNOS do escritório (não são casos de cliente — ex.: Manutenção do Lexia, Marketing), com responsável, prazo final " +
      "e tarefas abertas/vencidas. Para casos de clientes use listar_casos. Use o id (projetoId) em criar_tarefa, listar_tarefas e aplicar_modelo.",
    schema: z.object({ arquivados: z.boolean().optional().describe("true = só os arquivados") }),
    run: async (_ctx, i) => {
      const hoje = hojeSP()
      const rows = await prisma.projeto.findMany({
        where: { ...WHERE_INTERNO_VIVO, arquivadoEm: i.arquivados ? { not: null } : null },
        orderBy: { nomeCurto: "asc" },
        select: {
          id: true,
          nomeCurto: true,
          nome: true,
          prazo: true,
          descricao: true,
          responsavel: { select: { nome: true } },
          tarefas: { where: { done: false }, select: { prazo: true } },
        },
      })
      return {
        projetos: rows.map((p) => ({
          projetoId: p.id,
          nomeCurto: p.nomeCurto,
          nome: p.nome,
          responsavel: p.responsavel?.nome ?? null,
          prazo: iso(p.prazo),
          descricao: p.descricao,
          tarefasAbertas: p.tarefas.length,
          tarefasVencidas: p.tarefas.filter((t) => iso(t.prazo)! < hoje).length,
        })),
      }
    },
  }),
  defineTool({
    name: "criar_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Cria um projeto INTERNO do escritório (sem cliente — ex.: 'Manutenção do Lexia', 'Gestão de marketing'). Se o trabalho é de um cliente, " +
      "é um CASO: use criar_caso. Para já criar com as tarefas, prefira criar_estrutura_projeto (novo sem clienteId).",
    schema: z.object({
      nomeCurto: z.string().min(1).max(24).describe("Nome curto que aparece nos cartões (ex.: 'Lexia')"),
      nome: z.string().min(2).max(400).describe("Nome completo do projeto"),
      responsavelId: idOpt.describe("Responsável (id via listar_tarefas → pessoas)"),
      prazo: dataISO.optional().describe("Prazo final (opcional)"),
      descricao: z.string().max(4000).optional(),
    }),
    resumo: (i) => `Criar projeto interno: ${i.nomeCurto}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Criar projeto interno: ${i.nomeCurto} — ${i.nome}`,
      detalhes: [
        i.responsavelId ? { label: "Responsável", valor: await nomeUsuario(i.responsavelId) } : null,
        i.prazo ? { label: "Prazo final", valor: dataBr(i.prazo) } : null,
      ].filter((d): d is NonNullable<typeof d> => d != null),
    }),
    run: async (ctx, i) => {
      const r = await criarProjeto({ ...i, clienteId: null }, await resolverAtor(ctx.user.email))
      return { projetoId: Number(r.chave.slice(1)), acaoId: r.acaoId }
    },
  }),
  defineTool({
    name: "editar_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Edita um projeto INTERNO (id via listar_projetos): nome curto, nome, responsável, prazo final, descrição, ou arquiva/reabre (arquivado). " +
      "Envie só o que muda. Casos de clientes se editam com editar_caso.",
    schema: z.object({
      id: idReq.describe("projetoId"),
      nomeCurto: z.string().min(1).max(24).optional(),
      nome: z.string().min(2).max(400).optional(),
      responsavelId: idOpt,
      prazo: dataISO.nullable().optional(),
      descricao: z.string().max(4000).nullable().optional(),
      arquivado: z.boolean().optional(),
    }),
    resumo: (i) => `Editar projeto #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const a = await prisma.projeto.findUnique({ where: { id: i.id }, select: { nomeCurto: true, nome: true, prazo: true, arquivadoEm: true } })
      const det = [
        diffRow("Nome curto", i.nomeCurto, a?.nomeCurto),
        diffRow("Nome", i.nome, a?.nome),
        diffRow("Prazo final", i.prazo === undefined ? undefined : i.prazo ? dataBr(i.prazo) : "Sem prazo", a?.prazo ? dataBr(iso(a.prazo)!) : "Sem prazo"),
        i.responsavelId !== undefined ? { label: "Responsável", valor: i.responsavelId ? await nomeUsuario(i.responsavelId) : "Sem responsável" } : null,
        i.arquivado !== undefined ? { label: "Situação", valor: i.arquivado ? "Arquivar" : "Reabrir" } : null,
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: `Editar projeto: ${a?.nomeCurto ?? `#${i.id}`}`, detalhes: det.length ? det : undefined }
    },
    run: async (ctx, { id, ...patch }) => editarProjetoInterno(id, patch, await resolverAtor(ctx.user.email)),
  }),
]
