// Zod dos payloads de informações fixadas (borda da rota → 400 limpo). Regras de
// acesso e de âncora viva ficam na camada de mutação.
import { z } from "zod"
import { idOpt, idReq } from "@/lib/validation"
import { CONTEUDO_MAX } from "./core"

export const ancoraSchema = z.object({
  tipo: z.enum(["cliente", "caso", "projeto"]),
  id: idReq,
})

const conteudo = z.string().trim().min(1, "A informação não pode ficar vazia").max(CONTEUDO_MAX)

export const informacaoCreateSchema = z.object({
  ancora: ancoraSchema,
  conteudo,
  fixado: z.boolean().optional(), // padrão: fixada
  origemTarefaId: idOpt,
})

export const informacaoPatchSchema = z
  .object({ conteudo, fixado: z.boolean() })
  .partial()
  .refine((v) => v.conteudo !== undefined || v.fixado !== undefined, { message: "Nada para alterar" })

export const fonteSchema = z.enum(["cliente", "anotacao"])
