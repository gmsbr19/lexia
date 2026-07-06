// Casos tools — list/detalhe (readonly) + criar/editar/excluir (confirmation-gated).
import { z } from "zod"
import { createCaso, deleteCaso, updateCaso } from "@/lib/casos/mutations"
import { getCasoDetail } from "@/lib/casos/queries"
import { getCasos } from "@/lib/finance/queries"
import { idOpt, idReq } from "@/lib/validation"
import { verFinanceiro } from "@/lib/users/types"
import type { CasoDetail } from "@/lib/casos/types"
import { diffRow, nomeCaso, nomeCliente, nomeUsuario } from "../confirmar"
import { defineTool } from "../types"
import { cap, limite } from "./shared"

/** Remove o financeiro/rateio/valor da causa do detalhe de caso para a "Equipe". */
function semFinanceiroCaso(d: CasoDetail) {
  return { ...d, financeiro: undefined, responsaveis: [], valorCausaCents: null, financeiroOculto: true }
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
      "Detalhe completo de um caso por id: processo, financeiro, rateio entre sócios, tarefas e eventos. Obtenha o id via buscar.",
    schema: z.object({ id: idReq.describe("Id do caso") }),
    run: async (ctx, { id }) => {
      const d = await getCasoDetail(id)
      if (!d) return { erro: "Caso não encontrado" }
      return verFinanceiro(ctx.user.role) ? d : semFinanceiroCaso(d)
    },
  }),
  defineTool({
    name: "criar_caso",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Cria um caso (matéria do escritório). Informe um título. Opcional: tipo (litigio/consultivo), área, clientePrincipalId " +
      "(via buscar) e responsavelId.",
    schema: z.object({
      titulo: z.string().min(2).max(200).describe("Título do caso, ex.: 'Cobrança — Cliente X'"),
      tipo: z.enum(["litigio", "consultivo"]).optional(),
      area: z.string().max(60).optional().describe("Ex.: Cível, Trabalhista, Tributário"),
      clientePrincipalId: idOpt.describe("Cliente principal (id via buscar)"),
      responsavelId: idOpt.describe("Sócio responsável (id)"),
    }),
    resumo: (i) => `Criar caso: ${i.titulo}`,
    montarConfirmacao: async (_ctx, i) => {
      const det = [{ label: "Título", valor: i.titulo }]
      if (i.tipo) det.push({ label: "Tipo", valor: i.tipo === "litigio" ? "Litígio" : "Consultivo" })
      if (i.area) det.push({ label: "Área", valor: i.area })
      if (i.clientePrincipalId) det.push({ label: "Cliente", valor: await nomeCliente(i.clientePrincipalId) })
      if (i.responsavelId) det.push({ label: "Responsável", valor: await nomeUsuario(i.responsavelId) })
      return { resumo: `Criar caso: ${i.titulo}`, detalhes: det }
    },
    run: async (_ctx, i) =>
      createCaso({
        titulo: i.titulo,
        tipo: i.tipo,
        area: i.area,
        clientePrincipalId: i.clientePrincipalId ?? undefined,
        responsavelUserId: i.responsavelId ?? undefined,
      }),
  }),
  defineTool({
    name: "editar_caso",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description: "Edita um caso (id via buscar). Envie só o que muda: titulo, status, área, clientePrincipalId, responsavelId.",
    schema: z.object({
      id: idReq,
      titulo: z.string().min(2).max(200).optional(),
      status: z.string().max(30).optional(),
      area: z.string().max(60).optional(),
      clientePrincipalId: idOpt,
      responsavelId: idOpt,
    }),
    resumo: (i) => `Editar caso #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const antes = await getCasoDetail(i.id)
      const det = [
        { label: "Caso", valor: await nomeCaso(i.id) },
        diffRow("Título", i.titulo, antes?.titulo),
        diffRow("Status", i.status, antes?.status ?? undefined),
        diffRow("Área", i.area, antes?.area ?? undefined),
        i.clientePrincipalId ? diffRow("Cliente", await nomeCliente(i.clientePrincipalId), antes?.cliente ?? undefined) : null,
        i.responsavelId ? diffRow("Responsável", await nomeUsuario(i.responsavelId), antes?.responsavelUser ?? undefined) : null,
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: "Editar caso", detalhes: det }
    },
    run: async (_ctx, i) =>
      updateCaso(i.id, {
        titulo: i.titulo,
        status: i.status,
        area: i.area,
        clientePrincipalId: i.clientePrincipalId,
        responsavelUserId: i.responsavelId,
      }),
  }),
  defineTool({
    name: "excluir_caso",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description: "Exclui (arquiva) um caso. Id via buscar/listar_casos.",
    schema: z.object({ id: idReq.describe("Id do caso") }),
    resumo: (i) => `Excluir caso #${i.id}`,
    montarConfirmacao: async (_ctx, i) => ({ resumo: "Excluir caso", detalhes: [{ label: "Caso", valor: await nomeCaso(i.id) }] }),
    run: async (_ctx, i) => deleteCaso(i.id),
  }),
]
