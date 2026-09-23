// Zod dos payloads de Projetos e Modelos (borda da rota → UserError → 400).
import { z } from "zod"
import { idOpt, idReq } from "@/lib/validation"

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const cor = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

export const projetoCreateSchema = z.object({
  nomeCurto: z.string().trim().min(1).max(24),
  nome: z.string().trim().min(1).max(200),
  clienteId: idOpt,
  area: z.string().max(60).nullish(),
  responsavelId: idOpt,
  prazo: iso.nullish(),
  cor: cor.nullish(),
  descricao: z.string().max(4000).nullish(),
})

export const projetoPatchSchema = projetoCreateSchema.partial().extend({
  arquivado: z.boolean().optional(),
})

export const deModeloSchema = z.object({
  modeloId: idReq,
  projeto: projetoCreateSchema,
  grupos: z
    .array(z.object({ nome: z.string().trim().min(1).max(160), prazo: iso }))
    .min(1)
    .max(12),
  responsaveis: z.record(z.string().max(60), idOpt).optional(),
})

const passoSchema = z.object({
  chave: z.string().trim().min(1).max(40),
  titulo: z.string().trim().min(1).max(300),
  papelId: z.string().max(60).nullish(),
  diasAntes: z.number().int().min(0).max(3650),
  prazoFatal: z.boolean().optional(),
  anteriores: z.array(z.string().max(40)).max(40).optional(),
  checklist: z.array(z.string().trim().max(300)).max(40).optional(),
})

export const modeloSchema = z.object({
  nome: z.string().trim().min(1).max(160),
  area: z.string().max(60).nullish(),
  palavraGrupo: z.string().trim().min(1).max(40),
  sufixoGrupo: z.string().max(120).optional(),
  papeis: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60),
        rotulo: z.string().trim().min(1).max(80),
        padraoUsuarioId: idOpt,
      }),
    )
    .max(12),
  passos: z.array(passoSchema).min(1).max(60),
})
