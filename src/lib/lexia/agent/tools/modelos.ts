// Modelos de tarefas + montagem de projeto no quadro (projeto = caso de um cliente
// OU projeto interno do escritório). Leitura aberta; aplicar modelo / montar
// estrutura só para sócio/advogado (admin passa). `criar_estrutura_projeto` cria
// (ou completa) um projeto com todas as tarefas + ligações numa única chamada
// (economia de tokens).
import { z } from "zod"
import { prisma } from "@/lib/db"
import { montarEstruturaProjeto, usarModelo, type AlvoProjeto } from "@/lib/modelos/mutations"
import { gruposPadrao } from "@/lib/modelos/modelo"
import { ROLES_PROJETO_ESCRITA } from "@/lib/modelos/types"
import { chaveCaso, chaveInterno } from "@/lib/tarefas/projetos-quadro"
import { getModelos } from "@/lib/tarefas/queries"
import { hojeSP } from "@/lib/tarefas/regras"
import { resolverAtor } from "@/lib/tarefas/mutations"
import { idOpt, idReq } from "@/lib/validation"
import { dataBr, nomeArea, nomeCliente, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")

/** Projeto NOVO criado junto: COM cliente vira caso do cliente; SEM cliente, projeto interno. */
const projetoNovo = z.object({
  nomeCurto: z.string().min(1).max(24).describe("Nome curto (aparece nos cartões com a cor), ex.: 'Alfa'"),
  nome: z.string().min(2).max(400).describe("Título, ex.: 'Integralização Holding Alfa' ou 'Manutenção do Lexia'"),
  clienteId: idOpt.describe("Cliente (id via buscar) — com cliente o projeto é um CASO do cliente; sem cliente, um projeto INTERNO"),
  area: z.string().max(60).optional().describe("Chave da área do direito (só caso; ex.: 'soc', 'trab')"),
  responsavelId: idOpt.describe("Responsável (id via listar_tarefas → pessoas)"),
  prazo: dataISO.optional().describe("Prazo final (opcional)"),
  descricao: z.string().max(4000).optional(),
})

type EntradaAlvo = { casoId?: number | null; projetoId?: number | null; novo?: z.infer<typeof projetoNovo> }

async function detalhesAlvo(i: EntradaAlvo) {
  if (i.casoId) {
    const c = await prisma.caso.findUnique({ where: { id: i.casoId }, select: { titulo: true, nomeCurto: true } })
    return [{ label: "Caso", valor: c ? (c.nomeCurto ? `${c.nomeCurto} — ${c.titulo}` : c.titulo) : `#${i.casoId}` }]
  }
  if (i.projetoId) {
    const p = await prisma.projeto.findUnique({ where: { id: i.projetoId }, select: { nome: true, nomeCurto: true } })
    return [{ label: "Projeto interno", valor: p ? `${p.nomeCurto} — ${p.nome}` : `#${i.projetoId}` }]
  }
  const n = i.novo
  if (!n) return []
  return [
    { label: n.clienteId ? "Novo caso" : "Novo projeto interno", valor: `${n.nomeCurto} — ${n.nome}` },
    n.clienteId ? { label: "Cliente", valor: await nomeCliente(n.clienteId) } : null,
    n.clienteId && n.area ? { label: "Área", valor: await nomeArea(n.area) } : null,
    n.responsavelId ? { label: "Responsável", valor: await nomeUsuario(n.responsavelId) } : null,
    n.prazo ? { label: "Prazo final", valor: dataBr(n.prazo) } : null,
  ].filter((d): d is NonNullable<typeof d> => d != null)
}

function alvoDe(i: EntradaAlvo): AlvoProjeto | { erro: string } {
  const n = [i.casoId, i.projetoId, i.novo].filter((v) => v != null).length
  if (n !== 1) return { erro: "Informe UM alvo: casoId (caso existente), projetoId (projeto interno existente) ou novo (projeto novo)" }
  if (i.casoId) return { projeto: chaveCaso(i.casoId) }
  if (i.projetoId) return { projeto: chaveInterno(i.projetoId) }
  return { novo: i.novo! }
}

const rotuloAlvo = (i: EntradaAlvo) =>
  i.novo ? `no novo ${i.novo.clienteId ? "caso" : "projeto"} ${i.novo.nomeCurto}` : i.casoId ? `no caso #${i.casoId}` : `no projeto #${i.projetoId}`

const alvoDescricao =
  "Alvo (exatamente UM): casoId (caso EXISTENTE — via listar_casos/buscar), projetoId (projeto interno EXISTENTE — via listar_projetos) " +
  "OU novo (projeto NOVO: nomeCurto, nome… — com clienteId vira caso do cliente; sem, projeto interno)."

export const modelosTools = [
  defineTool({
    name: "listar_modelos",
    kind: "readonly",
    description:
      "Lista os modelos de tarefas (processos repetíveis do escritório): papéis, passos, 'dias antes do prazo do grupo', prazos fatais e ligações. " +
      "Use antes de aplicar_modelo.",
    schema: z.object({}),
    run: async () => ({ modelos: await getModelos() }),
  }),
  defineTool({
    name: "aplicar_modelo",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Aplica um modelo (id via listar_modelos) a um projeto: gera, para cada GRUPO, uma tarefa por passo do modelo, com prazo = prazo do " +
      "grupo − dias antes, e as ligações do modelo. Informe os grupos (nome + prazo) ou só a quantidade (nomes e prazos padrão), e o " +
      "responsável de cada papel (papelId → id da pessoa; omitido = padrão do modelo). " +
      alvoDescricao,
    schema: z.object({
      modeloId: idReq,
      casoId: idOpt,
      projetoId: idOpt,
      novo: projetoNovo.optional(),
      grupos: z.array(z.object({ nome: z.string().min(1).max(160), prazo: dataISO })).max(12).optional(),
      quantidadeGrupos: z.number().int().min(1).max(12).optional(),
      responsaveis: z.record(z.string(), idOpt).optional().describe("{ papelId: idDaPessoa }"),
    }),
    resumo: (i) => `Aplicar modelo ${rotuloAlvo(i)}`,
    montarConfirmacao: async (_ctx, i) => {
      const m = (await getModelos()).find((x) => x.id === i.modeloId)
      const n = i.grupos?.length ?? i.quantidadeGrupos ?? 1
      return {
        resumo: `Aplicar o modelo ${m?.nome ?? `#${i.modeloId}`}`,
        detalhes: [
          ...(await detalhesAlvo(i)),
          { label: "Grupos", valor: String(n) },
          { label: "Tarefas", valor: String(n * (m?.passos.length ?? 0)) },
        ],
      }
    },
    run: async (ctx, i) => {
      const alvo = alvoDe(i)
      if ("erro" in alvo) return alvo
      const m = (await getModelos()).find((x) => x.id === i.modeloId)
      if (!m) return { erro: "Modelo não encontrado" }
      let inicio = 0
      if (i.casoId || i.projetoId) {
        const where = i.casoId ? { casoId: i.casoId } : { projetoId: i.projetoId }
        const gs = await prisma.tarefa.findMany({ where: { ...where, grupo: { not: null } }, select: { grupo: true }, distinct: ["grupo"] })
        inicio = gs.length
      }
      const grupos = i.grupos?.length ? i.grupos : gruposPadrao(m, i.quantidadeGrupos ?? 1, hojeSP(), inicio)
      return usarModelo(i.modeloId, { ...alvo, grupos, responsaveis: i.responsaveis }, await resolverAtor(ctx.user.email))
    },
  }),
  defineTool({
    name: "criar_estrutura_projeto",
    kind: "mutation",
    roles: ROLES_PROJETO_ESCRITA,
    description:
      "Cria TODAS as tarefas de um projeto (e as ligações entre elas) numa ÚNICA chamada — use SEMPRE que o pedido for 'crie um caso/projeto com as tarefas …' " +
      "ou 'monte as tarefas do caso/projeto X'. Cada tarefa: título, grupo (opcional, ex.: 'Protocolo 01'), responsavelId e prazo quando souber (prazo omitido = " +
      "sexta desta semana), prazoFatal, e depoisDe = índices (0-based) de tarefas ANTERIORES desta mesma lista que precisam terminar antes. " +
      alvoDescricao,
    schema: z.object({
      casoId: idOpt,
      projetoId: idOpt,
      novo: projetoNovo.optional(),
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
    resumo: (i) => `Criar ${i.tarefas.length} tarefas ${rotuloAlvo(i)}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: i.novo
        ? `Criar o ${i.novo.clienteId ? "caso" : "projeto"} ${i.novo.nomeCurto} com ${i.tarefas.length} tarefas`
        : `Criar ${i.tarefas.length} tarefas no ${i.casoId ? "caso" : "projeto"}`,
      detalhes: [
        ...(await detalhesAlvo(i)),
        { label: "Tarefas", valor: String(i.tarefas.length) },
        { label: "Ligações", valor: String(i.tarefas.reduce((n, t) => n + (t.depoisDe?.length ?? 0), 0)) },
      ],
    }),
    run: async (ctx, i) => {
      const alvo = alvoDe(i)
      if ("erro" in alvo) return alvo
      return montarEstruturaProjeto(alvo, i.tarefas, await resolverAtor(ctx.user.email))
    },
  }),
]
