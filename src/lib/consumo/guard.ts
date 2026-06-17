// Budget guard — when the office's monthly internal spend nears the cap, downgrade
// Opus→Sonnet so a runaway chat can't blow the balance. Best-effort: any error
// passes the original decision through (never blocks the user). SERVER ONLY.
import type { RouteDecision } from "@/lib/lexia/agent/router"
import { getGastoMesAtual } from "./ledger"
import { getOrcamento } from "./queries"
import type { ConsumoOrcamento } from "./types"

export interface TetoEstado {
  decision: RouteDecision
  /** Opus→Sonnet downgrade was applied this turn. */
  rebaixado: boolean
  /** Month spend already ≥ 100% of the cap. */
  estourado: boolean
  gastoUsd: number
  tetoUsd: number | null
}

const SONNET_FALLBACK = (useTools: boolean): RouteDecision => ({
  model: "claude-sonnet-4-6",
  effort: "medium",
  maxTokens: 8192,
  useTools,
})

/**
 * Pure budget decision: given a routing decision, the month's spend and the
 * budget config, decide whether to downgrade Opus→Sonnet. Only acts when the user
 * enabled `autoDowngrade` and set a positive cap, and the spend passed `limiarPct`%.
 */
export function avaliarTeto(decision: RouteDecision, gastoUsd: number, orc: ConsumoOrcamento): TetoEstado {
  const teto = orc.orcamentoUsd
  if (!teto || teto <= 0 || !orc.autoDowngrade) {
    return { decision, rebaixado: false, estourado: false, gastoUsd, tetoUsd: teto ?? null }
  }
  const atingiu = gastoUsd >= teto * (orc.limiarPct / 100)
  const estourado = gastoUsd >= teto
  if (atingiu && decision.model === "claude-opus-4-8") {
    return { decision: SONNET_FALLBACK(decision.useTools), rebaixado: true, estourado, gastoUsd, tetoUsd: teto }
  }
  return { decision, rebaixado: false, estourado, gastoUsd, tetoUsd: teto }
}

/** Apply the monthly budget cap to a routing decision (best-effort; reads the ledger). */
export async function aplicarTeto(decision: RouteDecision): Promise<TetoEstado> {
  try {
    const orc = await getOrcamento()
    // Skip the spend query entirely when the guard is off / uncapped.
    if (!orc.orcamentoUsd || orc.orcamentoUsd <= 0 || !orc.autoDowngrade) {
      return { decision, rebaixado: false, estourado: false, gastoUsd: 0, tetoUsd: orc.orcamentoUsd ?? null }
    }
    const gasto = await getGastoMesAtual()
    return avaliarTeto(decision, gasto, orc)
  } catch {
    return { decision, rebaixado: false, estourado: false, gastoUsd: 0, tetoUsd: null }
  }
}

export const MODO_ECONOMICO_AVISO =
  "Modo econômico: o limite mensal de orçamento foi atingido — respondendo com Sonnet em vez de Opus."
