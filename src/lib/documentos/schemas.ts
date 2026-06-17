// Zod schemas for the documentos mutation payloads, enforced at the route
// boundary. `payload` is free-form JSON (the editor form data) — size-guarded
// by the mutation layer.
import { z } from "zod"
import { idOpt } from "@/lib/validation"

export const documentoCreateSchema = z.object({
  nome: z.string().min(1).max(300),
  template: z.string().min(1).max(80),
  formato: z.string().max(10).nullish(),
  status: z.string().max(20).optional(),
  payload: z.unknown().optional(),
  clienteId: idOpt,
  casoId: idOpt,
})

export const documentoPatchSchema = documentoCreateSchema.partial().omit({ template: true })
