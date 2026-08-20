// AppSetting config do módulo de Captação — mesmo padrão de src/lib/settings.ts
// (getSetting/setSetting genéricos sobre AppSetting, um par get/set + schema
// zod por chave). SERVER ONLY.
//
// Não há mais config de conexão/OAuth/ações do Google aqui: o Google Ads LÊ um
// feed CSV (ver src/lib/captacao/feed.ts) autenticado por HTTP Basic Auth em
// variável de ambiente (nunca em AppSetting — texto claro no banco/backup) —
// o casamento é por NOME fixo da ação (src/lib/captacao/acoes.ts), não por id
// configurável. A janela de 90 dias é uma regra do Google, não uma escolha do
// escritório — está fixa em `feed.ts`, não é configurável aqui.
import { z } from "zod"
import { getSetting, setSetting } from "@/lib/settings"

const eventoCanonico = z.enum(["formulario_enviado", "lead_qualificado", "reuniao_realizada", "contrato_assinado"])

// ── captacao.funil — mapeamento etapa→evento + o que conta como reunião ────────
export const funilConfigSchema = z
  .object({
    etapasQualificado: z.array(z.string().max(40)).max(20).default([]),
    reuniao: z.object({
      tipos: z.array(z.string().max(40)).max(10).default(["reuniao"]),
      resultados: z.array(z.string().max(40)).max(10).default(["positiva"]),
    }),
  })
  .strict()
export type FunilConfig = z.infer<typeof funilConfigSchema>
export const DEFAULT_FUNIL_CONFIG: FunilConfig = {
  etapasQualificado: [],
  reuniao: { tipos: ["reuniao"], resultados: ["positiva"] },
}
const FUNIL_KEY = "captacao.funil"

export async function getFunilConfig(): Promise<FunilConfig> {
  return (await getSetting<FunilConfig>(FUNIL_KEY)) ?? DEFAULT_FUNIL_CONFIG
}
export async function setFunilConfig(cfg: FunilConfig): Promise<{ key: string }> {
  return setSetting(FUNIL_KEY, cfg)
}

/** Etapas mapeadas em `etapasQualificado` que NÃO existem mais no pipeline
 *  configurado — a tela mostra isso como aviso, nunca quebra. */
export function etapasOrfas(cfg: FunilConfig, etapasValidas: string[]): string[] {
  const validas = new Set(etapasValidas)
  return cfg.etapasQualificado.filter((e) => !validas.has(e))
}

// ── captacao.valores — regra de valor por evento ────────────────────────────────
const regraValorSchema = z.object({
  modo: z.enum(["fixo", "fit", "real"]).default("fixo"),
  fixoCents: z.number().int().min(0).nullish(),
  porArea: z.record(z.string(), z.number().int().min(0)).default({}),
  fitFaixas: z.array(z.object({ min: z.number().int().min(0).max(100), cents: z.number().int().min(0) })).max(10).default([]),
})
export const valoresConfigSchema = z
  .object({ porEvento: z.partialRecord(eventoCanonico, regraValorSchema).default({}) })
  .strict()
export type ValoresConfig = z.infer<typeof valoresConfigSchema>
export const DEFAULT_VALORES_CONFIG: ValoresConfig = { porEvento: {} }
const VALORES_KEY = "captacao.valores"

export async function getValoresConfig(): Promise<ValoresConfig> {
  return (await getSetting<ValoresConfig>(VALORES_KEY)) ?? DEFAULT_VALORES_CONFIG
}
export async function setValoresConfig(cfg: ValoresConfig): Promise<{ key: string }> {
  return setSetting(VALORES_KEY, cfg)
}

// ── captacao.alertas — limiar do "% sem clique" ──────────────────────────────────
export const alertasConfigSchema = z
  .object({
    semCliqueLimiarPct: z.number().int().min(1).max(100).default(30),
    janelaDias: z.number().int().min(1).max(90).default(7),
  })
  .strict()
export type AlertasConfig = z.infer<typeof alertasConfigSchema>
export const DEFAULT_ALERTAS_CONFIG: AlertasConfig = { semCliqueLimiarPct: 30, janelaDias: 7 }
const ALERTAS_KEY = "captacao.alertas"

export async function getAlertasConfig(): Promise<AlertasConfig> {
  return (await getSetting<AlertasConfig>(ALERTAS_KEY)) ?? DEFAULT_ALERTAS_CONFIG
}
export async function setAlertasConfig(cfg: AlertasConfig): Promise<{ key: string }> {
  return setSetting(ALERTAS_KEY, cfg)
}
