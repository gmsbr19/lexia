// Informações FIXADAS — know-how com dono natural (cliente, caso ou projeto
// interno) que aparece sozinho em todas as tarefas dele ("Saiba antes" no quadro).
// Leitura aberta; fixar = qualquer papel (mutação confirmation-gated pelo loop).
import { z } from "zod"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { ROTULO_ANCORA, type Ancora } from "@/lib/informacoes/core"
import { criarInformacao } from "@/lib/informacoes/mutations"
import { getInformacoes } from "@/lib/informacoes/queries"
import { resolverAtor } from "@/lib/tarefas/mutations"
import { WHERE_INTERNO_VIVO } from "@/lib/tarefas/queries"
import { idOpt } from "@/lib/validation"
import { nomeCaso, nomeCliente } from "../confirmar"
import { defineTool } from "../types"

const iso = (s: string | null) => (s ? s.slice(0, 10) : null)

/** Âncoras de uma tarefa: o projeto dela (caso vivo ou interno vivo) e o cliente efetivo. */
async function ancorasDaTarefaId(id: number): Promise<Ancora[]> {
  const t = await prisma.tarefa.findUnique({
    where: { id },
    select: {
      casoId: true,
      projetoId: true,
      clienteId: true,
      caso: { select: { excluidoEm: true, clientePrincipalId: true } },
      projetoRef: { select: { excluidoEm: true, casoId: true } },
    },
  })
  if (!t) throw new UserError("Tarefa não encontrada")
  const out: Ancora[] = []
  const casoVivo = t.casoId != null && t.caso && !t.caso.excluidoEm
  if (casoVivo) out.push({ tipo: "caso", id: t.casoId! })
  else if (t.projetoId != null && t.projetoRef && !t.projetoRef.excluidoEm && t.projetoRef.casoId == null) {
    out.push({ tipo: "projeto", id: t.projetoId })
  }
  const cliente = (casoVivo ? t.caso!.clientePrincipalId : null) ?? t.clienteId
  if (cliente != null) out.push({ tipo: "cliente", id: cliente })
  return out
}

async function nomeProjeto(id: number): Promise<string> {
  const p = await prisma.projeto.findFirst({ where: { id, ...WHERE_INTERNO_VIVO }, select: { nomeCurto: true, nome: true } })
  return p ? p.nomeCurto.trim() || p.nome : `Projeto #${id}`
}

const nomeDaAncora = (a: Ancora) => (a.tipo === "cliente" ? nomeCliente(a.id) : a.tipo === "caso" ? nomeCaso(a.id) : nomeProjeto(a.id))

/** Exatamente um dono (cliente, caso ou projeto interno). */
function umaAncora(i: { clienteId?: number | null; casoId?: number | null; projetoId?: number | null }): Ancora {
  const opcoes: Ancora[] = [
    ...(i.casoId ? [{ tipo: "caso" as const, id: i.casoId }] : []),
    ...(i.projetoId ? [{ tipo: "projeto" as const, id: i.projetoId }] : []),
    ...(i.clienteId ? [{ tipo: "cliente" as const, id: i.clienteId }] : []),
  ]
  if (opcoes.length !== 1) throw new UserError("Informe exatamente um: clienteId, casoId ou projetoId")
  return opcoes[0]
}

export const informacoesTools = [
  defineTool({
    name: "informacoes_fixadas",
    kind: "readonly",
    description:
      "Lê as INFORMAÇÕES FIXADAS (know-how: 'só paga no dia 10', 'tal imóvel não precisa ser integralizado') de um cliente, caso ou " +
      "projeto interno — ou, com tarefaId, todas as que valem para a tarefa (as do projeto dela + as do cliente). Consulte antes de " +
      "executar, redigir ou cobrar algo ligado a eles. Informe um dos ids.",
    schema: z.object({
      tarefaId: idOpt.describe("Tarefa: traz as do projeto + do cliente dela"),
      clienteId: idOpt,
      casoId: idOpt,
      projetoId: idOpt.describe("Projeto INTERNO (listar_projetos)"),
    }),
    run: async (_ctx, i) => {
      const ancoras: Ancora[] = i.tarefaId
        ? await ancorasDaTarefaId(i.tarefaId)
        : [
            ...(i.casoId ? [{ tipo: "caso" as const, id: i.casoId }] : []),
            ...(i.projetoId ? [{ tipo: "projeto" as const, id: i.projetoId }] : []),
            ...(i.clienteId ? [{ tipo: "cliente" as const, id: i.clienteId }] : []),
          ]
      if (!ancoras.length) throw new UserError("Informe tarefaId, clienteId, casoId ou projetoId")
      const blocos = await Promise.all(
        ancoras.map(async (a) => ({
          sobre: `${ROTULO_ANCORA[a.tipo]}: ${await nomeDaAncora(a)}`,
          itens: await getInformacoes(a, { soFixadas: true }),
        })),
      )
      return {
        informacoes: blocos.flatMap((b) =>
          b.itens.map((r) => ({
            sobre: b.sobre,
            conteudo: r.conteudo,
            por: r.autor,
            atualizada: iso(r.editadaEm ?? r.criadaEm),
          })),
        ),
      }
    },
  }),
  defineTool({
    name: "fixar_informacao",
    kind: "mutation",
    description:
      "FIXA uma informação (know-how) no seu dono natural — passa a aparecer em TODAS as tarefas dele. Hábito/combinado do cliente " +
      "('só paga dia 10') → clienteId; particularidade do trabalho ('o imóvel X não precisa ser integralizado') → casoId, ou projetoId se for " +
      "projeto interno. Informe exatamente um. Uma informação por chamada; texto curto e direto.",
    schema: z.object({
      clienteId: idOpt,
      casoId: idOpt,
      projetoId: idOpt.describe("Projeto INTERNO (listar_projetos)"),
      conteudo: z.string().min(1).max(2000).describe("A informação, como deve aparecer nas tarefas"),
    }),
    resumo: () => "Fixar informação",
    montarConfirmacao: async (_ctx, i) => {
      const a = umaAncora(i)
      const nome = await nomeDaAncora(a)
      return {
        resumo: `Fixar informação — ${ROTULO_ANCORA[a.tipo]}: ${nome}`,
        detalhes: [
          { label: ROTULO_ANCORA[a.tipo], valor: nome },
          { label: "Informação", valor: i.conteudo },
        ],
      }
    },
    run: async (ctx, i) => {
      const r = await criarInformacao({ ancora: umaAncora(i), conteudo: i.conteudo }, await resolverAtor(ctx.user.email))
      return { fixada: true, acaoId: r.acaoId }
    },
  }),
]
