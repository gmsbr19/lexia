// Zod schemas for the projetos mutation payloads — enforced at the route boundary
// (parseBody → UserError → clean PT-BR 400). Enum-ish fields stay loose strings;
// the _input.ts coercers clamp them to valid values.
import { z } from "zod"
import { dateStr, idOpt, idReq } from "@/lib/validation"

export const projetoCreateSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(4000).nullish(),
  status: z.string().max(20).optional(),
  cor: z.string().max(40).nullish(),
  icone: z.string().max(40).nullish(),
  area: z.string().max(40).nullish(),
  prazo: dateStr.nullish(),
  responsavelId: idOpt,
  casoId: idOpt,
  clienteId: idOpt,
  ordem: z.number().int().optional(),
})

export const projetoPatchSchema = projetoCreateSchema.partial()

// Bulk edit of tasks (F4): apply ONE of the listed fields across many tasks.
export const tarefasLoteSchema = z.object({
  ids: z.array(idReq).min(1).max(200),
  status: z.enum(["todo", "doing", "review", "done"]).optional(),
  responsavelId: idOpt,
  data: dateStr.nullish(),
  prazo: dateStr.nullish(),
  projetoId: idOpt,
  prio: z.number().int().min(1).max(4).optional(),
  excluir: z.boolean().optional(),
})

// Template item (for the admin editor + instantiation).
const templateItemSchema = z.object({
  titulo: z.string().min(1).max(300),
  descricao: z.string().max(4000).nullish(),
  prio: z.number().int().min(1).max(4).optional(),
  responsavelPlaceholder: z.string().max(120).nullish(),
  offsetDias: z.number().int().min(0).max(3650).optional(),
  base: z.enum(["inicio", "anterior"]).optional(),
  dor: z.array(z.string().min(1)).max(12).optional(),
  dod: z.array(z.string().min(1)).max(12).optional(),
})

export const templateCreateSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(4000).nullish(),
  area: z.string().max(40).nullish(),
  cor: z.string().max(40).nullish(),
  icone: z.string().max(40).nullish(),
  ativo: z.boolean().optional(),
  itens: z.array(templateItemSchema).max(100).optional(),
})

export const templatePatchSchema = templateCreateSchema.partial()

// Instantiate a template into a real project + its tasks.
export const instanciarSchema = z.object({
  templateId: idReq,
  dataInicio: dateStr,
  nome: z.string().min(1).max(200).optional(), // overrides the template name
  responsavelId: idOpt, // project lead + fallback assignee
  casoId: idOpt,
  clienteId: idOpt,
  // map each item ordem → a real User id (responsavelPlaceholder → membro)
  responsaveis: z.array(z.object({ ordem: z.number().int().min(0), responsavelId: idReq })).max(100).optional(),
})
