// Modelos de tarefas + montagem de caso no quadro (o CASO é o "projeto" do quadro
// de Tarefas). Leitura aberta; aplicar modelo / montar estrutura só para
// sócio/advogado (admin passa). `criar_estrutura_caso` cria (ou completa) um caso
// com todas as tarefas + ligações numa única chamada (economia de tokens).
import { z } from "zod"
import { prisma } from "@/lib/db"
import { montarEstruturaCaso, usarModelo, type AlvoCaso } from "@/lib/modelos/mutations"
import { gruposPadrao } from "@/lib/modelos/modelo"
import { ROLES_CASO_ESCRITA } from "@/lib/modelos/types"
import { getModelos } from "@/lib/tarefas/queries"
import { hojeSP } from "@/lib/tarefas/regras"
import { resolverAtor } from "@/lib/tarefas/mutations"
import { idOpt, idReq } from "@/lib/validation"
import { dataBr, nomeArea, nomeCliente, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")

/** Caso NOVO criado junto (a etiqueta do quadro; o cadastro completo fica em /casos). */
const casoNovo = z.object({
  nomeCurto: z.string().min(1).max(24).describe("Nome curto (aparece nos cartões com a cor), ex.: 'Alfa'"),
  nome: z.string().min(2).max(400).describe("Título do caso, ex.: 'Integralização Holding Alfa'"),
  clienteId: idOpt.describe("Cliente (id via buscar) — todas as tarefas herdam esse cliente"),
  area: z.string().max(60).optional().describe("Chave da área do direito (ex.: 'soc', 'trab')"),
  responsavelId: idOpt.describe("Responsável (id via listar_tarefas → pessoas)"),
  prazo: dataISO.optional().describe("Prazo final (opcional)"),
  descricao: z.string().max(4000).optional(),
})

async function detalhesAlvo(i: { caso?: z.infer<typeof casoNovo>; casoId?: number | null }) {
  if (i.casoId) {
    const c = await prisma.caso.findUnique({ where: { id: i.casoId }, select: { titulo: true, nomeCurto: true } })
    return [{ label: "Caso", valor: c ? (c.nomeCurto ? `${c.nomeCurto} — ${c.titulo}` : c.titulo) : `#${i.casoId}` }]
  }
  const n = i.caso
  if (!n) return []
  return [
    { label: "Novo caso", valor: `${n.nomeCurto} — ${n.nome}` },
    n.clienteId ? { label: "Cliente", valor: await nomeCliente(n.clienteId) } : null,
    n.area ? { label: "Área", valor: await nomeArea(n.area) } : null,
    n.responsavelId ? { label: "Responsável", valor: await nomeUsuario(n.responsavelId) } : null,
    n.prazo ? { label: "Prazo final", valor: dataBr(n.prazo) } : null,
  ].filter((d): d is NonNullable<typeof d> => d != null)
}

function alvoDe(i: { caso?: z.infer<typeof casoNovo>; casoId?: number | null }): AlvoCaso | { erro: string } {
  if (i.casoId && i.caso) return { erro: "Informe casoId (caso existente) OU caso (caso novo), não os dois" }
  if (i.casoId) return { casoId: i.casoId }
  if (i.caso) return { caso: i.caso }
  return { erro: "Informe casoId (caso existente) ou caso (caso novo)" }
}

const alvoDescricao =
  "Alvo: casoId (caso EXISTENTE — via listar_casos/buscar) OU caso (caso NOVO: nomeCurto, nome, cliente…). Nunca os dois."

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
    roles: ROLES_CASO_ESCRITA,
    description:
      "Aplica um modelo (id via listar_modelos) a um caso: gera, para cada GRUPO, uma tarefa por passo do modelo, com prazo = prazo do " +
      "grupo − dias antes, e as ligações do modelo. Informe os grupos (nome + prazo) ou só a quantidade (nomes e prazos padrão), e o " +
      "responsável de cada papel (papelId → id da pessoa; omitido = padrão do modelo). " +
      alvoDescricao,
    schema: z.object({
      modeloId: idReq,
      casoId: idOpt,
      caso: casoNovo.optional(),
      grupos: z.array(z.object({ nome: z.string().min(1).max(160), prazo: dataISO })).max(12).optional(),
      quantidadeGrupos: z.number().int().min(1).max(12).optional(),
      responsaveis: z.record(z.string(), idOpt).optional().describe("{ papelId: idDaPessoa }"),
    }),
    resumo: (i) => `Aplicar modelo ${i.caso ? `no novo caso ${i.caso.nomeCurto}` : `no caso #${i.casoId}`}`,
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
      if (alvo.casoId) {
        const gs = await prisma.tarefa.findMany({ where: { casoId: alvo.casoId, grupo: { not: null } }, select: { grupo: true }, distinct: ["grupo"] })
        inicio = gs.length
      }
      const grupos = i.grupos?.length ? i.grupos : gruposPadrao(m, i.quantidadeGrupos ?? 1, hojeSP(), inicio)
      return usarModelo(i.modeloId, { ...alvo, grupos, responsaveis: i.responsaveis }, await resolverAtor(ctx.user.email))
    },
  }),
  defineTool({
    name: "criar_estrutura_caso",
    kind: "mutation",
    roles: ROLES_CASO_ESCRITA,
    description:
      "Cria TODAS as tarefas de um caso (e as ligações entre elas) numa ÚNICA chamada — use SEMPRE que o pedido for 'crie um caso/projeto com as tarefas …' " +
      "ou 'monte as tarefas do caso X'. Cada tarefa: título, grupo (opcional, ex.: 'Protocolo 01'), responsavelId e prazo quando souber (prazo omitido = " +
      "sexta desta semana), prazoFatal, e depoisDe = índices (0-based) de tarefas ANTERIORES desta mesma lista que precisam terminar antes. " +
      alvoDescricao,
    schema: z.object({
      casoId: idOpt,
      caso: casoNovo.optional(),
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
    resumo: (i) => `Criar ${i.tarefas.length} tarefas ${i.caso ? `no novo caso ${i.caso.nomeCurto}` : `no caso #${i.casoId}`}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: i.caso ? `Criar o caso ${i.caso.nomeCurto} com ${i.tarefas.length} tarefas` : `Criar ${i.tarefas.length} tarefas no caso`,
      detalhes: [
        ...(await detalhesAlvo(i)),
        { label: "Tarefas", valor: String(i.tarefas.length) },
        { label: "Ligações", valor: String(i.tarefas.reduce((n, t) => n + (t.depoisDe?.length ?? 0), 0)) },
      ],
    }),
    run: async (ctx, i) => {
      const alvo = alvoDe(i)
      if ("erro" in alvo) return alvo
      return montarEstruturaCaso(alvo, i.tarefas, await resolverAtor(ctx.user.email))
    },
  }),
]
