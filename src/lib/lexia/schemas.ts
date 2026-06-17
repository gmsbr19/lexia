// Zod schemas for the LexIA chat payloads, enforced at the route boundary.
import { z } from "zod"
import { idOpt } from "@/lib/validation"
import { MAX_ANEXOS, MIME_PERMITIDOS } from "@/lib/lexia/anexos/validacao"

// Anexo (imagem/PDF) encaminhado no chat. Limites de tamanho são re-checados em
// validarAnexos() na rota (mensagens PT-BR); aqui garantimos só forma e MIME.
export const anexoSchema = z.object({
  nome: z.string().min(1).max(255),
  mimeType: z.enum(MIME_PERMITIDOS),
  dataBase64: z.string().min(1),
})

export const lexiaChatSchema = z
  .object({
    conversaId: idOpt,
    mensagem: z.string().max(4000).optional().default(""),
    pagina: z.string().max(100).optional(), // current app route, for agent context
    anexos: z.array(anexoSchema).max(MAX_ANEXOS).optional(),
    // Snapshot of the document open in the editor — lets the agent read + propose
    // edits to it (editar_documento_aberto). Not persisted; rides only this turn.
    documento: z
      .object({
        documentoId: idOpt,
        template: z.string().max(60),
        data: z.unknown(),
      })
      .optional(),
  })
  // Permite enviar só anexo (sem legenda), mas não uma mensagem totalmente vazia.
  .refine((b) => b.mensagem.trim().length > 0 || (b.anexos?.length ?? 0) > 0, {
    message: "Escreva uma mensagem ou anexe um arquivo",
    path: ["mensagem"],
  })

export const acaoDecisaoSchema = z.object({
  decisao: z.enum(["confirmar", "recusar"]),
})

export const conversaCreateSchema = z.object({
  titulo: z.string().max(200).nullish(),
})

export const conversaPatchSchema = z.object({
  titulo: z.string().min(1).max(200),
})
