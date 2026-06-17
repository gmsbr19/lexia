// Zod schemas for the Processos module — transcriptions of the *Create/*Patch
// interfaces in ./mutations.ts, enforced at the route boundary (parseBody →
// UserError → clean PT-BR 400). Enum-ish fields stay loose strings (the mutation
// coercers clamp them); CNJ/CPF/CNPJ get check-digit refinements.
import { z } from "zod"
import { dateStr, idOpt, idReq, money } from "@/lib/validation"
import { validarCnj, validarCpfCnpj } from "./validacao"

const cnjOpt = z
  .string()
  .max(40)
  .nullish()
  .refine((v) => !v || validarCnj(v), "Número CNJ inválido (verifique o dígito verificador)")

const docOpt = z
  .string()
  .max(20)
  .nullish()
  .refine((v) => !v || validarCpfCnpj(v), "CPF/CNPJ inválido")

// ── Processo ─────────────────────────────────────────────────────────────────
export const processoCreateSchema = z.object({
  casoId: idReq,
  numeroCnj: cnjOpt,
  classe: z.string().max(200).nullish(),
  assunto: z.string().max(300).nullish(),
  valorCausaCents: money.optional(),
  faseAtual: z.string().max(40).nullish(),
  instancia: z.string().max(20).nullish(),
  status: z.string().max(20).optional(),
  vara: z.string().max(200).nullish(),
  comarca: z.string().max(200).nullish(),
  tribunal: z.string().max(40).nullish(),
  uf: z.string().max(2).nullish(),
  sistema: z.string().max(20).nullish(),
  segredoJustica: z.boolean().optional(),
  dataDistribuicao: dateStr.nullish(),
  responsavelUserId: idOpt,
  // AI-first integration: structure parties extracted on identification (triagem)
  // and the caso's client (set only when the caso has none).
  clienteId: idOpt,
  partes: z
    .array(
      z.object({
        nome: z.string().min(1).max(300),
        papel: z.string().min(1).max(20),
        polo: z.string().min(1).max(10),
        documento: docOpt,
        clienteId: idOpt,
        ehCliente: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
})
export const processoPatchSchema = processoCreateSchema.partial().omit({ casoId: true, partes: true, clienteId: true })

// ── Parte (creates/links a party to the processo from /processos/[id]/partes) ──
export const parteCreateSchema = z.object({
  parteId: idOpt, // link an existing Parte; otherwise a new one is created
  nome: z.string().max(300).optional(),
  tipo: z.string().max(4).optional(),
  documento: docOpt,
  clienteId: idOpt,
  papel: z.string().min(1).max(20),
  polo: z.string().min(1).max(10),
  ehCliente: z.boolean().optional(),
})
export const partePatchSchema = z.object({
  papel: z.string().max(20).optional(),
  polo: z.string().max(10).optional(),
  ehCliente: z.boolean().optional(),
  nome: z.string().max(300).optional(),
  documento: docOpt,
})

// ── Andamento ────────────────────────────────────────────────────────────────
export const andamentoCreateSchema = z.object({
  data: dateStr,
  tipo: z.string().max(120).nullish(),
  descricao: z.string().min(1).max(8000),
  fonte: z.string().max(20).optional(),
  relevante: z.boolean().optional(),
  externalId: z.string().max(120).nullish(),
})
export const andamentoPatchSchema = andamentoCreateSchema.partial()

// ── Publicação (manual create + triagem) ───────────────────────────────────────
export const publicacaoCreateSchema = z.object({
  processoId: idOpt,
  dataDisponibilizacao: dateStr.nullish(),
  dataPublicacao: dateStr.nullish(),
  diario: z.string().max(200).nullish(),
  conteudo: z.string().min(1).max(20000),
  numeroProcessoBruto: z.string().max(40).nullish(),
  oabBruto: z.string().max(40).nullish(),
  externalId: z.string().max(120).nullish(),
})

// Prazo parameters shared by manual create, andamento→prazo and triagem→prazo.
const prazoParamsBase = {
  descricao: z.string().min(1).max(300),
  tipo: z.string().max(120).nullish(),
  quantidadeDias: z.number().int().positive().max(3650),
  tipoContagem: z.string().max(20).optional(),
  jurisdicao: z.string().max(40).nullish(),
  diasMargem: z.number().int().min(0).max(60).optional(),
  responsavelUserId: idOpt,
}

export const triagemSchema = z.object({
  acao: z.enum(["relevante", "descartar"]),
  prazo: z.object(prazoParamsBase).optional(), // required by the mutation when acao = relevante
  criarEvento: z.boolean().optional(),
})

export const gerarPrazoAndamentoSchema = z.object({
  ...prazoParamsBase,
  usarDataDoAndamento: z.boolean().optional(), // treat the andamento.data as a publicação → derive início
  criarEvento: z.boolean().optional(),
})

// ── Prazo (manual) ─────────────────────────────────────────────────────────────
export const prazoCreateSchema = z
  .object({
    ...prazoParamsBase,
    origem: z.string().max(20).optional(),
    dataInicio: dateStr.optional(), // início explícito (sem hops; só protraído ao 1º dia útil)
    dataPublicacao: dateStr.optional(), // data da PUBLICAÇÃO conhecida → 1 hop
    dataDisponibilizacao: dateStr.optional(), // disponibilização no DJe → 2 hops (art. 224 §§2-3)
    criarEvento: z.boolean().optional(),
  })
  .refine((v) => !!v.dataInicio || !!v.dataPublicacao || !!v.dataDisponibilizacao, {
    message: "Informe a data de início, de publicação ou de disponibilização",
    path: ["dataInicio"],
  })

export const prazoPatchSchema = z.object({
  descricao: z.string().min(1).max(300).optional(),
  tipo: z.string().max(120).nullish(),
  quantidadeDias: z.number().int().positive().max(3650).optional(),
  tipoContagem: z.string().max(20).optional(),
  jurisdicao: z.string().max(40).nullish(),
  diasMargem: z.number().int().min(0).max(60).optional(),
  dataInicio: dateStr.optional(),
  dataPublicacao: dateStr.nullish(),
  responsavelUserId: idOpt,
  status: z.string().max(20).optional(),
})

export const prazoPreviewSchema = z
  .object({
    quantidadeDias: z.number().int().positive().max(3650),
    tipoContagem: z.string().max(20).optional(),
    jurisdicao: z.string().max(40).nullish(),
    diasMargem: z.number().int().min(0).max(60).optional(),
    dataInicio: dateStr.optional(),
    dataPublicacao: dateStr.optional(), // publicação conhecida → 1 hop
    dataDisponibilizacao: dateStr.optional(), // disponibilização DJe → 2 hops
  })
  .refine((v) => !!v.dataInicio || !!v.dataPublicacao || !!v.dataDisponibilizacao, {
    message: "Informe a data de início, de publicação ou de disponibilização",
    path: ["dataInicio"],
  })

export const cumprirPrazoSchema = z.object({ data: dateStr.optional() })

// ── Anotação ─────────────────────────────────────────────────────────────────
export const anotacaoCreateSchema = z
  .object({
    conteudo: z.string().min(1).max(20000),
    interno: z.boolean().optional(),
    casoId: idOpt,
    processoId: idOpt,
  })
  .refine((v) => !!v.casoId || !!v.processoId, {
    message: "Anotação deve pertencer a um caso ou processo",
    path: ["casoId"],
  })

// (Caso create/patch schemas live in src/lib/casos/schemas.ts — the casos namespace.)

// ── Feriado / Suspensão (config) ───────────────────────────────────────────────
export const feriadoCreateSchema = z.object({
  data: dateStr,
  descricao: z.string().min(1).max(200),
  abrangencia: z.string().max(20).optional(),
  uf: z.string().max(2).nullish(),
  tribunal: z.string().max(40).nullish(),
})
export const suspensaoCreateSchema = z
  .object({
    de: dateStr,
    ate: dateStr,
    descricao: z.string().min(1).max(200),
    jurisdicao: z.string().max(40).nullish(),
  })
  .refine((v) => v.de <= v.ate, { message: "Início deve ser anterior ao fim", path: ["ate"] })

// ── Documento (versão) ─────────────────────────────────────────────────────────
export const documentoVersaoCreateSchema = z.object({
  nome: z.string().max(300).nullish(),
  formato: z.string().max(40).nullish(),
  payload: z.unknown().optional(),
  dataBase64: z.string().optional(), // raw file bytes (base64, no data-URL prefix)
  mimeType: z.string().max(120).nullish(),
})

// ── Ingestion port (manual adapter) ────────────────────────────────────────────
export const andamentoExternoSchema = z.object({
  numeroCnj: z.string().max(40).nullish(),
  oab: z.string().max(40).nullish(),
  data: dateStr,
  tipo: z.string().max(120).nullish(),
  descricao: z.string().min(1).max(8000),
  fonte: z.string().max(20).optional(),
  relevante: z.boolean().optional(),
  externalId: z.string().max(120).nullish(),
})
export const publicacaoExternaSchema = z.object({
  numeroCnj: z.string().max(40).nullish(),
  oab: z.string().max(40).nullish(),
  dataDisponibilizacao: dateStr.nullish(),
  dataPublicacao: dateStr.nullish(),
  diario: z.string().max(200).nullish(),
  conteudo: z.string().min(1).max(20000),
  externalId: z.string().max(120).nullish(),
})
export const ingestaoSchema = z
  .object({
    andamentos: z.array(andamentoExternoSchema).max(500).optional(),
    publicacoes: z.array(publicacaoExternaSchema).max(500).optional(),
  })
  .refine((v) => (v.andamentos?.length ?? 0) + (v.publicacoes?.length ?? 0) > 0, {
    message: "Envie ao menos um andamento ou publicação",
  })

// ── Captura CNJ (OAB monitorada + gatilho manual) ──────────────────────────────
export const oabCreateSchema = z.object({
  numero: z.string().min(1).max(20),
  uf: z.string().length(2),
  advogadoNome: z.string().max(200).nullish(),
  ativo: z.boolean().optional(),
})
export const oabPatchSchema = z.object({
  advogadoNome: z.string().max(200).nullish(),
  ativo: z.boolean().optional(),
})
export const capturaRunSchema = z.object({
  fonte: z.enum(["comunica", "datajud", "ambas"]).optional(),
  dryRun: z.boolean().optional(),
  desde: dateStr.optional(), // backfill (intimações)
})

export const vincularPublicacaoSchema = z.object({ processoId: idReq })
