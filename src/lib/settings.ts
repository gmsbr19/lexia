// App settings (AppSetting key-value store, JSON values) + the read models for
// the Configurações modal sections "Escritório & documentos" and "Importação".
// SERVER ONLY.
import { z } from "zod"
import { prisma } from "@/lib/db"
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
