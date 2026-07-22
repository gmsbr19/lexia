// Zod schemas for the tarefas mutation payloads — transcription of
// TarefaCreate/TarefaPatch in ./mutations.ts, enforced at the route boundary
// (parseBody throws UserError → clean 400). Enum-ish fields stay loose strings
// on purpose: the _input.ts coercers already clamp them to valid values.
import { z } from "zod"
import { dateStr, idOpt } from "@/lib/validation"

const jsonArr = z.array(z.unknown()).max(100)

export const tarefaCreateSchema = z.object({
  titulo: z.string().min(1).max(300),
  status: z.string().max(20).optional(),
  done: z.boolean().optional(),
  prio: z.number().int().optional(),
  projeto: z.string().max(40).optional(),
  data: dateStr.nullish(),
  hora: z.string().max(10).nullish(),
  prazo: dateStr.nullish(),
  notes: z.string().max(4000).nullish(),
  reminder: z.string().max(60).nullish(),
  recur: z.string().max(60).nullish(),
  ai: z.boolean().optional(),
  subtasks: jsonArr.optional(),
  dor: jsonArr.optional(),
  dod: jsonArr.optional(),
  responsavelId: idOpt,
  casoId: idOpt,
  clienteId: idOpt,
  projetoId: idOpt,
  secaoId: idOpt,
  ordem: z.number().int().optional(),
})

export const tarefaPatchSchema = tarefaCreateSchema.partial()

// Comentários da tarefa. `conteudo` pode conter tokens de menção inline
// (@[<userId>] / @[todos]); o cap de 4000 espelha o de `notes`.
export const comentarioCreateSchema = z.object({
  conteudo: z.string().min(1).max(4000),
})

export const comentarioEditSchema = comentarioCreateSchema
