// Real-time internal usage aggregation from the LexiaUso ledger — no external
// API, no billing lag, broken down by feature (recurso). Powers the "Consumo em
// tempo real" panel and the monthly budget guard. SERVER ONLY.
import { prisma } from "@/lib/db"
import { custoUsd } from "./pricing"
import type { ConsumoDia, ConsumoInterno, ConsumoLinha, ConsumoPeriodo } from "./types"

const DAY = 86_400_000

/** [inicio, fim) UTC window for a period — mirrors lib/consumo/queries `range`. */
function range(periodo: ConsumoPeriodo, now: Date): { inicio: Date; fim: Date } {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const startOfDay = new Date(Date.UTC(y, m, now.getUTCDate()))
  if (periodo === "30d") {
    return { inicio: new Date(startOfDay.getTime() - 29 * DAY), fim: new Date(startOfDay.getTime() + DAY) }
  }
  if (periodo === "mes_passado") {
    return { inicio: new Date(Date.UTC(y, m - 1, 1)), fim: new Date(Date.UTC(y, m, 1)) }
  }
  return { inicio: new Date(Date.UTC(y, m, 1)), fim: new Date(startOfDay.getTime() + DAY) }
}

// Human labels for the per-feature breakdown.
const ROTULO_RECURSO: Record<string, string> = {
  chat: "Chat LexIA",
  briefing: "Briefing diário",
  triagem: "Triagem de movimentos",
  resumo: "Resumo de processo",
  vinculo: "Vínculo de publicação",
  criterios: "Critérios de tarefa",
  "doc-suggest": "Editor de documentos",
  ramble: "Ramble (ditado de tarefas)",
}

/** Aggregate the ledger for a period into total + per-model + per-feature + per-day USD. */
export async function getUsoInterno(periodo: ConsumoPeriodo, now = new Date()): Promise<ConsumoInterno> {
  const { inicio, fim } = range(periodo, now)
  const rows = await prisma.lexiaUso.findMany({
    where: { criadoEm: { gte: inicio, lt: fim } },
    select: {
      criadoEm: true,
      modelo: true,
      recurso: true,
      inputTokens: true,
      cacheWriteTokens: true,
      cacheReadTokens: true,
      outputTokens: true,
    },
  })

  const porModelo = new Map<string, number>()
  const porRecurso = new Map<string, number>()
  const porDia = new Map<string, number>()
  let total = 0
  for (const r of rows) {
    const usd = custoUsd(r.modelo, r)
    total += usd
    porModelo.set(r.modelo, (porModelo.get(r.modelo) ?? 0) + usd)
    const rot = ROTULO_RECURSO[r.recurso] ?? r.recurso
    porRecurso.set(rot, (porRecurso.get(rot) ?? 0) + usd)
    const dia = r.criadoEm.toISOString().slice(0, 10)
    porDia.set(dia, (porDia.get(dia) ?? 0) + usd)
  }

  const linhas = (mp: Map<string, number>): ConsumoLinha[] =>
    [...mp.entries()].map(([rotulo, usd]) => ({ rotulo, usd })).sort((a, b) => b.usd - a.usd)
  const dias: ConsumoDia[] = [...porDia.entries()]
    .map(([dia, usd]) => ({ dia, usd }))
    .sort((a, b) => a.dia.localeCompare(b.dia))

  return {
    inicioISO: inicio.toISOString(),
    fimISO: fim.toISOString(),
    totalUsd: total,
    porModelo: linhas(porModelo),
    porRecurso: linhas(porRecurso),
    porDia: dias,
    chamadas: rows.length,
    atualizadoISO: now.toISOString(),
  }
}

// Cheap current-month spend for the budget guard, cached ~60s in-process.
let cacheMes: { at: number; usd: number } | null = null
const TTL_MES = 60_000

/** Current calendar-month USD spend (internal ledger). Cached ~60s. */
export async function getGastoMesAtual(now = new Date()): Promise<number> {
  const t = now.getTime()
  if (cacheMes && t - cacheMes.at < TTL_MES) return cacheMes.usd
  const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const rows = await prisma.lexiaUso.findMany({
    where: { criadoEm: { gte: inicio } },
    select: { modelo: true, inputTokens: true, cacheWriteTokens: true, cacheReadTokens: true, outputTokens: true },
  })
  let usd = 0
  for (const r of rows) usd += custoUsd(r.modelo, r)
  cacheMes = { at: t, usd }
  return usd
}

/** Drop the cached month total — call after recording so the guard sees fresh spend. */
export function invalidarGastoMes(): void {
  cacheMes = null
}
