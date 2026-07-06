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

// "Ajustar" do RetryMenu (Fase 5): reformula a MESMA pergunta com uma instrução
// extra volátil (nunca entra no CORE cacheado — ver agent/modificadores.ts).
export const modificadorSchema = z.enum(["curta", "formal", "simples"])

// Menções "@" do composer (Fase 7, D10): entidades citadas explicitamente — o
// turno as prioriza como contexto principal (bloco <mencoes> volátil, fora do
// CORE) e a LEXÍA não precisa chamar "buscar" de novo pelo mesmo nome.
export const mencaoEntidadeSchema = z.object({
  tipo: z.enum(["cliente", "processo", "contrato"]),
  id: z.number().int().positive(),
  nome: z.string().max(200),
  rota: z.string().max(200),
})
export const contextoMencoesSchema = z.object({
  entidades: z.array(mencaoEntidadeSchema).max(5),
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
    // Editar pergunta / RetryMenu (Fase 5): id da mensagem do usuário (dona) a partir
    // da qual truncar antes de reenviar — ela e tudo depois são descartados.
    refazerDesdeMensagemId: idOpt,
    modificador: modificadorSchema.optional(),
    contexto: contextoMencoesSchema.optional(), // menções "@" do composer (Fase 7)
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

// Resposta a um ChoiceCard (tool perguntar_usuario, Fase 6, D3) — 1-10 opções
// marcadas e/ou um texto livre ("Outro"), pelo menos um dos dois presente.
export const respostaEscolhaSchema = z
  .object({
    selecionadas: z.array(z.string().max(300)).max(10),
    outro: z.string().max(300).optional(),
  })
  .refine((r) => r.selecionadas.length > 0 || !!r.outro?.trim(), { message: "Escolha ao menos uma opção", path: ["selecionadas"] })

export const acaoDecisaoSchema = z
  .object({
    decisao: z.enum(["confirmar", "recusar", "responder"]),
    resposta: respostaEscolhaSchema.optional(),
  })
  .refine((b) => b.decisao !== "responder" || !!b.resposta, { message: "Resposta obrigatória", path: ["resposta"] })

export const conversaCreateSchema = z.object({
  titulo: z.string().max(200).nullish(),
})

// titulo (renomear) e/ou fixada (Histórico v2, Fase 8) — ao menos um presente.
export const conversaPatchSchema = z
  .object({
    titulo: z.string().min(1).max(200).optional(),
    fixada: z.boolean().optional(),
  })
  .refine((b) => b.titulo !== undefined || b.fixada !== undefined, { message: "Nada para atualizar" })

export const mensagemPatchSchema = z.object({
  feedback: z.enum(["up", "down"]).nullable(),
})
