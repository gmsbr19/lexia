// Zod schemas for the financeiro mutation payloads — transcriptions of the
// `*Create`/`*Patch` interfaces in ./mutations.ts, enforced at the route
// boundary (parseBody throws UserError → clean 400). Money is integer centavos
// (magnitude; the mutation layer signs it), dates are strings the mutation
// layer coerces.
import { z } from "zod"
import { dateStr, idOpt, idReq, money, requestId } from "@/lib/validation"

export const honorarioCreateSchema = z.object({
  descricao: z.string().min(1).max(500),
  valorCents: money,
  dataVencimento: dateStr.nullish(),
  tipo: z.string().max(40).nullish(),
  clienteId: idOpt,
  casoId: idOpt,
})

/** The "Novo lançamento" modal shape (create + edit + série). */
export const novoLancamentoSchema = z.object({
  dir: z.enum(["in", "out"]),
  desc: z.string().min(1).max(300),
  valorCents: money,
  venc: dateStr,
  cat: z.string().max(120).nullish(),
  party: z.string().max(200).nullish(),
  caso: z.string().max(300).nullish(),
  contaId: idOpt,
  clienteId: idOpt,
  tipoHonorario: z.enum(["recorrente", "parcelado", "exito", "avista"]).nullish(),
  valorLiquidoCents: money.optional(),
  pago: z.boolean().optional(),
  pagoData: dateStr.nullish(),
  modo: z.enum(["unica", "mensal", "parcelado"]).optional(),
  vezes: z.number().int().min(2).max(36).optional(),
  requestId,
})

export const pagarLancamentoSchema = z.object({
  dataPagamento: dateStr.nullish(),
  contaId: idOpt,
})

export const bulkLancamentosSchema = z.object({
  ids: z.array(idReq).min(1).max(500),
  action: z.enum(["pagar", "reabrir", "excluir"]),
})

export const contaCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  kind: z.enum(["socio", "banco", "caixa"]).optional(),
  titular: z.string().max(120).nullish(),
  valorInicialCents: z.number().int().optional(), // signed: opening balances may be negative
  tipo: z.string().max(60).nullish(),
})

export const contaPatchSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  titular: z.string().max(120).nullish(),
  kind: z.enum(["socio", "banco", "caixa"]).optional(),
  valorInicialCents: z.number().int().optional(),
  ordem: z.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
})

export const transferenciaCreateSchema = z.object({
  contaOrigemId: idReq,
  contaDestinoId: idReq,
  valorCents: money,
  dataMovimento: dateStr.nullish(),
  descricao: z.string().max(300).nullish(),
})

export const custoFixoCreateSchema = z.object({
  nome: z.string().min(1).max(200),
  valorCents: money,
  categoria: z.enum(["pro_labore", "operacional"]),
  diaVencimento: z.number().int().min(1).max(31).nullish(),
  contaId: idOpt,
  ativo: z.boolean().optional(),
})

export const custoFixoPatchSchema = custoFixoCreateSchema.partial()

export const casoResponsaveisSchema = z.object({
  responsaveis: z
    .array(
      z.object({
        contaId: idReq,
        percentual: z.number().min(0).max(100),
      }),
    )
    .max(10)
    .default([]),
})

// ── Contrato ─────────────────────────────────────────────────────────────────
export const contratoCreateSchema = z.object({
  clienteId: idOpt,
  titulo: z.string().max(200).nullish(),
  dataFechamento: dateStr,
  observacoes: z.string().max(2000).nullish(),
  casoIds: z.array(idReq).max(100).optional(),
})

export const contratoPatchSchema = z.object({
  clienteId: idOpt,
  titulo: z.string().max(200).nullish(),
  dataFechamento: dateStr.optional(),
  observacoes: z.string().max(2000).nullish(),
  vincularCasoIds: z.array(idReq).max(100).optional(),
  desvincularCasoIds: z.array(idReq).max(100).optional(),
})
