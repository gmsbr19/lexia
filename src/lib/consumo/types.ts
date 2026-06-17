// Types for the "Consumo (API)" settings tab — real Anthropic API spend pulled
// from the Admin Cost API plus a manual monthly budget. Pure module (no server
// imports) so the client settings UI and the crm-api wrappers can import it.

export type ConsumoPeriodo = "mes" | "30d" | "mes_passado"

/** A labelled USD cost line (by model or by cost type). */
export interface ConsumoLinha {
  rotulo: string
  usd: number
}

/** USD cost for one calendar day (drives the trend chart). */
export interface ConsumoDia {
  dia: string // YYYY-MM-DD (UTC)
  usd: number
}

/** Manual budget — Anthropic does not expose a remaining-credit endpoint, so the
 * user enters their own monthly limit; `brlRate` is an optional USD→BRL display rate.
 * `autoDowngrade` + `limiarPct` drive the budget guard (rebaixa Opus→Sonnet quando o
 * gasto interno do mês passa de `limiarPct`% do teto). */
export interface ConsumoOrcamento {
  orcamentoUsd: number | null
  brlRate: number | null
  autoDowngrade: boolean
  limiarPct: number // % do teto que dispara o downgrade (50–100, padrão 90)
}

/** Real-time internal usage (LexiaUso ledger) — what was actually spent NOW, with
 * a per-feature breakdown, priced locally. No billing lag (unlike the Cost API). */
export interface ConsumoInterno {
  inicioISO: string
  fimISO: string
  totalUsd: number
  porModelo: ConsumoLinha[]
  porRecurso: ConsumoLinha[]
  porDia: ConsumoDia[]
  chamadas: number
  atualizadoISO: string
}

export interface ConsumoData {
  conectado: boolean // Admin key present AND the report loaded
  periodo: ConsumoPeriodo
  inicioISO: string
  fimISO: string
  totalUsd: number
  moeda: "USD"
  porModelo: ConsumoLinha[]
  porDia: ConsumoDia[]
  porTipo: ConsumoLinha[]
  orcamento: ConsumoOrcamento
  atualizadoISO: string
  aviso?: string // friendly note when not connected / on error
}

// ── raw Anthropic Cost API shapes (GET /v1/organizations/cost_report) ─────────
// amount is a decimal string in *cents* USD: "123.45" == $1.2345.
export interface CostResult {
  amount: string
  currency: string
  cost_type: string | null
  description: string | null
  model: string | null
  token_type: string | null
  context_window: string | null
  service_tier: string | null
  inference_geo?: string | null
  workspace_id: string | null
}

export interface CostBucket {
  starting_at: string
  ending_at: string
  results: CostResult[]
}

export interface CostReportResponse {
  data: CostBucket[]
  has_more: boolean
  next_page: string | null
}
