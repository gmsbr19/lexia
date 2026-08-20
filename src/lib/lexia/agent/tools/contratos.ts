// Contrato tools — o contrato é o documento assinado que reúne N casos (1 contrato
// → vários casos; um caso pode não ter contrato). CRUD + relação (vincular/desvincular
// casos). Financeiro do contrato é sempre DERIVADO (Σ fee-lançamentos dos casos).
import { z } from "zod"
import {
  getCasosDoCliente,
  getContratoDetail,
  getContratos,
  getContratosPorCliente,
} from "@/lib/finance/queries"
import { atualizarContrato, criarContrato, excluirContrato } from "@/lib/finance/mutations"
import { contratoCreateSchema, contratoPatchSchema } from "@/lib/finance/schemas"
import { prisma } from "@/lib/db"
import { idOpt, idReq } from "@/lib/validation"
import { ROLES_FINANCEIRO } from "@/lib/users/types"
import { dataBr, diffRow, nomeArea, nomeCliente } from "../confirmar"
import { defineTool } from "../types"
import { brl, cap, limite } from "./shared"

const editarContratoSchema = contratoPatchSchema.extend({
  id: idReq.describe("Id do contrato a editar (via listar_contratos ou detalhe_contrato)"),
})
type EditarContratoIn = z.infer<typeof editarContratoSchema>

/** Títulos de uma lista de casos por id, para os cartões de confirmação. */
async function titulosCasos(ids: number[]): Promise<string> {
  if (!ids.length) return "—"
  const casos = await prisma.caso.findMany({ where: { id: { in: ids } }, select: { titulo: true } })
  return casos.map((c) => c.titulo).join("; ") || `${ids.length} caso(s)`
}

export const contratoTools = [
  // ── leitura ──
  defineTool({
    name: "listar_contratos",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description:
      "Lista os contratos fechados (o documento assinado que reúne os casos de um cliente), com valor contratado/recebido " +
      "derivado dos honorários dos casos vinculados. Passe clienteId para filtrar por um cliente. " +
      "Use para 'quais contratos temos?', 'contratos do cliente X'.",
    schema: z.object({ clienteId: idOpt.describe("Filtrar pelos contratos de um cliente (id via buscar/detalhe_cliente)"), limite }),
    run: async (_ctx, { clienteId, limite: l }) =>
      cap(clienteId ? await getContratosPorCliente(clienteId) : await getContratos(), l),
  }),
  defineTool({
    name: "detalhe_contrato",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description:
      "Detalhe de um contrato por id: os casos vinculados (cada um com seus honorários), os documentos ligados e os totais " +
      "contratado/recebido. Obtenha o id via listar_contratos ou buscar.",
    schema: z.object({ id: idReq.describe("Id do contrato") }),
    run: async (_ctx, { id }) => (await getContratoDetail(id)) ?? { erro: "Contrato não encontrado" },
  }),
  defineTool({
    name: "listar_casos_do_cliente",
    kind: "readonly",
    roles: ROLES_FINANCEIRO,
    description:
      "Lista os casos de um cliente com o status de vínculo a contrato (campo 'livre' = sem contrato algum). " +
      "Use ANTES de criar/editar um contrato para saber quais casos vincular — só se vinculam casos do MESMO cliente.",
    schema: z.object({ clienteId: idReq.describe("Id do cliente (via buscar/detalhe_cliente)"), limite }),
    run: async (_ctx, { clienteId, limite: l }) => cap(await getCasosDoCliente(clienteId), l),
  }),

  // ── mutações (confirmação-gated) ──
  defineTool({
    name: "criar_contrato",
    kind: "mutation",
    roles: ROLES_FINANCEIRO,
    description:
      "Cria um contrato (o documento assinado) para um cliente, opcionalmente já vinculando casos. " +
      "Aceita valorTotalCents (valor total do contrato em CENTAVOS — métrica comercial) e area (chave da área do direito). " +
      "Vincular casos MOVE cada caso de qualquer contrato anterior; só se vinculam casos do mesmo cliente. " +
      "Chame apenas quando o usuário pedir para registrar/fechar um contrato.",
    schema: contratoCreateSchema,
    resumo: (i) => {
      const v = i as z.infer<typeof contratoCreateSchema>
      const n = v.casoIds?.length ?? 0
      return `Criar contrato${v.titulo ? `: ${v.titulo}` : ""}${n ? ` (${n} caso(s))` : ""}`
    },
    montarConfirmacao: async (_ctx, input) => {
      const v = input as z.infer<typeof contratoCreateSchema>
      const det: { label: string; valor: string }[] = [{ label: "Cliente", valor: await nomeCliente(v.clienteId) }]
      if (v.titulo) det.push({ label: "Título", valor: v.titulo })
      det.push({ label: "Data de fechamento", valor: dataBr(v.dataFechamento) })
      if (v.valorTotalCents != null) det.push({ label: "Valor total", valor: brl(v.valorTotalCents) })
      if (v.area) det.push({ label: "Área", valor: await nomeArea(v.area) })
      if (v.observacoes) det.push({ label: "Observações", valor: v.observacoes })
      const ids = v.casoIds ?? []
      if (ids.length) det.push({ label: "Casos vinculados", valor: await titulosCasos(ids) })
      return { resumo: `Criar contrato${v.titulo ? `: ${v.titulo}` : ""}`, detalhes: det }
    },
    run: async (_ctx, input) => criarContrato(input as z.infer<typeof contratoCreateSchema>),
  }),
  defineTool({
    name: "editar_contrato",
    kind: "mutation",
    roles: ROLES_FINANCEIRO,
    description:
      "Edita um contrato pelo id: título, data de fechamento, valorTotalCents (centavos), area (chave), observações, cliente e/ou os casos vinculados. " +
      "Use vincularCasoIds para LIGAR casos (move de qualquer contrato anterior; só casos do mesmo cliente) e " +
      "desvincularCasoIds para SOLTAR casos deste contrato. Só os campos informados mudam. " +
      "Obtenha o id via listar_contratos e os casos via listar_casos_do_cliente.",
    schema: editarContratoSchema,
    resumo: (i) => `Editar contrato #${(i as EditarContratoIn).id}`,
    montarConfirmacao: async (_ctx, input) => {
      const v = input as EditarContratoIn
      const c = await prisma.contrato.findUnique({
        where: { id: v.id },
        select: { titulo: true, dataFechamento: true, valorTotalCents: true, area: true, observacoes: true },
      })
      const det: { label: string; valor: string; valorAntigo?: string }[] = []
      const push = (row: { label: string; valor: string; valorAntigo?: string } | null) => { if (row) det.push(row) }
      if (v.titulo !== undefined) push(diffRow("Título", v.titulo ?? "—", c?.titulo))
      if (v.dataFechamento !== undefined)
        push(diffRow("Data de fechamento", dataBr(v.dataFechamento), c?.dataFechamento ? dataBr(c.dataFechamento.toISOString()) : null))
      if (v.valorTotalCents !== undefined)
        push(diffRow("Valor total", v.valorTotalCents != null ? brl(v.valorTotalCents) : "—", c?.valorTotalCents != null ? brl(c.valorTotalCents) : null))
      if (v.area !== undefined) push(diffRow("Área", v.area ? await nomeArea(v.area) : "—", c?.area ? await nomeArea(c.area) : null))
      if (v.observacoes !== undefined) push(diffRow("Observações", v.observacoes ?? "—", c?.observacoes))
      if (v.clienteId !== undefined) det.push({ label: "Cliente", valor: await nomeCliente(v.clienteId) })
      const vinc = v.vincularCasoIds ?? []
      const desv = v.desvincularCasoIds ?? []
      if (vinc.length) det.push({ label: "Vincular casos", valor: await titulosCasos(vinc) })
      if (desv.length) det.push({ label: "Desvincular casos", valor: await titulosCasos(desv) })
      return { resumo: `Editar contrato${c?.titulo ? `: ${c.titulo}` : ` #${v.id}`}`, detalhes: det }
    },
    run: async (_ctx, input) => {
      const { id, ...patch } = input as EditarContratoIn
      return atualizarContrato(id, patch)
    },
  }),
  defineTool({
    name: "excluir_contrato",
    kind: "mutation",
    roles: ["socio"],
    description:
      "Exclui (soft-delete) um contrato pelo id — sensível, só sócios/admin. Os casos e documentos vinculados NÃO são " +
      "apagados: apenas ficam sem contrato. Obtenha o id via listar_contratos.",
    schema: z.object({ id: idReq.describe("Id do contrato") }),
    resumo: (i) => `Excluir contrato #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const c = await prisma.contrato.findUnique({
        where: { id: i.id },
        select: { titulo: true, cliente: { select: { nome: true } }, _count: { select: { casos: true } } },
      })
      const det: { label: string; valor: string }[] = [
        { label: "Contrato", valor: c?.titulo ?? `#${i.id}` },
      ]
      if (c?.cliente?.nome) det.push({ label: "Cliente", valor: c.cliente.nome })
      det.push({ label: "Casos vinculados", valor: `${c?._count.casos ?? 0} (ficarão sem contrato, não são apagados)` })
      return { resumo: `Excluir contrato: ${c?.titulo ?? `#${i.id}`}`, detalhes: det }
    },
    run: async (_ctx, i) => excluirContrato(i.id),
  }),
]
