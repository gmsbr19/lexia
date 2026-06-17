// Pure aggregation of the Anthropic Cost API buckets into the shape the UI needs.
// No I/O, no env — unit-tested in tests/consumo.test.ts.
import type { CostBucket, ConsumoDia, ConsumoLinha } from "./types"

/** Human label for a cost_type (used for non-token cost lines and the per-tipo split). */
export function rotuloTipo(t: string | null): string {
  switch (t) {
    case "web_search":
      return "Busca na web"
    case "code_execution":
      return "Execução de código"
    case "session_usage":
      return "Sessões"
    default:
      return "Tokens"
  }
}

export interface AgregadoCusto {
  totalUsd: number
  porModelo: ConsumoLinha[]
  porDia: ConsumoDia[]
  porTipo: ConsumoLinha[]
}

/**
 * Sum cost buckets into total / per-model / per-day / per-type USD.
 * Only buckets whose start falls in [inicioMs, fimMs) are counted (the API window
 * is padded a couple of days so edge buckets are returned — we filter here).
 * `amount` is cents USD, so we divide by 100.
 */
export function aggregarCusto(buckets: CostBucket[], inicioMs: number, fimMs: number): AgregadoCusto {
  let total = 0
  const porModelo = new Map<string, number>()
  const porDia = new Map<string, number>()
  const porTipo = new Map<string, number>()

  for (const b of buckets) {
    const t = Date.parse(b.starting_at)
    if (Number.isNaN(t) || t < inicioMs || t >= fimMs) continue
    const dia = b.starting_at.slice(0, 10)
    for (const r of b.results ?? []) {
      const usd = Number(r.amount) / 100
      if (!Number.isFinite(usd) || usd === 0) continue
      total += usd
      const modelo = r.model ?? rotuloTipo(r.cost_type)
      porModelo.set(modelo, (porModelo.get(modelo) ?? 0) + usd)
      porDia.set(dia, (porDia.get(dia) ?? 0) + usd)
      const tipo = rotuloTipo(r.cost_type)
      porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + usd)
    }
  }

  const linhas = (m: Map<string, number>): ConsumoLinha[] =>
    [...m.entries()].map(([rotulo, usd]) => ({ rotulo, usd })).sort((a, b) => b.usd - a.usd)
  const dias: ConsumoDia[] = [...porDia.entries()]
    .map(([dia, usd]) => ({ dia, usd }))
    .sort((a, b) => a.dia.localeCompare(b.dia))

  return { totalUsd: total, porModelo: linhas(porModelo), porDia: dias, porTipo: linhas(porTipo) }
}
