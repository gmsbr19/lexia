// WhatsApp — schemas Zod das rotas. Deliberadamente mínimos: nenhuma rota do
// módulo aceita `userId`, então não há o que validar além do número do aparelho.
import { z } from "zod"

export const pareamentoSchema = z
  .object({
    /** Telefone como o usuário digitou; normalizado por numeroParaPareamento. */
    numero: z.string().min(10).max(25),
  })
  .strict()

export type PareamentoInput = z.infer<typeof pareamentoSchema>
