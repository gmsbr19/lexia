// Documentos tools — client-side (no confirmation gate):
//   • rascunhar_documento — create a blank draft Documento + open the rich-text
//     editor on it. Drafting a rascunho is reversible, so it needs no pause.
import { z } from "zod"
import { idOpt } from "@/lib/validation"
import { createDocumento } from "@/lib/documentos/mutations"
import { emptyDoc } from "@/lib/documents/model/types"
import { defineTool } from "../types"

export const documentosTools = [
  defineTool({
    name: "rascunhar_documento",
    kind: "client",
    clientEvent: "navigate",
    description:
      "Cria um RASCUNHO de documento EM BRANCO e ABRE o editor de documentos (rich-text) nele. " +
      "Use SEMPRE que o usuário pedir para rascunhar/minutar/redigir um documento/contrato/minuta — NUNCA escreva o texto do documento no chat. " +
      "No editor o usuário escreve o conteúdo, detecta os campos e exporta em PDF/DOCX.",
    schema: z.object({
      clienteId: idOpt.describe("Id do cliente já vinculado, se houver (obtido via buscar)"),
      casoId: idOpt.describe("Id do caso, se aplicável"),
      nome: z
        .string()
        .max(160)
        .optional()
        .describe("Nome do documento, ex.: 'Contrato de Honorários — João Silva'"),
    }),
    run: async (ctx, input) => {
      const doc = await createDocumento({
        nome: input.nome?.trim() || "Documento sem título",
        template: "livre",
        status: "rascunho",
        conteudo: emptyDoc(),
        clienteId: input.clienteId ?? null,
        casoId: input.casoId ?? null,
        criadoPor: ctx.user.email,
      })
      return `/documents/doc/${doc.id}`
    },
  }),
]
