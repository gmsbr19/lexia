// THE critical service: pure computation of procedural deadlines (CPC/2015).
//
// Rules implemented:
//  - Procedural terms run in BUSINESS DAYS (art. 219) — only dias úteis count.
//  - A business day = not weekend, not holiday (federal/forensic/state/local),
//    not inside a configured suspension period (art. 220: 20/12–20/1 + recesso).
//  - DJe intimation (Lei 11.419/2006): disponibilização → publicação no 1º dia
//    útil seguinte → a contagem inicia no 1º dia útil seguinte ao da publicação.
//  - Início e vencimento são protraídos ao 1º dia útil seguinte (art. 224 §1).
//  - "Dias corridos" terms count calendar days but PAUSE during suspensions and
//    still protrai o vencimento para o 1º dia útil.
//
// Everything is "YYYY-MM-DD" strings; holidays/suspensions/reference dates are
// passed in (PrazoContexto) so the module is deterministic and Prisma-free.
import { addDiasISO, compareISO, isFimDeSemana } from "./datas"

export type TipoContagem = "uteis" | "corridos"

export interface SuspensaoRange {
  de: string // inclusive "YYYY-MM-DD"
  ate: string // inclusive "YYYY-MM-DD"
}

export interface PrazoContexto {
  /** Non-business calendar days (weekends are derived, so they need NOT be here). */
  feriados: ReadonlySet<string>
  /** Inclusive ranges where the term does not run (CPC art. 220 + recesso). */
  suspensoes?: readonly SuspensaoRange[]
}

const GUARD = 3660 // ~10 years of daily steps — trips only on a misconfigured set

/** Is `iso` inside any configured suspension range (inclusive)? */
export function emSuspensao(iso: string, ctx: PrazoContexto): boolean {
  return (ctx.suspensoes ?? []).some((s) => compareISO(iso, s.de) >= 0 && compareISO(iso, s.ate) <= 0)
}

/** A business day: not weekend, not holiday, not within a suspension period. */
export function isDiaUtil(iso: string, ctx: PrazoContexto): boolean {
  if (isFimDeSemana(iso)) return false
  if (ctx.feriados.has(iso)) return false
  if (emSuspensao(iso, ctx)) return false
  return true
}

/** First business day on or after `iso`. */
export function proximoDiaUtil(iso: string, ctx: PrazoContexto): string {
  let cur = iso
  for (let i = 0; i <= GUARD; i++) {
    if (isDiaUtil(cur, ctx)) return cur
    cur = addDiasISO(cur, 1)
  }
  throw new Error("proximoDiaUtil: nenhum dia útil em ~10 anos — verifique feriados/suspensões")
}

/** First business day strictly after `iso`. */
export function proximoDiaUtilApos(iso: string, ctx: PrazoContexto): string {
  return proximoDiaUtil(addDiasISO(iso, 1), ctx)
}

export interface InicioPorPublicacao {
  publicacao: string // 1º dia útil seguinte à disponibilização
  inicio: string // 1º dia útil seguinte ao da publicação (= dia 1 da contagem)
}

/**
 * From a DJe *disponibilização* date, derive the publication date and the first
 * counting day — TWO business-day hops (art. 224 §§2–3 + Lei 11.419/2006):
 *   publicação = 1º dia útil seguinte à disponibilização;
 *   início     = 1º dia útil seguinte à publicação.
 */
export function inicioPorDisponibilizacao(disponibilizacao: string, ctx: PrazoContexto): InicioPorPublicacao {
  const publicacao = proximoDiaUtilApos(disponibilizacao, ctx)
  const inicio = proximoDiaUtilApos(publicacao, ctx)
  return { publicacao, inicio }
}

/**
 * From a known *publication* date, derive the first counting day — a SINGLE hop
 * (art. 224 §3): início = 1º dia útil seguinte ao da publicação. Use this when
 * the publicação date itself is known (not the disponibilização), so the §2 hop
 * is NOT applied a second time.
 */
export function inicioPorPublicacao(publicacao: string, ctx: PrazoContexto): InicioPorPublicacao {
  return { publicacao, inicio: proximoDiaUtilApos(publicacao, ctx) }
}

export interface CalcPrazoInput {
  /** Candidate first day of the count (it is protraído to the next business day). */
  dataInicio: string
  quantidadeDias: number
  tipoContagem?: TipoContagem
  ctx: PrazoContexto
}

export interface CalcPrazoResult {
  dataInicioContagem: string // the actual day-1 (start protraído ao 1º dia útil)
  dataFatal: string // last day of the term (protraída ao 1º dia útil)
  tipoContagem: TipoContagem
  quantidadeDias: number
}

/** Compute the fatal date for a term. Throws on invalid `quantidadeDias`. */
export function calcularPrazo(input: CalcPrazoInput): CalcPrazoResult {
  const tipoContagem: TipoContagem = input.tipoContagem ?? "uteis"
  if (!Number.isInteger(input.quantidadeDias) || input.quantidadeDias <= 0) {
    throw new Error("quantidadeDias deve ser um inteiro positivo")
  }
  const { ctx } = input
  // Art. 224 §1: o início é protraído ao 1º dia útil.
  const dataInicioContagem = proximoDiaUtil(input.dataInicio, ctx)

  let dataFatal: string
  if (tipoContagem === "uteis") {
    // Count `quantidadeDias` business days; the first is dataInicioContagem.
    let cur = dataInicioContagem
    for (let counted = 1; counted < input.quantidadeDias; counted++) {
      cur = proximoDiaUtilApos(cur, ctx)
    }
    dataFatal = cur
  } else {
    // Dias corridos: add calendar days, but a day inside a suspension period
    // does not count (the term is suspended — art. 220).
    let cur = dataInicioContagem
    let counted = 1
    let guard = 0
    while (counted < input.quantidadeDias) {
      cur = addDiasISO(cur, 1)
      if (!emSuspensao(cur, ctx)) counted++
      if (++guard > GUARD) throw new Error("calcularPrazo: muitas iterações (dias corridos)")
    }
    // Art. 224 §1: vencimento em dia não útil é protraído ao 1º dia útil seguinte.
    dataFatal = proximoDiaUtil(cur, ctx)
  }

  return { dataInicioContagem, dataFatal, tipoContagem, quantidadeDias: input.quantidadeDias }
}

/**
 * Internal safety deadline: `diasMargem` business days BEFORE dataFatal.
 * Returns dataFatal unchanged when margem <= 0.
 */
export function dataInterna(dataFatal: string, diasMargem: number, ctx: PrazoContexto): string {
  if (!Number.isFinite(diasMargem) || diasMargem <= 0) return dataFatal
  let cur = dataFatal
  let stepped = 0
  let guard = 0
  while (stepped < diasMargem) {
    cur = addDiasISO(cur, -1)
    if (isDiaUtil(cur, ctx)) stepped++
    if (++guard > GUARD) throw new Error("dataInterna: muitas iterações")
  }
  return cur
}
