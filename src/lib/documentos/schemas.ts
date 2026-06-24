// Zod schemas for the documentos mutation payloads, enforced at the route
// boundary. `payload`/`conteudo`/`valores` are free-form JSON (editor data) —
// size-guarded by the mutation layer.
import { z } from "zod"
import { idOpt } from "@/lib/validation"

export const documentoCreateSchema = z.object({
  nome: z.string().min(1).max(300),
  template: z.string().min(1).max(80),
  formato: z.string().max(10).nullish(),
  status: z.string().max(20).optional(),
  payload: z.unknown().optional(),
  conteudo: z.unknown().optional(), // LexDoc JSON (rich-text body)
  valores: z.record(z.string(), z.string()).optional(), // placeholder values
  templateId: idOpt,
  timbradoId: idOpt,
  clienteId: idOpt,
  casoId: idOpt,
})

export const documentoPatchSchema = documentoCreateSchema.partial().omit({ template: true })

// ── flexible templates + letterheads (Fase 1) ─────────────────────────────────

/** One declared merge-field of a template (mirrors PlaceholderDecl). */
export const placeholderDeclSchema = z.object({
  name: z.string().min(1).max(80),
  dataType: z.string().max(20).optional(),
  label: z.string().max(160).optional(),
  defaultValue: z.string().max(2000).optional(),
})

export const templateCreateSchema = z.object({
  nome: z.string().min(1).max(200),
  categoria: z.string().max(40).optional(),
  descricao: z.string().max(2000).nullish(),
  conteudo: z.unknown().optional(), // LexDoc JSON
  placeholders: z.array(placeholderDeclSchema).max(200).optional(),
  tipoEstruturado: z.string().max(80).nullish(),
  timbradoId: idOpt,
  icone: z.string().max(40).nullish(),
  destaque: z.boolean().optional(),
  ativo: z.boolean().optional(),
})

export const templatePatchSchema = templateCreateSchema.partial()

export const timbradoCreateSchema = z.object({
  nome: z.string().min(1).max(200),
  // data URL: "data:image/png;base64,…" — full size guard lives in the mutation.
  imagem: z.string().min(16).regex(/^data:image\/(png|jpe?g);base64,/, "imagem deve ser um data URL PNG/JPEG"),
  mimeType: z.string().max(40).nullish(),
  margemTop: z.number().int().min(0).max(120).optional(),
  margemRight: z.number().int().min(0).max(120).optional(),
  margemBottom: z.number().int().min(0).max(120).optional(),
  margemLeft: z.number().int().min(0).max(120).optional(),
  padrao: z.boolean().optional(),
})

export const timbradoPatchSchema = timbradoCreateSchema.partial()
