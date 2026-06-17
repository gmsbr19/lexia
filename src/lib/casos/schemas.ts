// Zod schemas for the caso create/patch payloads, enforced at the route boundary.
import { z } from "zod"
import { dateStr, idOpt } from "@/lib/validation"

export const casoPatchSchema = z.object({
  titulo: z.string().min(1).max(400).optional(),
  tipo: z.string().max(20).optional(),
  area: z.string().max(120).nullish(),
  status: z.string().max(60).nullish(),
  responsavel: z.string().max(200).nullish(),
  responsavelUserId: idOpt,
  clientePrincipalId: idOpt,
  numeroProcesso: z.string().max(80).nullish(),
  tribunal: z.string().max(200).nullish(),
  vara: z.string().max(200).nullish(),
  instancia: z.string().max(60).nullish(),
  tipoAcao: z.string().max(200).nullish(),
  valorCausaCents: z.number().int().min(0).nullish(),
  dataDistribuicao: dateStr.nullish(),
  ultimaMovimentacao: dateStr.nullish(),
})

export const casoCreateSchema = casoPatchSchema.extend({
  titulo: z.string().min(1).max(400),
})
