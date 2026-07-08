// Processos & Prazos tools — CRUD completo via chat (RBAC-scoped por ctx.user;
// mutations confirmation-gated, com cartão LEGÍVEL via montarConfirmacao e checagem
// de acesso por processo p/ evitar IDOR). Prazo é APOIO À DECISÃO — a confirmação
// é a conferência humana. NÃO importa rbac-assert (next-auth) — usa rbac.ts.
import { z } from "zod"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import type { ListQuery } from "@/lib/list"
import { createCaso } from "@/lib/casos/mutations"
import { associarProcesso } from "@/lib/processos/associacao"
import {
  addParteAoProcesso,
  confirmarPrazo,
  createPrazo,
  createProcesso,
  cumprirPrazo,
  deletePrazo,
  deleteProcesso,
  deletePublicacao,
  rejeitarPrazo,
  updatePrazo,
  updateProcesso,
  vincularPublicacao,
} from "@/lib/processos/mutations"
import { listMovimentosInbox, listPrazos, listProcessos, listPublicacoes, getProcessoDetail } from "@/lib/processos/queries"
import { podeAcessarProcesso } from "@/lib/processos/rbac"
import { idOpt, idReq } from "@/lib/validation"
import { verFinanceiro } from "@/lib/users/types"
import { brl, dataBr, diffRow, nomeCaso, nomeCliente, nomeUsuario, rotuloProcesso } from "../confirmar"
import { defineTool, type AgentCtx } from "../types"
import { limite } from "./shared"

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato YYYY-MM-DD")
const fp = (sort: string, order: "asc" | "desc" = "asc", n = 50): ListQuery => ({ page: 1, pageSize: n, sort, order, skip: 0, take: n })
const take = (l?: number): number => Math.min(Math.max(l ?? 20, 1), 50)
/** Garante acesso ao processo (escopo RBAC) — evita IDOR via chat. */
const negar = async (ctx: AgentCtx, processoId: number): Promise<void> => {
  if (!(await podeAcessarProcesso(ctx.user, processoId))) throw new UserError("Sem acesso a este processo")
}

export const processosTools = [
  defineTool({
    name: "listar_processos",
    kind: "readonly",
    description:
      "Lista os processos (contencioso) do escritório — número CNJ, classe, caso, tribunal, fase, status, prazos pendentes e " +
      "próxima data fatal. Use para 'meus processos', 'processos no TJSP', 'processos ativos'. Para um específico pelo nome de uma " +
      "parte/caso, prefira buscar.",
    schema: z.object({
      status: z.string().max(20).optional().describe("ativo | suspenso | arquivado | baixado"),
      tribunal: z.string().max(40).optional().describe("Sigla do tribunal, ex.: TJSP"),
      q: z.string().max(80).optional().describe("Busca por CNJ / caso / classe / assunto"),
      limite,
    }),
    run: async (ctx, { status, tribunal, q, limite: l }) => {
      const res = await listProcessos({ status, tribunal, q }, fp("dataDistribuicao", "desc"), ctx.user)
      return { total: res.total, itens: res.items.slice(0, take(l)) }
    },
  }),
  defineTool({
    name: "detalhe_processo",
    kind: "readonly",
    description:
      "Detalhe completo de um processo por id: partes, andamentos (timeline), prazos (com urgência), publicações, anotações e " +
      "financeiro. Obtenha o id via buscar ou listar_processos.",
    schema: z.object({ id: idReq.describe("Id do processo") }),
    run: async (ctx, { id }) => {
      const d = await getProcessoDetail(id, ctx.user)
      if (!d) return { erro: "Processo não encontrado ou sem acesso" }
      if (verFinanceiro(ctx.user.role)) return d
      return { ...d, financeiro: null, valorCausaCents: 0, financeiroOculto: true }
    },
  }),
  defineTool({
    name: "listar_prazos",
    kind: "readonly",
    description:
      "Lista os prazos processuais (urgência/semáforo, data fatal e interna, responsável). Use para 'prazos a vencer', " +
      "'prazos vencidos', 'o que vence esta semana'.",
    schema: z.object({
      status: z.string().max(20).optional().describe("pendente | cumprido | perdido | cancelado"),
      vencidos: z.boolean().optional().describe("Só prazos pendentes já vencidos"),
      ateISO: dataISO.optional().describe("Só prazos com data fatal até esta data (ex.: fim da semana)"),
      limite,
    }),
    run: async (ctx, { status, vencidos, ateISO, limite: l }) => {
      const res = await listPrazos({ status, vencidos, ateISO }, fp("dataFatal", "asc"), ctx.user)
      return { total: res.total, itens: res.items.slice(0, take(l)) }
    },
  }),
  defineTool({
    name: "listar_publicacoes",
    kind: "readonly",
    description: "Lista as publicações/intimações capturadas (fila de triagem). Use para 'publicações a triar', 'intimações novas'.",
    schema: z.object({
      statusTriagem: z.string().max(20).optional().describe("pendente | triada | descartada"),
      limite,
    }),
    run: async (ctx, { statusTriagem, limite: l }) => {
      const res = await listPublicacoes({ statusTriagem }, fp("createdAt", "desc"), ctx.user)
      return { total: res.total, itens: res.items.slice(0, take(l)) }
    },
  }),
  defineTool({
    name: "listar_movimentos_novos",
    kind: "readonly",
    description:
      "Lista os PROCESSOS com movimentos novos a revisar (capturados do tribunal via DataJud, ainda não triados) — quantos, " +
      "se há algo relevante e exemplos. Use para 'o que mudou nos meus processos?', 'há movimentos novos?', priorizar a revisão. " +
      "Para gerar um prazo a partir de um movimento, use criar_prazo no processo.",
    schema: z.object({ limite }),
    run: async (ctx, { limite: l }) => {
      const itens = await listMovimentosInbox(ctx.user)
      return { total: itens.length, itens: itens.slice(0, take(l)) }
    },
  }),

  // ── processo (criar / editar / excluir) ──
  defineTool({
    name: "criar_processo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Cria um processo. Vincule a um caso existente (casoId via buscar/detalhe_cliente) OU crie um caso novo informando casoTitulo. " +
      "Informe ao menos a classe ou o número CNJ. Campos opcionais: numeroCnj, classe, assunto, tribunal, comarca, vara, uf, instancia, " +
      "valorCausaCents (centavos), responsavelId.",
    schema: z
      .object({
        casoId: idOpt.describe("Caso existente (id)"),
        casoTitulo: z.string().max(200).optional().describe("Título de um NOVO caso (quando não houver casoId)"),
        numeroCnj: z.string().max(40).optional(),
        classe: z.string().max(200).optional(),
        assunto: z.string().max(300).optional(),
        tribunal: z.string().max(40).optional(),
        comarca: z.string().max(200).optional(),
        vara: z.string().max(200).optional(),
        uf: z.string().max(2).optional(),
        instancia: z.string().max(20).optional(),
        valorCausaCents: z.number().int().min(0).optional().describe("Valor da causa em CENTAVOS"),
        responsavelId: idOpt,
      })
      .refine((v) => !!v.casoId || !!v.casoTitulo?.trim(), { message: "informe casoId ou casoTitulo", path: ["casoId"] }),
    resumo: (i) => `Criar processo${i.classe ? `: ${i.classe}` : ""}`,
    montarConfirmacao: async (_ctx, i) => {
      const det = [{ label: "Caso", valor: i.casoId ? await nomeCaso(i.casoId) : `(novo) ${i.casoTitulo}` }]
      if (i.numeroCnj) det.push({ label: "Número CNJ", valor: i.numeroCnj })
      if (i.classe) det.push({ label: "Classe", valor: i.classe })
      if (i.tribunal) det.push({ label: "Tribunal", valor: i.tribunal })
      if (i.valorCausaCents != null) det.push({ label: "Valor da causa", valor: brl(i.valorCausaCents) })
      if (i.responsavelId) det.push({ label: "Responsável", valor: await nomeUsuario(i.responsavelId) })
      return { resumo: `Criar processo${i.classe ? `: ${i.classe}` : ""}`, detalhes: det }
    },
    run: async (_ctx, i) => {
      let casoId = i.casoId ?? 0
      if (!casoId && i.casoTitulo?.trim()) casoId = (await createCaso({ titulo: i.casoTitulo.trim() })).id
      if (!casoId) throw new UserError("Informe um caso (casoId) ou um título de novo caso (casoTitulo)")
      return createProcesso({
        casoId,
        numeroCnj: i.numeroCnj ?? null,
        classe: i.classe ?? null,
        assunto: i.assunto ?? null,
        tribunal: i.tribunal ?? null,
        comarca: i.comarca ?? null,
        vara: i.vara ?? null,
        uf: i.uf ?? null,
        instancia: i.instancia ?? null,
        valorCausaCents: i.valorCausaCents ?? 0,
        responsavelUserId: i.responsavelId ?? null,
      })
    },
  }),
  defineTool({
    name: "editar_processo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Edita um processo (id via buscar/listar_processos). Envie só o que muda: classe, assunto, tribunal, comarca, vara, uf, " +
      "instancia, status (ativo/suspenso/arquivado/baixado), faseAtual, valorCausaCents (centavos), responsavelId, numeroCnj.",
    schema: z.object({
      id: idReq,
      numeroCnj: z.string().max(40).optional(),
      classe: z.string().max(200).optional(),
      assunto: z.string().max(300).optional(),
      tribunal: z.string().max(40).optional(),
      comarca: z.string().max(200).optional(),
      vara: z.string().max(200).optional(),
      uf: z.string().max(2).optional(),
      instancia: z.string().max(20).optional(),
      status: z.enum(["ativo", "suspenso", "arquivado", "baixado"]).optional(),
      faseAtual: z.string().max(40).optional(),
      valorCausaCents: z.number().int().min(0).optional(),
      responsavelId: idOpt,
    }),
    resumo: (i) => `Editar processo #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const antes = await prisma.processo.findUnique({
        where: { id: i.id },
        select: { status: true, classe: true, assunto: true, tribunal: true, valorCausaCents: true, responsavelUser: { select: { nome: true } } },
      })
      const det = [
        { label: "Processo", valor: await rotuloProcesso(i.id) },
        diffRow("Status", i.status, antes?.status),
        diffRow("Classe", i.classe, antes?.classe ?? undefined),
        diffRow("Assunto", i.assunto, antes?.assunto ?? undefined),
        diffRow("Tribunal", i.tribunal, antes?.tribunal ?? undefined),
        diffRow("Valor da causa", i.valorCausaCents != null ? brl(i.valorCausaCents) : undefined, antes?.valorCausaCents != null ? brl(antes.valorCausaCents) : undefined),
        i.responsavelId ? diffRow("Responsável", await nomeUsuario(i.responsavelId), antes?.responsavelUser?.nome ?? undefined) : null,
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: "Editar processo", detalhes: det }
    },
    run: async (ctx, i) => {
      await negar(ctx, i.id)
      return updateProcesso(i.id, {
        numeroCnj: i.numeroCnj,
        classe: i.classe,
        assunto: i.assunto,
        tribunal: i.tribunal,
        comarca: i.comarca,
        vara: i.vara,
        uf: i.uf,
        instancia: i.instancia,
        status: i.status,
        faseAtual: i.faseAtual,
        valorCausaCents: i.valorCausaCents,
        responsavelUserId: i.responsavelId,
      })
    },
  }),
  defineTool({
    name: "excluir_processo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description: "Exclui (arquiva) um processo — sai das listas; os dados não são apagados de vez. Id via buscar/listar_processos.",
    schema: z.object({ id: idReq.describe("Id do processo") }),
    resumo: (i) => `Excluir processo #${i.id}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: "Excluir processo",
      detalhes: [{ label: "Processo", valor: await rotuloProcesso(i.id) }],
    }),
    run: async (ctx, i) => {
      await negar(ctx, i.id)
      return deleteProcesso(i.id)
    },
  }),

  // ── prazos (criar / cumprir / editar / excluir) ──
  defineTool({
    name: "cumprir_prazo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Marca um prazo como CUMPRIDO (protocolado). Use quando o usuário disser que protocolou/cumpriu a peça. Id via listar_prazos/detalhe_processo.",
    schema: z.object({ id: idReq.describe("Id do prazo"), data: dataISO.optional().describe("Data do cumprimento (padrão: hoje)") }),
    resumo: (i) => `Marcar prazo #${i.id} como cumprido`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.prazo.findUnique({
        where: { id: i.id },
        select: { descricao: true, processo: { select: { numeroCnj: true } } },
      })
      return {
        resumo: `Marcar prazo cumprido: ${p?.descricao ?? "prazo"}`,
        detalhes: [
          { label: "Prazo", valor: p?.descricao ?? `#${i.id}` },
          { label: "Processo", valor: p?.processo?.numeroCnj ?? "—" },
          { label: "Cumprido em", valor: i.data ? dataBr(i.data) : "hoje" },
        ],
      }
    },
    run: async (ctx, i) => {
      const prazo = await prisma.prazo.findFirst({ where: { id: i.id, excluidoEm: null }, select: { processoId: true } })
      if (!prazo) throw new UserError("Prazo não encontrado")
      await negar(ctx, prazo.processoId)
      return cumprirPrazo(i.id, i.data, ctx.user.email)
    },
  }),
  defineTool({
    name: "confirmar_prazo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Confirma um prazo PROPOSTO pela IA (status 'proposto') → vira definitivo (pendente), entra na agenda e passa a notificar. " +
      "Opcionalmente ajuste a peça (descricao), os dias (quantidadeDias), a margem (diasMargem) ou o responsável (responsavelId) antes de confirmar. " +
      "É a conferência humana. Obtenha o id com listar_prazos (status='proposto').",
    schema: z.object({
      id: idReq.describe("Id do prazo proposto"),
      descricao: z.string().min(1).max(200).optional(),
      quantidadeDias: z.number().int().min(1).max(365).optional(),
      diasMargem: z.number().int().min(0).max(60).optional(),
      responsavelId: idOpt,
    }),
    resumo: (i) => `Confirmar prazo proposto #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.prazo.findUnique({
        where: { id: i.id },
        select: { descricao: true, processo: { select: { numeroCnj: true } } },
      })
      const det = [
        { label: "Prazo", valor: p?.descricao ?? `#${i.id}` },
        { label: "Processo", valor: p?.processo?.numeroCnj ?? "—" },
      ]
      if (i.descricao) det.push({ label: "Nova peça", valor: i.descricao })
      if (i.quantidadeDias != null) det.push({ label: "Dias", valor: String(i.quantidadeDias) })
      if (i.responsavelId) det.push({ label: "Responsável", valor: await nomeUsuario(i.responsavelId) })
      return { resumo: `Confirmar prazo: ${p?.descricao ?? "proposto"}`, detalhes: det }
    },
    run: async (ctx, i) => {
      const prazo = await prisma.prazo.findFirst({ where: { id: i.id, excluidoEm: null }, select: { processoId: true } })
      if (!prazo) throw new UserError("Prazo não encontrado")
      await negar(ctx, prazo.processoId)
      return confirmarPrazo(
        i.id,
        {
          descricao: i.descricao,
          quantidadeDias: i.quantidadeDias,
          diasMargem: i.diasMargem,
          responsavelUserId: i.responsavelId,
        },
        ctx.user.email,
      )
    },
  }),
  defineTool({
    name: "rejeitar_prazo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Rejeita um prazo PROPOSTO pela IA (não procede) → cancela a proposta (não vira prazo). Obtenha o id com listar_prazos (status='proposto').",
    schema: z.object({ id: idReq.describe("Id do prazo proposto") }),
    resumo: (i) => `Rejeitar prazo proposto #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.prazo.findUnique({ where: { id: i.id }, select: { descricao: true } })
      return { resumo: "Rejeitar prazo proposto", detalhes: [{ label: "Prazo", valor: p?.descricao ?? `#${i.id}` }] }
    },
    run: async (ctx, i) => {
      const prazo = await prisma.prazo.findFirst({ where: { id: i.id, excluidoEm: null }, select: { processoId: true } })
      if (!prazo) throw new UserError("Prazo não encontrado")
      await negar(ctx, prazo.processoId)
      return rejeitarPrazo(i.id)
    },
  }),
  defineTool({
    name: "criar_prazo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Cria um prazo num processo — o sistema calcula a data fatal em DIAS ÚTEIS (CPC). Informe processoId (via buscar/" +
      "listar_processos), a peça (descricao), a quantidade de dias e a DATA-BASE: dataPublicacao (conta +1 dia útil), " +
      "dataDisponibilizacao do DJe (conta +2) ou dataInicio explícito. Apoio à decisão — exige conferência humana.",
    schema: z
      .object({
        processoId: idReq.describe("Id do processo"),
        descricao: z.string().min(1).max(200).describe("Peça/providência, ex.: 'Contestação'"),
        quantidadeDias: z.number().int().min(1).max(365).describe("Prazo legal em dias"),
        tipoContagem: z.enum(["uteis", "corridos"]).optional().describe("Padrão: uteis"),
        dataPublicacao: dataISO.optional().describe("Data da publicação conhecida (1 hop)"),
        dataDisponibilizacao: dataISO.optional().describe("Disponibilização no DJe (2 hops)"),
        dataInicio: dataISO.optional().describe("Início explícito (sem hops)"),
        diasMargem: z.number().int().min(0).max(60).optional().describe("Margem de segurança (dias úteis antes da fatal)"),
        responsavelId: idOpt.describe("Responsável (id)"),
      })
      .refine((v) => !!v.dataPublicacao || !!v.dataDisponibilizacao || !!v.dataInicio, {
        message: "informe dataPublicacao, dataDisponibilizacao ou dataInicio",
        path: ["dataPublicacao"],
      }),
    resumo: (i) => `Criar prazo "${i.descricao}" (${i.quantidadeDias} dias)`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: `Criar prazo: ${i.descricao}`,
      detalhes: [
        { label: "Processo", valor: await rotuloProcesso(i.processoId) },
        { label: "Peça", valor: i.descricao },
        { label: "Prazo", valor: `${i.quantidadeDias} dias ${i.tipoContagem === "corridos" ? "corridos" : "úteis"}` },
        {
          label: i.dataPublicacao ? "Publicação" : i.dataDisponibilizacao ? "Disponibilização" : "Início",
          valor: dataBr(i.dataPublicacao ?? i.dataDisponibilizacao ?? i.dataInicio),
        },
        ...(i.responsavelId ? [{ label: "Responsável", valor: await nomeUsuario(i.responsavelId) }] : []),
      ],
    }),
    run: async (ctx, i) => {
      await negar(ctx, i.processoId)
      return createPrazo(
        i.processoId,
        {
          descricao: i.descricao,
          quantidadeDias: i.quantidadeDias,
          tipoContagem: i.tipoContagem,
          dataPublicacao: i.dataPublicacao,
          dataDisponibilizacao: i.dataDisponibilizacao,
          dataInicio: i.dataInicio,
          diasMargem: i.diasMargem,
          responsavelUserId: i.responsavelId ?? null,
        },
        ctx.user.email,
      )
    },
  }),
  defineTool({
    name: "editar_prazo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Edita um prazo (id via listar_prazos/detalhe_processo): descricao, quantidadeDias, diasMargem, responsavelId, status " +
      "(pendente/cumprido/perdido/cancelado). Alterar a quantidade de dias recalcula a data fatal.",
    schema: z.object({
      id: idReq.describe("Id do prazo"),
      descricao: z.string().min(1).max(200).optional(),
      quantidadeDias: z.number().int().min(1).max(365).optional(),
      diasMargem: z.number().int().min(0).max(60).optional(),
      responsavelId: idOpt,
      status: z.enum(["pendente", "cumprido", "perdido", "cancelado"]).optional(),
    }),
    resumo: (i) => `Editar prazo #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.prazo.findUnique({
        where: { id: i.id },
        select: { descricao: true, quantidadeDias: true, status: true, responsavelUser: { select: { nome: true } } },
      })
      const det = [
        { label: "Prazo", valor: p?.descricao ?? `#${i.id}` },
        diffRow("Nova descrição", i.descricao, p?.descricao ?? undefined),
        diffRow("Dias", i.quantidadeDias != null ? String(i.quantidadeDias) : undefined, p?.quantidadeDias != null ? String(p.quantidadeDias) : undefined),
        diffRow("Status", i.status, p?.status ?? undefined),
        i.responsavelId ? diffRow("Responsável", await nomeUsuario(i.responsavelId), p?.responsavelUser?.nome ?? undefined) : null,
      ].filter((d): d is NonNullable<typeof d> => d != null)
      return { resumo: "Editar prazo", detalhes: det }
    },
    run: async (ctx, i) => {
      const prazo = await prisma.prazo.findFirst({ where: { id: i.id, excluidoEm: null }, select: { processoId: true } })
      if (!prazo) throw new UserError("Prazo não encontrado")
      await negar(ctx, prazo.processoId)
      return updatePrazo(
        i.id,
        {
          descricao: i.descricao,
          quantidadeDias: i.quantidadeDias,
          diasMargem: i.diasMargem,
          responsavelUserId: i.responsavelId,
          status: i.status,
        },
        ctx.user.email,
      )
    },
  }),
  defineTool({
    name: "excluir_prazo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description: "Exclui (arquiva) um prazo. Id via listar_prazos/detalhe_processo.",
    schema: z.object({ id: idReq.describe("Id do prazo") }),
    resumo: (i) => `Excluir prazo #${i.id}`,
    montarConfirmacao: async (_ctx, i) => {
      const p = await prisma.prazo.findUnique({ where: { id: i.id }, select: { descricao: true } })
      return { resumo: "Excluir prazo", detalhes: [{ label: "Prazo", valor: p?.descricao ?? `#${i.id}` }] }
    },
    run: async (ctx, i) => {
      const prazo = await prisma.prazo.findFirst({ where: { id: i.id, excluidoEm: null }, select: { processoId: true } })
      if (!prazo) throw new UserError("Prazo não encontrado")
      await negar(ctx, prazo.processoId)
      return deletePrazo(i.id)
    },
  }),

  // ── publicações (vincular / excluir) ──
  defineTool({
    name: "vincular_publicacao",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Vincula uma publicação/intimação 'a vincular' a um processo existente. Informe publicacaoId (listar_publicacoes) e " +
      "processoId (buscar/listar_processos).",
    schema: z.object({ publicacaoId: idReq.describe("Id da publicação"), processoId: idReq.describe("Id do processo") }),
    resumo: (i) => `Vincular publicação #${i.publicacaoId} ao processo #${i.processoId}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: "Vincular publicação ao processo",
      detalhes: [{ label: "Processo", valor: await rotuloProcesso(i.processoId) }],
    }),
    run: async (ctx, i) => {
      // checa o destino E a origem (publicação já vinculada a outro processo)
      const pub = await prisma.publicacao.findFirst({ where: { id: i.publicacaoId, excluidoEm: null }, select: { processoId: true } })
      if (!pub) throw new UserError("Publicação não encontrada")
      if (pub.processoId != null) await negar(ctx, pub.processoId)
      await negar(ctx, i.processoId)
      return vincularPublicacao(i.publicacaoId, i.processoId)
    },
  }),
  defineTool({
    name: "excluir_publicacao",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description: "Remove uma publicação da fila (soft-delete). Id via listar_publicacoes.",
    schema: z.object({ id: idReq.describe("Id da publicação") }),
    resumo: (i) => `Excluir publicação #${i.id}`,
    montarConfirmacao: async (_ctx, i) => ({ resumo: "Excluir publicação", detalhes: [{ label: "Publicação", valor: `#${i.id}` }] }),
    run: async (ctx, i) => {
      const pub = await prisma.publicacao.findFirst({ where: { id: i.id, excluidoEm: null }, select: { processoId: true } })
      if (!pub) throw new UserError("Publicação não encontrada")
      // não-vinculada (processoId null) é veTudo-only; vinculada → escopo do processo
      await negar(ctx, pub.processoId ?? -1)
      return deletePublicacao(i.id)
    },
  }),

  // ── integração / consistência (associar processo ↔ caso/cliente/honorário) ──
  defineTool({
    name: "sugerir_associacao_processo",
    kind: "readonly",
    description:
      "Apoio à decisão (AI-first): varre o banco por caso/cliente/honorário correspondente a um processo — FORTE pelo número CNJ, " +
      "SUGESTÃO por nome de parte. Informe processoId (usa o CNJ do processo) OU numeroCnj avulso. Use para 'a que caso/cliente " +
      "pertence este processo?', 'há honorário para este processo?', conferir consistência de um processo capturado.",
    schema: z.object({
      processoId: idOpt.describe("Id do processo (usa o CNJ dele)"),
      numeroCnj: z.string().max(40).optional().describe("Número CNJ avulso"),
      cliente: z.string().max(120).optional().describe("Nome provável do cliente/parte"),
    }),
    run: async (ctx, i) => {
      let numeroCnj = i.numeroCnj ?? null
      const nomes: string[] = i.cliente ? [i.cliente] : []
      if (i.processoId) {
        await negar(ctx, i.processoId)
        const p = await prisma.processo.findUnique({
          where: { id: i.processoId },
          select: { numeroCnj: true, caso: { select: { titulo: true } } },
        })
        numeroCnj = numeroCnj ?? p?.numeroCnj ?? null
        if (p?.caso?.titulo) nomes.push(p.caso.titulo)
      }
      return associarProcesso({ numeroCnj, partesNomes: nomes, clienteProvavel: i.cliente ?? null })
    },
  }),
  // (removido) vincular_honorario_processo — honorários agora são lançamentos
  // (subTipo='honorario') que já carregam processoId; o vínculo a processo será
  // um follow-up via processoId no LancamentoPatch.
  defineTool({
    name: "adicionar_parte_processo",
    kind: "mutation",
    roles: ["socio", "advogado"],
    description:
      "Adiciona/estrutura uma parte num processo (resolve processos capturados sem partes). Informe processoId, nome, papel " +
      "(autor/reu/exequente/executado/embargante/terceiro/outro) e polo (ativo/passivo/outro). Opcional: documento (CPF/CNPJ), " +
      "clienteId (se for um cliente cadastrado), ehCliente.",
    schema: z.object({
      processoId: idReq.describe("Id do processo"),
      nome: z.string().min(1).max(200),
      papel: z.string().max(30).describe("autor | reu | exequente | executado | embargante | terceiro | outro"),
      polo: z.string().max(20).describe("ativo | passivo | outro"),
      documento: z.string().max(30).optional().describe("CPF/CNPJ"),
      clienteId: idOpt.describe("Cliente cadastrado (id), se a parte for cliente do escritório"),
      ehCliente: z.boolean().optional(),
    }),
    resumo: (i) => `Adicionar parte: ${i.nome}`,
    montarConfirmacao: async (_ctx, i) => ({
      resumo: "Adicionar parte ao processo",
      detalhes: [
        { label: "Processo", valor: await rotuloProcesso(i.processoId) },
        { label: "Parte", valor: `${i.nome} (${i.papel})` },
        ...(i.clienteId ? [{ label: "Cliente vinculado", valor: await nomeCliente(i.clienteId) }] : []),
      ],
    }),
    run: async (ctx, i) => {
      await negar(ctx, i.processoId)
      return addParteAoProcesso(i.processoId, {
        nome: i.nome,
        papel: i.papel,
        polo: i.polo,
        documento: i.documento ?? null,
        clienteId: i.clienteId ?? null,
        ehCliente: i.ehCliente,
      })
    },
  }),
]
