// Zod dos payloads de projetos criados/editados pelo quadro e dos Modelos de
// tarefas (borda da rota → UserError → 400).
import { z } from "zod"
import { chaveProjetoSchema } from "@/lib/tarefas/schemas"
import { idOpt, idReq } from "@/lib/validation"

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const cor = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

/**
 * "Novo projeto" do quadro: COM cliente vira um caso do cliente (o cadastro
 * completo fica em /casos); SEM cliente, um projeto interno.
 */
export const projetoNovoSchema = z.object({
  nomeCurto: z.string().trim().min(1).max(24),
  nome: z.string().trim().min(1).max(400), // título do caso / nome do projeto
  clienteId: idOpt,
  area: z.string().max(60).nullish(),
  responsavelId: idOpt,
  prazo: iso.nullish(),
  cor: cor.nullish(),
  descricao: z.string().max(4000).nullish(),
})

/** Editar/arquivar um projeto interno (o caso se edita em /casos). */
export const projetoInternoPatchSchema = z
  .object({
    nomeCurto: z.string().trim().min(1).max(24),
    nome: z.string().trim().min(1).max(400),
    responsavelId: idOpt,
    prazo: iso.nullable(),
    cor: cor.nullable(),
    descricao: z.string().max(4000).nullable(),
    arquivado: z.boolean(),
  })
  .partial()

/** Vincular um projeto interno a um cliente (vira caso). */
export const converterProjetoSchema = z.object({ clienteId: idReq })

/** Aplicar um modelo: a um projeto NOVO (`novo`) ou a um projeto existente (`projeto`). */
export const usarModeloSchema = z
  .object({
    novo: projetoNovoSchema.optional(),
    projeto: chaveProjetoSchema.optional(),
    grupos: z
      .array(z.object({ nome: z.string().trim().min(1).max(160), prazo: iso }))
      .min(1)
      .max(12),
    responsaveis: z.record(z.string().max(60), idOpt).optional(),
  })
  .refine((v) => (v.novo == null) !== (v.projeto == null), { message: "informe um projeto novo OU um projeto existente" })

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
