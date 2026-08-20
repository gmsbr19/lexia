// Recurrence RULE parsing + next-occurrence computation for Tarefa.recur
// labels. Pure — backs both the recurrence picker UI and the (new) real
// engine: completing a recurring Tarefa auto-generates the next instance.
import { semAcento } from "@/lib/text"
import { addDays, compareISO, dayOfMonth, isoOf, lastDayOfMonth, nextWeekday, parseISO, weekdayOf } from "./util"
import { addMonthIndex, WD_LONG } from "./mes"

export type RecurTipo = "diaria" | "semanal" | "dia-semana" | "intervalo-dias" | "dia-do-mes" | "mensal"

export interface RegraRecorrencia {
  tipo: RecurTipo
  diaSemana?: number // 0-6, only for "dia-semana"
  intervaloDias?: number // only for "intervalo-dias"
  diaDoMes?: number // only for "dia-do-mes"
}

const fold = (s: string): string => semAcento(s).toLowerCase().trim()

// e.g. "terça" -> "terca"; index stays aligned with WD_LONG / getDay() (0=domingo)
const WEEKDAY_FOLD = WD_LONG.map((w) => semAcento(w).toLowerCase())

export function parseRecur(label: string | null | undefined): RegraRecorrencia | null {
  if (!label) return null
  const f = fold(label)
  if (f === "nao repete") return null
  if (f === "diariamente") return { tipo: "diaria" }
  if (f === "toda semana") return { tipo: "semanal" }
  if (f === "mensalmente") return { tipo: "mensal" }

  let m: RegExpMatchArray | null
  // "Toda <qualquer dia da semana>" — curto ou longo, com ou sem "-feira".
  if ((m = f.match(/^toda ([a-z-]+)/))) {
    const token = m[1]
    const idx = WEEKDAY_FOLD.findIndex((w) => token.startsWith(w) || w.startsWith(token))
    return idx >= 0 ? { tipo: "dia-semana", diaSemana: idx } : null
  }
  if ((m = f.match(/^a cada (\d+) dias?$/))) {
    const n = Number(m[1])
    return n >= 1 ? { tipo: "intervalo-dias", intervaloDias: n } : null
  }
  if ((m = f.match(/^todo dia (\d{1,2})$/))) {
    const n = Number(m[1])
    return n >= 1 && n <= 31 ? { tipo: "dia-do-mes", diaDoMes: n } : null
  }
  return null
}

/** Labels for the recurrence picker; the two date-dependent entries are
 * computed from baseISO's own weekday/day-of-month. */
export function recorrenciaOptions(baseISO: string): string[] {
  return [
    "Não repete",
    "Diariamente",
    `Toda ${WD_LONG[weekdayOf(baseISO)]}`,
    "Toda semana",
    "A cada 15 dias",
    `Todo dia ${dayOfMonth(baseISO)}`,
    "Mensalmente",
  ]
}

function step(cursor: string, regra: RegraRecorrencia, baseDay: number): string {
  switch (regra.tipo) {
    case "diaria":
      return addDays(cursor, 1)
    case "semanal":
      return addDays(cursor, 7)
    case "intervalo-dias":
      return addDays(cursor, Math.max(1, regra.intervaloDias ?? 1))
    case "dia-semana":
      return nextWeekday(cursor, regra.diaSemana ?? 0)
    case "mensal": {
      // Always clamps against baseISO's OWN day-of-month (not the cursor's
      // possibly-already-clamped day) so a run of several months never drifts
      // — e.g. Jan 31 -> Feb 28 -> Mar 31 (not Mar 28).
      const d = parseISO(cursor)
      const next = addMonthIndex(d.getFullYear(), d.getMonth(), 1)
      const dia = Math.min(baseDay, lastDayOfMonth(next.ano, next.mes0))
      return isoOf(next.ano, next.mes0, dia)
    }
    case "dia-do-mes": {
      const d = parseISO(cursor)
      const next = addMonthIndex(d.getFullYear(), d.getMonth(), 1)
      const dia = Math.min(regra.diaDoMes ?? 1, lastDayOfMonth(next.ano, next.mes0))
      return isoOf(next.ano, next.mes0, dia)
    }
    default:
      return cursor
  }
}

/** Parses `label`; if unparseable, returns null. Otherwise, starting from
 * baseISO, repeatedly applies ONE step of the rule until the result is
 * STRICTLY GREATER than hojeISO, then returns that result — ALWAYS advances
 * at least once (never returns baseISO itself), so completing a task that's
 * overdue by days/weeks still lands on a sensible FUTURE next occurrence
 * instead of another past one, and completing one early still returns the
 * next cycle rather than repeating the same date. */
export function proximaOcorrencia(label: string | null | undefined, baseISO: string, hojeISO: string): string | null {
  const regra = parseRecur(label)
  if (!regra) return null

  const baseDay = dayOfMonth(baseISO)
  let cursor = baseISO
  let guard = 0
  do {
    guard++
    if (guard > 1000) return null
    cursor = step(cursor, regra, baseDay)
  } while (compareISO(cursor, hojeISO) <= 0)
  return cursor
}
