// Zod schemas for the agenda mutation payloads — transcription of
// EventoCreate/EventoPatch in ./mutations.ts, enforced at the route boundary.
// Enum-ish fields stay loose strings: the mutation coercers clamp them.
import { z } from "zod"
import { dateStr, idOpt } from "@/lib/validation"

export const eventoCreateSchema = z.object({
  titulo: z.string().min(1).max(300),
  tipo: z.string().max(20).optional(),
  dataInicio: dateStr, // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
  dataFim: dateStr.nullish(),
  diaInteiro: z.boolean().optional(),
  local: z.string().max(300).nullish(),
  descricao: z.string().max(4000).nullish(),
  status: z.string().max(20).optional(),
  responsavelId: idOpt,
  clienteId: idOpt,
  casoId: idOpt,
})

export const eventoPatchSchema = eventoCreateSchema.partial()
