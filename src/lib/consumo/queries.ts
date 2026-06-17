// Read/write layer for the Consumo (API spend) tab. SERVER ONLY.
// Composes the Admin Cost API fetch + aggregation + the manual budget (AppSetting).
import { getSetting, setSetting } from "@/lib/settings"
import { UserError } from "@/lib/errors"
import { ADMIN_NOT_CONNECTED, adminKeyPresent, fetchCostReport } from "./admin"
import { aggregarCusto } from "./cost"
import type { ConsumoData, ConsumoOrcamento, ConsumoPeriodo } from "./types"

const ORC_KEY = "consumo_orcamento"

export async function getOrcamento(): Promise<ConsumoOrcamento> {
  const s = await getSetting<Partial<ConsumoOrcamento>>(ORC_KEY)
  return {
    orcamentoUsd: typeof s?.orcamentoUsd === "number" ? s.orcamentoUsd : null,
    brlRate: typeof s?.brlRate === "number" ? s.brlRate : null,
    autoDowngrade: s?.autoDowngrade === true,
    limiarPct: typeof s?.limiarPct === "number" ? s.limiarPct : 90,
  }
}

export async function setOrcamento(o: ConsumoOrcamento): Promise<{ key: string }> {
  return setSetting(ORC_KEY, {
    orcamentoUsd: o.orcamentoUsd,
    brlRate: o.brlRate,
    autoDowngrade: o.autoDowngrade,
    limiarPct: o.limiarPct,
  })
}

const DAY = 86_400_000
const startOfMonthUTC = (y: number, m: number) => new Date(Date.UTC(y, m, 1))
const startOfDayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

/** [inicio, fim) window for a period (UTC). `fim` is exclusive; today is included. */
function range(periodo: ConsumoPeriodo, now: Date): { inicio: Date; fim: Date } {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  if (periodo === "30d") {
    const today = startOfDayUTC(now)
    return { inicio: new Date(today.getTime() - 29 * DAY), fim: new Date(today.getTime() + DAY) }
  }
  if (periodo === "mes_passado") {
    return { inicio: startOfMonthUTC(y, m - 1), fim: startOfMonthUTC(y, m) }
  }
  // current month, up to and including today
  return { inicio: startOfMonthUTC(y, m), fim: new Date(startOfDayUTC(now).getTime() + DAY) }
}

/** Never throws — on missing key / API error it returns a disconnected shell with `aviso`,
 * so the tab can still render the budget editor and an explanation. */
export async function getConsumo(periodo: ConsumoPeriodo, force = false): Promise<ConsumoData> {
  const now = new Date()
  const orcamento = await getOrcamento()
  const { inicio, fim } = range(periodo, now)
  const base: ConsumoData = {
    conectado: false,
    periodo,
    inicioISO: inicio.toISOString(),
    fimISO: fim.toISOString(),
    totalUsd: 0,
    moeda: "USD",
    porModelo: [],
    porDia: [],
    porTipo: [],
    orcamento,
    atualizadoISO: now.toISOString(),
  }
  if (!adminKeyPresent()) return { ...base, aviso: ADMIN_NOT_CONNECTED }

  try {
    // Pad the API window so daily buckets at the edges are returned; aggregarCusto re-filters.
    const endingAt = new Date(fim.getTime() + 2 * DAY).toISOString()
    const buckets = await fetchCostReport({ startingAt: inicio.toISOString(), endingAt, force })
    const agg = aggregarCusto(buckets, inicio.getTime(), fim.getTime())
    return {
      ...base,
      conectado: true,
      totalUsd: agg.totalUsd,
      porModelo: agg.porModelo,
      porDia: agg.porDia,
      porTipo: agg.porTipo,
      atualizadoISO: new Date().toISOString(),
    }
  } catch (e) {
    return { ...base, aviso: e instanceof UserError ? e.message : "Não foi possível carregar o relatório de custo." }
  }
}
