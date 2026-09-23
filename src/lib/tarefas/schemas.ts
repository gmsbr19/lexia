// Zod dos payloads do módulo Tarefas — aplicados na borda da rota (parseBody →
// UserError → 400 limpo). A semântica (prazo padrão, ciclo, projeto…) é validada
// na camada de mutação.
import { z } from "zod"
import { idOpt, idReq } from "@/lib/validation"

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const titulo = z.string().trim().min(1).max(300)

export const tarefaCreateSchema = z.object({
  titulo,
  projetoId: idOpt,
  grupo: z.string().max(160).nullish(),
  // ausente = quem cria; null = "Sem responsável"
  responsavelId: idOpt,
  clienteId: idOpt,
  prazo: iso.optional(), // ausente = sexta da semana (regras.prazoPadrao)
  prazoFatal: z.boolean().optional(),
  descricao: z.string().max(8000).nullish(),
  checklist: z.array(z.string().max(300)).max(60).optional(),
  recur: z.string().max(60).nullish(),
  // vínculos legados (Casos / Processos / Comercial ainda criam tarefas ligadas)
  casoId: idOpt,
  processoId: idOpt,
  leadId: idOpt,
})

export const tarefaPatchSchema = z
  .object({
    titulo,
    descricao: z.string().max(8000).nullable(),
    projetoId: idOpt,
    grupo: z.string().max(160).nullable(),
    responsavelId: idOpt,
    clienteId: idOpt,
    prazoFatal: z.boolean(),
    recur: z.string().max(60).nullable(),
  })
  .partial()

export const prazoSchema = z.object({
  prazo: iso,
  ajustarSeguintes: z.boolean().optional(),
})

export const statusSchema = z.object({
  status: z.enum(["todo", "doing", "wait", "done"]),
  aguardandoTexto: z.string().trim().max(200).nullish(),
  confirmarInicio: z.boolean().optional(),
})

export const checklistAddSchema = z.object({ texto: z.string().trim().min(1).max(300) })
export const checklistPatchSchema = z
  .object({ texto: z.string().trim().min(1).max(300), marcado: z.boolean() })
  .partial()

export const ligacaoSchema = z.object({ anteriorId: idReq, seguinteId: idReq })

export const anexoLinkSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((u) => /^https?:\/\//i.test(u), "use um endereço http(s)"),
})

export const sugerirSchema = z.object({ titulo: z.string().trim().min(2).max(300) })

// Comentários da tarefa. `conteudo` pode conter tokens de menção inline
// (@[<userId>] / @[todos]).
export const comentarioCreateSchema = z.object({
  conteudo: z.string().min(1).max(4000),
})
export const comentarioEditSchema = comentarioCreateSchema


// ── visão e ordem manual (por pessoa) ─────────────────────────────────────────
export const prefsQuadroSchema = z.object({
  ordenar: z.enum(["manual", "due", "proj", "owner"]),
  direcao: z.enum(["asc", "desc"]),
  agrupar: z.enum(["none", "proj", "owner", "group"]),
})

export const ordemSchema = z.object({
  itens: z.array(z.object({ id: idReq, ordem: z.number().finite() })).max(2000),
})
