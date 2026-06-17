// Documentos tools — both client-side (no confirmation gate):
//   • rascunhar_documento      — create a draft Documento + open the editor on it.
//   • editar_documento_aberto  — propose edits to the OPEN document; the editor
//                                renders "Aceitar" cards over the live preview.
// Drafting a rascunho is reversible, and document edits apply to the live editor
// state (not the DB), so neither needs the mutation confirmation pause.
import { z } from "zod"
import { idOpt } from "@/lib/validation"
import { UserError } from "@/lib/errors"
import { createDocumento } from "@/lib/documentos/mutations"
import { getTemplate } from "@/lib/documents/registry"
import { sugestaoCampoSchema } from "@/lib/documents/ai-suggest"
import { defineTool } from "../types"

const TEMPLATE = z.enum(["contrato-honorarios", "contrato-prestacao-servicos"])

export const documentosTools = [
  defineTool({
    name: "rascunhar_documento",
    kind: "client",
    clientEvent: "navigate",
    description:
      "Cria um RASCUNHO de documento já pré-preenchido com o que o usuário descreveu e ABRE o editor nele. " +
      "Use SEMPRE que o usuário pedir para rascunhar/minutar/redigir um contrato — NUNCA escreva o contrato no chat. " +
      "Templates: contrato-honorarios (honorários mensais/parcelados/por êxito) e contrato-prestacao-servicos. " +
      "Em 'dados', preencha o que conseguir extrair do pedido (nome do contratante em contratantes, objeto, foro, valores em honorarios) " +
      "no formato ContratoHonorariosData; deixe o resto vazio para o usuário completar no editor.",
    schema: z.object({
      template: TEMPLATE.describe("Modelo do documento a rascunhar"),
      clienteId: idOpt.describe("Id do cliente já vinculado, se houver (obtido via buscar)"),
      casoId: idOpt.describe("Id do caso, se aplicável"),
      nome: z
        .string()
        .max(160)
        .optional()
        .describe("Nome do documento, ex.: 'Contrato de Honorários — João Silva'"),
      dados: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Conteúdo inicial parcial do contrato (ContratoHonorariosData) — só os campos que der para preencher"),
    }),
    run: async (ctx, input) => {
      const tpl = getTemplate(input.template)
      const doc = await createDocumento({
        nome: input.nome?.trim() || (tpl ? `${tpl.name} — Novo` : "Novo documento"),
        template: input.template,
        status: "rascunho",
        payload: input.dados ?? null,
        clienteId: input.clienteId ?? null,
        casoId: input.casoId ?? null,
        criadoPor: ctx.user.email,
      })
      return `/documents/editor/${input.template}?documento=${doc.id}`
    },
  }),
  defineTool({
    name: "editar_documento_aberto",
    kind: "client",
    clientEvent: "doc-patch",
    description:
      "Propõe alterações no documento ABERTO no editor (o contrato vem em <documento_aberto> nesta conversa). " +
      "Use para ajustar objeto, foro, valores, dados do contratante ou REESCREVER uma cláusula. " +
      "As alterações aparecem como cartões 'Aceitar' que o usuário aplica ao preview ao vivo — NÃO reescreva o contrato inteiro no chat. " +
      "Só chame quando houver um <documento_aberto> na conversa. Para CRIAR um documento novo, use rascunhar_documento.",
    schema: z.object({
      sugestoes: z
        .array(sugestaoCampoSchema)
        .min(1)
        .describe("Alterações propostas: field = caminho do campo (conforme o dicionário); value = novo valor"),
    }),
    run: async (_ctx, input) => {
      if (input.sugestoes.length === 0) throw new UserError("Nenhuma alteração proposta")
      return { sugestoes: input.sugestoes }
    },
  }),
]
