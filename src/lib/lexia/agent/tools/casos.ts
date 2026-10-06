// Casos tools — list/detalhe/tarefas do caso (readonly) + criar/editar/excluir
// (confirmation-gated). Sempre disponíveis (independem do módulo Processos). Caso
// ≠ processo: nº CNJ, tribunal e vara são do PROCESSO (tools/processos.ts). O caso
// é também o "projeto" do quadro de Tarefas (nome curto, prazo final, descrição).
import { z } from "zod"
import { createCaso, deleteCaso, updateCaso } from "@/lib/casos/mutations"
import { getCasoDetail } from "@/lib/casos/queries"
import { getCasos } from "@/lib/finance/queries"
import { prisma } from "@/lib/db"
import { podeAcessarCaso, resolveUserId, veTudo } from "@/lib/processos/rbac"
import { getTarefas } from "@/lib/tarefas/queries"
import { hojeSP, indexar, motivosRisco, vencida } from "@/lib/tarefas/regras"
import { statusLabel } from "@/lib/tarefas/types"
import { idOpt, idReq } from "@/lib/validation"
import { verFinanceiro } from "@/lib/users/types"
import type { CasoDetail } from "@/lib/casos/types"
import { dataBr, diffRow, nomeCaso, nomeCliente, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"
import { cap, limite } from "./shared"

/** Remove o financeiro/rateio do detalhe de caso para a "Equipe". */
function semFinanceiroCaso(d: CasoDetail) {
  return { ...d, financeiro: undefined, responsaveis: [], financeiroOculto: true }
}

async function nomeContrato(id: number): Promise<string> {
  const c = await prisma.contrato.findUnique({ where: { id }, select: { titulo: true, dataFechamento: true } })
  if (!c) return `Contrato #${id}`
  return c.titulo ?? `Contrato de ${c.dataFechamento.toISOString().slice(0, 10).split("-").reverse().join("/")}`
}

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")
// Etiqueta do caso no quadro de Tarefas
const camposQuadro = {
  nomeCurto: z.string().max(24).optional().describe("Nome curto que aparece nos cartões do quadro (ex.: 'Alfa')"),
  prazo: dataISO.optional().describe("Prazo final do trabalho (opcional)"),
  descricao: z.string().max(4000).optional(),
}

export const casosTools = [
  defineTool({
    name: "listar_casos",
    kind: "readonly",
    description:
      "Lista os casos do escritório (com responsáveis/rateio entre sócios e soma de honorários). " +
      "Use para 'casos sem honorário', 'casos do sócio X'. Para um caso específico pelo nome, prefira buscar.",
    schema: z.object({ limite }),
    run: async (_ctx, { limite: l }) => cap(await getCasos(), l),
  }),
  defineTool({
    name: "detalhe_caso",
    kind: "readonly",
    description:
      "Detalhe completo de um caso por id: cliente, contrato, processos vinculados, honorários/lançamentos, rateio entre sócios, tarefas, eventos e documentos. Obtenha o id via buscar.",
    schema: z.object({ id: idReq.describe("Id do caso") }),
    run: async (ctx, { id }) => {
      const d = await getCasoDetail(id)
      if (!d) return { erro: "Caso não encontrado" }
      return verFinanceiro(ctx.user.role) ? d : semFinanceiroCaso(d)
    },
  }),
  defineTool({
    name: "tarefas_do_caso",
    kind: "readonly",
    description:
      "As tarefas de um caso no quadro (status, prazo, prazo fatal, vencida, responsável, grupo, anteriores, em risco) e os grupos. " +
      "Use antes de editar/ligar tarefas de um caso ou para 'como está o caso X?'.",
    schema: z.object({ id: idReq.describe("Id do caso (via buscar/listar_casos)") }),
    run: async (ctx, { id }) => {
      if (!(await podeAcessarCaso(ctx.user, id))) return { erro: "Caso não encontrado" }
      const [c, tarefas] = await Promise.all([
        prisma.caso.findFirst({ where: { id, excluidoEm: null }, select: { id: true, titulo: true, nomeCurto: true, prazo: true, descricao: true } }),
        getTarefas({ casoId: id }),
      ])
      if (!c) return { erro: "Caso não encontrado" }
      const hoje = hojeSP()
      const map = indexar(tarefas)
      return {
        id: c.id,
        titulo: c.titulo,
        nomeCurto: c.nomeCurto,
        prazo: c.prazo?.toISOString().slice(0, 10) ?? null,
        descricao: c.descricao,
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
    name: "criar_caso",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Cria um caso (matéria do cliente). Informe um título. Opcional: tipo (litigio/consultivo), área, clientePrincipalId " +
      "(via buscar), contratoId (contrato do MESMO cliente — listar_contratos) e responsavelId. Processos judiciais do caso " +
      "se cadastram depois com criar_processo.",
    schema: z.object({
      titulo: z.string().min(2).max(200).describe("Título do caso, ex.: 'Cobrança — Cliente X'"),
      tipo: z.enum(["litigio", "consultivo"]).optional(),
      area: z.string().max(60).optional().describe("Ex.: Cível, Trabalhista, Tributário"),
      clientePrincipalId: idOpt.describe("Cliente principal (id via buscar)"),
      contratoId: idOpt.describe("Contrato do mesmo cliente (id via listar_contratos)"),
      responsavelId: idOpt.describe("Advogado responsável (id)"),
      ...camposQuadro,
    }),
    resumo: (i) => `Criar caso: ${i.titulo}`,
    montarConfirmacao: async (_ctx, i) => {
      const det = [{ label: "Título", valor: i.titulo }]
      if (i.tipo) det.push({ label: "Tipo", valor: i.tipo === "litigio" ? "Litígio" : "Consultivo" })
      if (i.area) det.push({ label: "Área", valor: i.area })
      if (i.clientePrincipalId) det.push({ label: "Cliente", valor: await nomeCliente(i.clientePrincipalId) })
      if (i.contratoId) det.push({ label: "Contrato", valor: await nomeContrato(i.contratoId) })
      if (i.responsavelId) det.push({ label: "Responsável", valor: await nomeUsuario(i.responsavelId) })
      if (i.nomeCurto) det.push({ label: "Nome curto", valor: i.nomeCurto })
      if (i.prazo) det.push({ label: "Prazo final", valor: dataBr(i.prazo) })
      return { resumo: `Criar caso: ${i.titulo}`, detalhes: det }
    },
    run: async (ctx, i) =>
      createCaso({
        titulo: i.titulo,
        tipo: i.tipo,
        area: i.area,
        clientePrincipalId: i.clientePrincipalId ?? undefined,
        contratoId: i.contratoId ?? undefined,
        nomeCurto: i.nomeCurto,
        prazo: i.prazo,
        descricao: i.descricao,
        // advogado sem responsável definido vira o responsável (senão perde o acesso ao caso)
        responsavelUserId:
          i.responsavelId ?? (veTudo(ctx.user.role) ? undefined : ((await resolveUserId(ctx.user.email)) ?? undefined)),
      }),
  }),
  defineTool({
    name: "editar_caso",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Edita um caso (id via buscar). Envie só o que muda: titulo, tipo, status (Ativo/Suspenso/Arquivado), área, " +
      "clientePrincipalId, contratoId (contrato do MESMO cliente; semContrato=true solta o caso do contrato), responsavelId " +
      "e a etiqueta no quadro de Tarefas (nomeCurto, prazo final, descricao). Arquivar = status 'Arquivado'.",
    schema: z.object({
      id: idReq,
      titulo: z.string().min(2).max(200).optional(),
      tipo: z.enum(["litigio", "consultivo"]).optional(),
      status: z.string().max(30).optional(),
      area: z.string().max(60).optional(),
      clientePrincipalId: idOpt,
      contratoId: idOpt,
      semContrato: z.boolean().optional().describe("true = desvincula o caso do contrato atual"),
      responsavelId: idOpt,
      ...camposQuadro,
    }),
    resumo: (i) => `Editar caso #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const antes = await getCasoDetail(i.id)
      const det = [
        { label: "Caso", valor: await nomeCaso(i.id) },
        diffRow("Título", i.titulo, antes?.titulo),
        i.tipo ? diffRow("Tipo", i.tipo === "litigio" ? "Litígio" : "Consultivo", antes?.tipo === "litigio" ? "Litígio" : "Consultivo") : null,
        diffRow("Status", i.status, antes?.status ?? undefined),
        diffRow("Área", i.area, antes?.area ?? undefined),
        i.clientePrincipalId ? diffRow("Cliente", await nomeCliente(i.clientePrincipalId), antes?.cliente ?? undefined) : null,
        i.semContrato
          ? diffRow("Contrato", "— sem contrato —", antes?.contrato ? (antes.contrato.titulo ?? "contrato atual") : undefined)
          : i.contratoId
            ? diffRow("Contrato", await nomeContrato(i.contratoId), antes?.contrato?.titulo ?? undefined)
            : null,
        i.responsavelId ? diffRow("Responsável", await nomeUsuario(i.responsavelId), antes?.responsavelUser ?? undefined) : null,
        diffRow("Nome curto", i.nomeCurto, antes?.nomeCurto ?? undefined),
        i.prazo ? diffRow("Prazo final", dataBr(i.prazo), antes?.prazo ? dataBr(antes.prazo) : undefined) : null,
        i.descricao !== undefined ? { label: "Descrição", valor: i.descricao || "— sem descrição —" } : null,
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: "Editar caso", detalhes: det }
    },
    run: async (_ctx, i) =>
      updateCaso(i.id, {
        titulo: i.titulo,
        tipo: i.tipo,
        status: i.status,
        area: i.area,
        clientePrincipalId: i.clientePrincipalId,
        contratoId: i.semContrato ? null : i.contratoId,
        responsavelUserId: i.responsavelId,
        nomeCurto: i.nomeCurto,
        prazo: i.prazo,
        descricao: i.descricao,
      }),
  }),
  defineTool({
    name: "excluir_caso",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Exclui (arquiva) um caso. Arquiva junto os processos dele (com prazos/andamentos pendentes) e cancela os eventos; " +
      "os lançamentos financeiros NÃO são apagados. Id via buscar/listar_casos.",
    schema: z.object({ id: idReq.describe("Id do caso") }),
    resumo: (i) => `Excluir caso #${i.id}`,
    montarConfirmacao: async (_ctx, i) => ({ resumo: "Excluir caso", detalhes: [{ label: "Caso", valor: await nomeCaso(i.id) }] }),
    run: async (_ctx, i) => deleteCaso(i.id),
  }),
]
