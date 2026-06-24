// Áreas do Direito — Zod schemas para validação de entrada nos routes.
import { z } from "zod"

export const areaCreateSchema = z.object({
  nome: z.string().min(1).max(100),
  chave: z.string().max(50).optional(),
  cor: z.string().max(40).nullish(),
  icone: z.string().max(40).nullish(),
  ordem: z.number().int().optional(),
  ativo: z.boolean().optional(),
})

export const areaPatchSchema = areaCreateSchema.partial()
