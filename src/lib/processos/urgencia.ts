// Pure "semáforo" (traffic-light) derivation for prazos. The color is NEVER
// stored — it is computed on read by comparing dataFatal / dataInterna with the
// current date (passed in, so this stays deterministic and testable).
import { compareISO, diasEntreISO } from "./datas"

export type FaixaUrgencia = "vermelho" | "ambar" | "verde"
export type EstadoPrazo = "vencido" | "hoje" | "futuro"

export interface Urgencia {
  estado: EstadoPrazo
  faixa: FaixaUrgencia
  /** Calendar days from `hoje` to dataFatal (negative if the term is overdue). */
  diasRestantes: number
}

export interface UrgenciaConfig {
  /** ≤ this many calendar days to the fatal date → âmbar (default 5). */
  ambarDias?: number
}

/**
 * Derive urgency. Logic:
 *  - vencido / vence hoje  → vermelho
 *  - já atingiu a data interna (margem de segurança) → vermelho
 *  - dentro de `ambarDias` dias da data fatal → âmbar
 *  - caso contrário → verde
 */
export function urgenciaDe(
  dataFatal: string,
  dataInterna: string | null,
  hoje: string,
  cfg: UrgenciaConfig = {},
): Urgencia {
  const ambarDias = cfg.ambarDias ?? 5
  const diasRestantes = diasEntreISO(hoje, dataFatal)
  const estado: EstadoPrazo = diasRestantes < 0 ? "vencido" : diasRestantes === 0 ? "hoje" : "futuro"

  let faixa: FaixaUrgencia
  if (estado !== "futuro") {
    faixa = "vermelho"
  } else if (dataInterna && compareISO(hoje, dataInterna) >= 0) {
    faixa = "vermelho"
  } else if (diasRestantes <= ambarDias) {
    faixa = "ambar"
  } else {
    faixa = "verde"
  }

  return { estado, faixa, diasRestantes }
}
