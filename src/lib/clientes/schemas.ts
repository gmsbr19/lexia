// Zod schemas for the clientes mutation payloads, enforced at the route
// boundary. Enum-ish fields stay loose strings: the mutation coercers clamp.
import { z } from "zod"

const strList = z.array(z.string().max(200)).max(20)

export const clienteCreateSchema = z.object({
  nome: z.string().min(1).max(300),
  apelido: z.string().max(120).nullish(),
  tipo: z.string().max(10).optional(),
  classificacao: z.string().max(20).optional(),
  cpfCnpj: z.string().max(30).nullish(),
  simplesNacional: z.boolean().optional(),
  logradouro: z.string().max(300).nullish(),
  numero: z.string().max(30).nullish(),
  complemento: z.string().max(200).nullish(),
  bairro: z.string().max(120).nullish(),
  cidade: z.string().max(120).nullish(),
  uf: z.string().max(4).nullish(),
  cep: z.string().max(15).nullish(),
  emails: strList.optional(),
  telefones: strList.optional(),
})

export const clientePatchSchema = clienteCreateSchema.partial()

// ── Cobrança & anotações ──────────────────────────────────────────────────────
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD")

/** Free note (context the AI reads) OR a collection directive. */
export const anotacaoCreateSchema = z.object({
  conteudo: z.string().min(1, "a anotação não pode ficar vazia").max(2000),
  fixado: z.boolean().optional(),
})

/** Pause collection: N days (default 30) OR until an explicit date, with a reason. */
export const cobrancaPausarSchema = z.object({
  motivo: z.string().min(1, "explique o motivo da pausa").max(500),
  dias: z.number().int().min(1).max(3650).optional(),
  ate: isoDate.nullish(),
})

/** Stop chasing indefinitely ("não cobrar mais"). */
export const cobrancaSuspenderSchema = z.object({
  motivo: z.string().min(1, "explique o motivo").max(500),
})

/** Resume collection. */
export const cobrancaRetomarSchema = z.object({
  motivo: z.string().max(500).optional(),
})
