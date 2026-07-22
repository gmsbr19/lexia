// App settings (AppSetting key-value store, JSON values) + the read models for
// the Configurações modal sections "Escritório & documentos" and "Importação".
// SERVER ONLY.
import { z } from "zod"
import { DEFAULT_FOLLOWUP_CONFIG, DEFAULT_SCORING_CONFIG, SINAIS_RESULTADO } from "@/lib/comercial/score"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { getImportSummary } from "@/lib/finance/queries"
import type { ImportSummary } from "@/lib/finance/types"

// ── generic key-value helpers ─────────────────────────────────────────────────
export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } })
  if (!row) return null
  try {
    return JSON.parse(row.value) as T
  } catch {
    return null
  }
}

export async function setSetting(key: string, value: unknown): Promise<{ key: string }> {
  const json = JSON.stringify(value ?? null)
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: json },
    create: { key, value: json },
  })
  return { key }
}

// ── escritório (office data used by generated documents) ─────────────────────
export const escritorioSchema = z.object({
  razaoSocial: z.string().max(300).optional(),
  cnpj: z.string().max(30).optional(),
  oab: z.string().max(60).optional(),
  endereco: z.string().max(400).optional(),
  telefone: z.string().max(60).optional(),
  email: z.string().max(200).optional(),
  bancoInfo: z.string().max(600).optional(), // dados bancários printed on contracts
})

export type EscritorioConfig = z.infer<typeof escritorioSchema>

const ESCRITORIO_KEY = "escritorio"

/** Stored office config; `bancoInfo` falls back to the legacy CONTRATO_BANK_INFO env. */
export async function getEscritorio(): Promise<EscritorioConfig> {
  const stored = (await getSetting<EscritorioConfig>(ESCRITORIO_KEY)) ?? {}
  if (!stored.bancoInfo && process.env.CONTRATO_BANK_INFO) {
    return { ...stored, bancoInfo: process.env.CONTRATO_BANK_INFO }
  }
  return stored
}

export async function setEscritorio(cfg: EscritorioConfig): Promise<{ key: string }> {
  return setSetting(ESCRITORIO_KEY, cfg)
}

// ── módulos (temporary admin kill-switches) ───────────────────────────────────
export const modulosSchema = z.object({
  processos: z.boolean().optional(), // absent/true = enabled; false = disabled
})

export type ModulosConfig = z.infer<typeof modulosSchema>

const MODULOS_KEY = "modulos"

export async function getModulosConfig(): Promise<ModulosConfig> {
  return (await getSetting<ModulosConfig>(MODULOS_KEY)) ?? {}
}

export async function setModulosConfig(cfg: ModulosConfig): Promise<{ key: string }> {
  return setSetting(MODULOS_KEY, cfg)
}

export function processosHabilitado(cfg: ModulosConfig): boolean {
  return cfg.processos !== false
}

// ── notificações (regras do escritório, definidas pelo admin) ────────────────
export const notificacoesSchema = z
  .object({
    // absent/true = sócios avisados de toda tarefa concluída; false = só o criador
    tarefaConcluidaGestores: z.boolean().optional(),
  })
  .strict()

export type NotificacoesConfig = z.infer<typeof notificacoesSchema>

const NOTIFICACOES_KEY = "notificacoes"

export async function getNotificacoesConfig(): Promise<NotificacoesConfig> {
  return (await getSetting<NotificacoesConfig>(NOTIFICACOES_KEY)) ?? {}
}

export async function setNotificacoesConfig(cfg: NotificacoesConfig): Promise<{ key: string }> {
  return setSetting(NOTIFICACOES_KEY, cfg)
}

export function avisarGestoresConclusao(cfg: NotificacoesConfig): boolean {
  return cfg.tarefaConcluidaGestores !== false
}

// ── comercial · pipeline configurável (etapas ABERTAS; 'ganho'/'perdido' são
// terminais fixos definidos em código — carregam dataConversao/valorContratado/
// notificação — e NUNCA entram nesta lista) ───────────────────────────────────
const RESERVED_ETAPAS = new Set(["ganho", "perdido"])

const pipelineStageSchema = z.object({
  key: z.string().min(1).max(40),
  nome: z.string().min(1).max(60),
  cor: z.string().max(9).nullish(),
  ordem: z.number().int(),
  // Probabilidade de fechamento (0–100%) desta etapa — pondera o forecast do
  // funil (valor estimado × probabilidade). Opcional/aditivo: ausente = 0%.
  probabilidade: z.number().int().min(0).max(100).nullish(),
})
export const pipelineSchema = z.object({ stages: z.array(pipelineStageSchema).max(20) }).strict()
export type PipelineStage = z.infer<typeof pipelineStageSchema>
export type PipelineConfig = z.infer<typeof pipelineSchema>

// Mirrors the 4 stage keys the app has always shipped with (src/components/comercial/cm-meta.ts CM_STAGES)
// so an absent AppSetting is indistinguishable from "using the defaults" — no data migration needed.
export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { key: "novo", nome: "Novo", cor: "#7C8AA5", ordem: 0, probabilidade: 10 },
  { key: "contato", nome: "Contato", cor: "#4A78C0", ordem: 1, probabilidade: 25 },
  { key: "qualificado", nome: "Qualificado", cor: "#C0A147", ordem: 2, probabilidade: 50 },
  { key: "proposta", nome: "Proposta", cor: "#9A6FB0", ordem: 3, probabilidade: 75 },
]

const PIPELINE_KEY = "comercial.pipeline"

export async function getPipelineConfig(): Promise<PipelineConfig> {
  const stored = await getSetting<PipelineConfig>(PIPELINE_KEY)
  const stages = stored?.stages?.length ? stored.stages : DEFAULT_PIPELINE_STAGES
  return { stages: [...stages].sort((a, b) => a.ordem - b.ordem) }
}

export async function setPipelineConfig(cfg: PipelineConfig): Promise<{ key: string }> {
  const keys = new Set<string>()
  for (const s of cfg.stages) {
    if (RESERVED_ETAPAS.has(s.key)) throw new UserError(`"${s.key}" é uma etapa reservada — não pode ser reutilizada`)
    if (keys.has(s.key)) throw new UserError(`Etapa duplicada: "${s.key}"`)
    keys.add(s.key)
  }
  if (cfg.stages.length === 0) throw new UserError("O pipeline precisa de ao menos uma etapa")
  return setSetting(PIPELINE_KEY, cfg)
}

// ── comercial · motivos de perda (taxonomia estruturada) ──────────────────────
const motivoPerdaSchema = z.object({ key: z.string().min(1).max(40), nome: z.string().min(1).max(80) })
export const motivosPerdaSchema = z.object({ motivos: z.array(motivoPerdaSchema).max(30) }).strict()
export type MotivoPerda = z.infer<typeof motivoPerdaSchema>
export type MotivosPerdaConfig = z.infer<typeof motivosPerdaSchema>

// Mirrors the free-text list the app has always shipped with (cm-meta.ts MOTIVOS).
export const DEFAULT_MOTIVOS_PERDA: MotivoPerda[] = [
  { key: "preco", nome: "Preço / honorários" },
  { key: "sem_retorno", nome: "Sem retorno do contato" },
  { key: "concorrente", nome: "Escolheu concorrente" },
  { key: "fora_area", nome: "Fora da área de atuação" },
  { key: "sem_orcamento", nome: "Sem orçamento no momento" },
  { key: "inviavel", nome: "Caso inviável" },
  { key: "desinteresse", nome: "Desinteresse (sem avanço)" },
]

const MOTIVOS_PERDA_KEY = "comercial.motivosPerda"

export async function getMotivosPerdaConfig(): Promise<MotivosPerdaConfig> {
  const stored = await getSetting<MotivosPerdaConfig>(MOTIVOS_PERDA_KEY)
  return stored?.motivos?.length ? stored : { motivos: DEFAULT_MOTIVOS_PERDA }
}

export async function setMotivosPerdaConfig(cfg: MotivosPerdaConfig): Promise<{ key: string }> {
  return setSetting(MOTIVOS_PERDA_KEY, cfg)
}

// ── comercial · score de leads configurável (Fit/Perfil 0-100 + Engajamento
// 0-100). Fit soma pontos de critérios de perfil (área/origem + 5 critérios
// genéricos); Engajamento acumula pontos de "sinais" registrados em cada
// atividade (ver src/lib/comercial/score.ts, o núcleo puro que consome esta
// config) ──────────────────────────────────────────────────────────────────
const opcaoScoreSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  pontos: z.number().int().min(-100).max(100),
})
export type OpcaoScore = z.infer<typeof opcaoScoreSchema>

const CRITERIO_FIT_KEYS = [
  "potencialFinanceiro",
  "urgenciaNivel",
  "poderDecisao",
  "jurisdicao",
  "viabilidade",
] as const
export type CriterioFitKey = (typeof CRITERIO_FIT_KEYS)[number]

const criterioFitSchema = z.object({
  key: z.enum(CRITERIO_FIT_KEYS),
  label: z.string().min(1).max(80),
  opcoes: z.array(opcaoScoreSchema).min(1).max(10),
})
export type CriterioFit = z.infer<typeof criterioFitSchema>

const areaJuridicaScoreSchema = z.object({
  principais: z.array(z.string().max(60)).max(30),
  secundarias: z.array(z.string().max(60)).max(30),
  pontosPrincipal: z.number().int().min(0).max(100),
  pontosSecundaria: z.number().int().min(0).max(100),
  pontosFora: z.number().int().min(0).max(100),
})
export type AreaJuridicaScore = z.infer<typeof areaJuridicaScoreSchema>

export const scoringSchema = z
  .object({
    areaJuridica: areaJuridicaScoreSchema,
    origem: z.array(opcaoScoreSchema).max(10),
    criterios: z.array(criterioFitSchema).max(5),
    sinais: z.array(opcaoScoreSchema).max(30),
    limiares: z.object({
      fitQualificado: z.number().int().min(0).max(100),
      engajamentoQuente: z.number().int().min(0).max(100),
    }),
  })
  .strict()
export type ScoringConfig = z.infer<typeof scoringSchema>

// Reexportado (valor já importado acima de score.ts) para não quebrar os
// chamadores existentes de "@/lib/settings" (ex.: tests/comercial-score.test.ts).
export { DEFAULT_SCORING_CONFIG }

const SCORING_KEY = "comercial.scoring"

export async function getScoringConfig(): Promise<ScoringConfig> {
  return (await getSetting<ScoringConfig>(SCORING_KEY)) ?? DEFAULT_SCORING_CONFIG
}

export async function setScoringConfig(cfg: ScoringConfig): Promise<{ key: string }> {
  for (const key of CRITERIO_FIT_KEYS) {
    const count = cfg.criterios.filter((c) => c.key === key).length
    if (count !== 1) throw new UserError(`O critério "${key}" precisa aparecer exatamente uma vez`)
  }
  for (const c of cfg.criterios) {
    const seen = new Set<string>()
    for (const o of c.opcoes) {
      if (seen.has(o.key)) throw new UserError(`Opção duplicada em "${c.label}": "${o.key}"`)
      seen.add(o.key)
    }
  }
  const origemKeys = new Set<string>()
  for (const o of cfg.origem) {
    if (origemKeys.has(o.key)) throw new UserError(`Origem duplicada: "${o.key}"`)
    origemKeys.add(o.key)
  }
  const sinalKeys = new Set(cfg.sinais.map((s) => s.key))
  for (const reservado of SINAIS_RESULTADO) {
    if (!sinalKeys.has(reservado)) throw new UserError(`O sinal reservado "${reservado}" é obrigatório`)
  }
  return setSetting(SCORING_KEY, cfg)
}

// ── comercial · follow-up (cadência progressiva, pesos de prioridade,
// horizonte da urgência temporal, regras automáticas de perda) ──────────────
const CANAIS_TOQUE = ["ligacao", "whatsapp", "email", "reuniao", "outro"] as const
export type CanalToque = (typeof CANAIS_TOQUE)[number]

const toqueCadenciaSchema = z.object({
  dia: z.number().int().min(0).max(365),
  canais: z.array(z.enum(CANAIS_TOQUE)).min(1).max(3),
  objetivo: z.string().max(120).nullish(),
})
export type ToqueCadencia = z.infer<typeof toqueCadenciaSchema>

export const followupSchema = z
  .object({
    cadencia: z.array(toqueCadenciaSchema).min(1).max(15),
    prioridade: z.object({
      pesoFit: z.number().int().min(0).max(100),
      pesoEng: z.number().int().min(0).max(100),
      pesoUrg: z.number().int().min(0).max(100),
    }),
    urgenciaHorizonteDias: z.number().int().min(1).max(30),
    regrasPerda: z.object({
      semRespostaConsecutivas: z.number().int().min(1).max(20),
      friasAcumuladas: z.number().int().min(1).max(20),
    }),
  })
  .strict()
export type FollowupConfig = z.infer<typeof followupSchema>

// Reexportado (valor já importado acima de score.ts) — ver nota em DEFAULT_SCORING_CONFIG.
export { DEFAULT_FOLLOWUP_CONFIG }

const FOLLOWUP_KEY = "comercial.followup"

export async function getFollowupConfig(): Promise<FollowupConfig> {
  return (await getSetting<FollowupConfig>(FOLLOWUP_KEY)) ?? DEFAULT_FOLLOWUP_CONFIG
}

export async function setFollowupConfig(cfg: FollowupConfig): Promise<{ key: string }> {
  const soma = cfg.prioridade.pesoFit + cfg.prioridade.pesoEng + cfg.prioridade.pesoUrg
  if (soma !== 100) throw new UserError(`Os pesos de prioridade devem somar 100 (soma atual: ${soma})`)
  return setSetting(FOLLOWUP_KEY, cfg)
}

// ── importação status (sourced from the audit trail) ─────────────────────────
export interface ImportacaoInfo {
  resumo: ImportSummary
  ultimaReimportacaoAstrea: string | null // ISO
  ultimaImportacaoLeads: string | null // ISO
}

export async function getImportacaoInfo(): Promise<ImportacaoInfo> {
  const [resumo, reimport, leads] = await Promise.all([
    getImportSummary(),
    prisma.auditLog.findFirst({ where: { action: "financeiro.reimport" }, orderBy: { ts: "desc" } }),
    prisma.auditLog.findFirst({ where: { action: "comercial.leads.importar" }, orderBy: { ts: "desc" } }),
  ])
  return {
    resumo,
    ultimaReimportacaoAstrea: reimport ? reimport.ts.toISOString() : null,
    ultimaImportacaoLeads: leads ? leads.ts.toISOString() : null,
  }
}
