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

// Modo do agente, modelo e toggles que a barra de chat envia POR TURNO (a persona
// e as instruções vivem no banco; estes são as seleções vivas do composer).
export const lexiaAgentModeSchema = z.enum(["agente", "pergunta", "plano"])
export const lexiaModeloSchema = z.enum(["auto", "rapido", "avancado"])

// Contexto do documento aberto no editor flexível (`/documents/doc/[id]`). Enviado
// SÓ pelo painel embutido; habilita as ferramentas de edição de documento e injeta
// texto/campos/seleção na mensagem volátil. `selecao.from/to` = posições ProseMirror.
export const documentoSelecaoSchema = z.object({
  texto: z.string().max(8000),
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
})
export const documentoContextoSchema = z.object({
  id: idOpt,
  texto: z.string().max(40000),
  campos: z.array(z.object({ name: z.string().max(60), label: z.string().max(160) })).max(120),
  valores: z.record(z.string(), z.string()).optional(),
  selecao: documentoSelecaoSchema.optional(),
})

export const lexiaChatSchema = z
  .object({
    conversaId: idOpt,
    mensagem: z.string().max(4000).optional().default(""),
    pagina: z.string().max(100).optional(), // current app route, for agent context
    anexos: z.array(anexoSchema).max(MAX_ANEXOS).optional(),
    opus: z.boolean().optional(), // legado: equivale a modelo:'avancado' (compat)
    modelo: lexiaModeloSchema.optional(), // seletor de modelo da barra (auto|rapido|avancado)
    agentMode: lexiaAgentModeSchema.optional(), // modo vivo do composer
    autoMode: z.boolean().optional(), // ligado: executa mutações sem confirmar
    documento: documentoContextoSchema.optional(), // contexto do editor flexível
  })
  // Permite enviar só anexo (sem legenda), mas não uma mensagem totalmente vazia.
  .refine((b) => b.mensagem.trim().length > 0 || (b.anexos?.length ?? 0) > 0, {
    message: "Escreva uma mensagem ou anexe um arquivo",
    path: ["mensagem"],
  })

// Preferências da LexIA (User.lexiaPrefs) — a UI envia o objeto completo; todos os
// campos são opcionais. Limites defensivos no texto livre das instruções/memórias.
export const lexiaPrefsSchema = z
  .object({
    persona: z.enum(["custom", "senior", "cordial", "analista"]).optional(),
    instrucoes: z
      .object({
        identidade: z.string().max(2000).optional(),
        interacao: z.string().max(2000).optional(),
        memorias: z.array(z.string().max(400)).max(30).optional(),
      })
      .strict()
      .optional(),
    agentMode: lexiaAgentModeSchema.optional(),
    webAccess: z.boolean().optional(),
    autoMode: z.boolean().optional(),
    modelo: lexiaModeloSchema.optional(),
  })
  .strict()

export const acaoDecisaoSchema = z.object({
  decisao: z.enum(["confirmar", "recusar"]),
})

export const conversaCreateSchema = z.object({
  titulo: z.string().max(200).nullish(),
})

export const conversaPatchSchema = z.object({
  titulo: z.string().min(1).max(200),
})
