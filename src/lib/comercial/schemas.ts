// Zod schemas for the comercial mutation payloads — transcriptions of the
// `*Create`/`*Patch` interfaces in ./mutations.ts, enforced at the route
// boundary (parseBody throws UserError → clean 400).
import { z } from "zod"
import { dateStr, idOpt, idReq, money, requestId } from "@/lib/validation"

const plataforma = z.enum(["google_ads", "meta_ads", "outro"])
const campanhaStatus = z.enum(["ativa", "pausada", "encerrada"])
const leadOrigem = z.enum(["google_ads", "meta_ads", "indicacao", "organico", "outro"])
// Etapas ABERTAS são configuráveis (ver settings.ts pipelineSchema) — 'etapa' no
// Lead é uma string livre; 'ganho'/'perdido' seguem literais fixos p/ o Zod
// aceitar qualquer chave aberta e ainda validar os 2 terminais.
const leadEtapa = z.string().min(1).max(40)
// Área/motivos usam z.string() em vez de enum — chaves configuráveis (AreaDireito / motivosPerda).
const areaKey = z.string().max(60)

export const campanhaCreateSchema = z.object({
  plataforma,
  nome: z.string().min(1).max(200),
  objetivo: z.string().max(300).nullish(),
  status: campanhaStatus.optional(),
  externalId: z.string().max(120).nullish(),
  dataInicio: dateStr.nullish(),
  dataFim: dateStr.nullish(),
  area: areaKey.nullish(),
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

// Chaves de opção do score de perfil (ver AppSetting "comercial.scoring") —
// livres (config-driven), como `areaKey`; null = "indefinido"/0 pontos no Fit.
const scoreCriterioKey = z.string().max(40)

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
  area: areaKey.nullish(),
  responsavelUserId: idOpt,
  proximaAcaoEm: dateStr.nullish(),
  proximaAcaoNota: z.string().max(2000).nullish(),
  temperatura: z.enum(["quente", "morno", "frio"]).nullish(),
  potencialFinanceiro: scoreCriterioKey.nullish(),
  urgenciaNivel: scoreCriterioKey.nullish(),
  poderDecisao: scoreCriterioKey.nullish(),
  jurisdicao: scoreCriterioKey.nullish(),
  viabilidade: scoreCriterioKey.nullish(),
  contratoEnviado: z.boolean().optional(),
})

export const leadPatchSchema = leadCreateSchema.omit({ etapa: true }).partial()

export const leadEtapaSchema = z.object({
  etapa: leadEtapa,
  motivo: z.string().max(500).nullish(),
  motivoCategoria: z.string().max(40).nullish(),
})

export const mesclarLeadSchema = z.object({
  clienteId: idReq,
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

// ── atividades (timeline manual da oportunidade) ──────────────────────────────
// `resultado` classifica o TOQUE p/ o score de engajamento + regras de perda
// automática (ver score.ts); notas avulsas (sem resultado) não entram nessas
// contagens. `sinais` = chaves de AppSetting "comercial.scoring".sinais
// marcadas manualmente (compareceu_reuniao, enviou_documentos etc.).
export const atividadeCreateSchema = z.object({
  tipo: z.enum(["ligacao", "email", "reuniao", "whatsapp", "nota", "outro"]),
  titulo: z.string().max(200).nullish(),
  descricao: z.string().max(4000).nullish(),
  resultado: z.enum(["sem_resposta", "fria", "positiva"]).nullish(),
  toqueNumero: z.number().int().min(1).max(50).nullish(),
  sinais: z.array(z.string().max(40)).max(10).optional(),
  ocorreuEm: dateStr.nullish(),
})

// ── lote (bulk edit de oportunidades) ──────────────────────────────────────────
export const leadsLoteSchema = z.object({
  ids: z.array(idReq).min(1).max(500),
  etapa: leadEtapa.optional(),
  responsavelUserId: idOpt,
  temperatura: z.enum(["quente", "morno", "frio"]).optional(),
  area: areaKey.nullish(),
  excluir: z.boolean().optional(),
})
