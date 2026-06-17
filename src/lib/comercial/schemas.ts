// Zod schemas for the comercial mutation payloads — transcriptions of the
// `*Create`/`*Patch` interfaces in ./mutations.ts, enforced at the route
// boundary (parseBody throws UserError → clean 400).
import { z } from "zod"
import { dateStr, idOpt, money, requestId } from "@/lib/validation"

const plataforma = z.enum(["google_ads", "meta_ads", "outro"])
const campanhaStatus = z.enum(["ativa", "pausada", "encerrada"])
const leadOrigem = z.enum(["google_ads", "meta_ads", "indicacao", "organico", "outro"])
const leadEtapa = z.enum(["novo", "contato", "qualificado", "proposta", "ganho", "perdido"])

export const campanhaCreateSchema = z.object({
  plataforma,
  nome: z.string().min(1).max(200),
  objetivo: z.string().max(300).nullish(),
  status: campanhaStatus.optional(),
  externalId: z.string().max(120).nullish(),
  dataInicio: dateStr.nullish(),
  dataFim: dateStr.nullish(),
})

export const campanhaPatchSchema = campanhaCreateSchema.partial().extend({
  ativo: z.boolean().optional(),
})

/** Ad spend (campanhaId comes from the URL). */
export const gastoSchema = z.object({
  valorCents: money,
  data: dateStr.nullish(),
  contaId: idOpt,
  descricao: z.string().max(300).nullish(),
  pago: z.boolean().optional(),
  requestId,
})

export const leadCreateSchema = z.object({
  nome: z.string().min(1).max(200),
  email: z.string().max(200).nullish(),
  telefone: z.string().max(40).nullish(),
  origem: leadOrigem.optional(),
  campanhaId: idOpt,
  etapa: leadEtapa.optional(),
  valorEstimadoCents: money.nullish(),
  dataEntrada: dateStr.nullish(),
  observacoes: z.string().max(2000).nullish(),
})

export const leadPatchSchema = leadCreateSchema.omit({ etapa: true }).partial()

export const leadEtapaSchema = z.object({
  etapa: leadEtapa,
  motivo: z.string().max(500).nullish(),
})

export const converterLeadSchema = z.object({
  clienteId: idOpt,
  casoId: idOpt,
  honorarioId: idOpt,
  valorContratadoCents: money.nullish(),
  tipoHonorario: z.string().max(60).nullish(),
  clienteNome: z.string().max(200).nullish(),
  casoTitulo: z.string().max(300).nullish(),
  dataConversao: dateStr.nullish(),
})
