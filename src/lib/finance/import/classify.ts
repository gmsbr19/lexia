import type { ComposicaoBucket } from "../types"

const EXITO_RE = /êxito|exito|sucumb|sucesso|% sobre|percentual/i
const PARCELA_RE = /parcela|parc\.|\d+\s*\/\s*\d+/i

/**
 * Heuristic composição bucket for a honorário. Astrea doesn't store this
 * explicitly, so we infer it (documented + overridable):
 *   recurring entry → recorrente; "êxito/%/sucumbência" → exito;
 *   "parcela / 3/12" → parcelado; otherwise → avista.
 */
export function classifyComposicao(opts: {
  descricao?: string | null
  isRecorrente: boolean
}): ComposicaoBucket {
  if (opts.isRecorrente) return "recorrente"
  const desc = opts.descricao ?? ""
  if (EXITO_RE.test(desc)) return "exito"
  if (PARCELA_RE.test(desc)) return "parcelado"
  return "avista"
}

const ANOMALY_DESC_RE = /compensa[çc][ãa]o\s+sistema/i
const LARGE_ABS_CENTS = 5_000_000 // R$ 50.000 — balance artifacts dwarf real fees

/**
 * Flag balance artifacts that must be excluded from revenue/cost/DRE but still
 * shown (flagged) in the Importação screen:
 *   • Sub-Tipo "Valor inicial" (account-opening rows)
 *   • explicit "Compensação Sistema" descriptions
 *   • Valor Original == 0 while |Valor| is large (system compensations,
 *     e.g. the −R$150.375 row whose Valor Original is 0)
 */
export function detectAnomalia(opts: {
  subTipo: string | null
  descricao: string | null
  valorCents: number
  valorOriginalCents: number
}): boolean {
  if (opts.subTipo === "valor_inicial") return true
  if (opts.descricao && ANOMALY_DESC_RE.test(opts.descricao)) return true
  if (opts.valorOriginalCents === 0 && Math.abs(opts.valorCents) >= LARGE_ABS_CENTS) return true
  return false
}
