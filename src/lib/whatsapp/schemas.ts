// WhatsApp — schemas Zod das rotas. Deliberadamente mínimos: nenhuma rota do
// módulo aceita `userId`, então não há o que validar além do número do aparelho.
import { z } from "zod"
import { HISTORICO_DIAS_MAX, HISTORICO_DIAS_MIN } from "./tipos"

export const pareamentoSchema = z
  .object({
    /** Telefone como o usuário digitou; normalizado por numeroParaPareamento. */
    numero: z.string().min(10).max(25),
  })
  .strict()

export type PareamentoInput = z.infer<typeof pareamentoSchema>

/**
 * PATCH de uma conversa. Note o que NÃO está aqui: `userId` (vem da sessão) e
 * `vinculo` (é derivado — confirmar a sugestão e escolher outro contato não são
 * a mesma coisa, e deixar o cliente mandar nessa coluna permitiria marcar como
 * "confirmado" o que ninguém confirmou).
 */
export const conversaPatchSchema = z
  .object({
    monitorar: z.boolean().optional(),
    /** null desvincula o contato. */
    clienteId: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((v) => v.monitorar !== undefined || v.clienteId !== undefined, {
    message: "Nada a alterar",
  })

export type ConversaPatchInput = z.infer<typeof conversaPatchSchema>

/**
 * Quantos dias de histórico gravar no pareamento. A faixa é a mesma que a
 * página oferece; `diasDoHistorico` apara de novo na leitura, porque um valor
 * pode ter entrado no banco por outro caminho.
 */
export const historicoDiasSchema = z
  .object({
    dias: z.number().int().min(HISTORICO_DIAS_MIN).max(HISTORICO_DIAS_MAX),
  })
  .strict()

export type HistoricoDiasInput = z.infer<typeof historicoDiasSchema>
