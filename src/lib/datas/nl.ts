// Natural-language pt-BR date/time phrase parser — accent-insensitive, pure.
// Shared by the DatePicker UI and the Tarefas quick-add composer, which used
// to duplicate a slice of this vocabulary inline (see tf-meta.ts's
// parseQuickAdd, now delegating here).
import { semAcento } from "@/lib/text"
import {
  addDays,
  addMonths,
  compareISO,
  isValidISO,
  isoOf,
  lastDayOfMonth,
  nextWeekday,
  parseISO,
  weekdayOf,
} from "./util"
import { addMonthIndex } from "./mes"

export interface ParsedData {
  iso: string | null
  hora: string | null
  matched: string
}

interface Span {
  index: number
  length: number
}
interface DateSpan extends Span {
  iso: string | null
}
interface TimeSpan extends Span {
  hora: string
}

/** Accent-insensitive, lowercased fold. Character-count preserving for
 * standard pt-BR accented letters, so indices found on the folded string map
 * 1:1 back onto the original input. */
const fold = (s: string): string => semAcento(s).toLowerCase()

const WEEKDAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]

const MESES_FOLD = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

function matchDatePhrase(folded: string, hojeISO: string): DateSpan | null {
  let m: RegExpMatchArray | null

  if ((m = folded.match(/\bhoje\b/))) {
    return { index: m.index ?? 0, length: m[0].length, iso: hojeISO }
  }
  // "depois de amanhã" is checked BEFORE "amanhã" — it contains "amanhã" as a
  // substring, so the shorter phrase would otherwise win first.
  if ((m = folded.match(/\bdepois de amanha\b/))) {
    return { index: m.index ?? 0, length: m[0].length, iso: addDays(hojeISO, 2) }
  }
  if ((m = folded.match(/\bamanha\b/))) {
    return { index: m.index ?? 0, length: m[0].length, iso: addDays(hojeISO, 1) }
  }
  if ((m = folded.match(/\b(este|esse) fim de semana\b/))) {
    const wd = weekdayOf(hojeISO)
    const iso = wd === 6 || wd === 0 ? hojeISO : addDays(hojeISO, 6 - wd)
    return { index: m.index ?? 0, length: m[0].length, iso }
  }
  if ((m = folded.match(/\bproxima semana\b/))) {
    return { index: m.index ?? 0, length: m[0].length, iso: nextWeekday(hojeISO, 1) }
  }
  if ((m = folded.match(/\bem (\d{1,2}) (dia|dias|semana|semanas|mes|meses)\b/))) {
    const n = Number(m[1])
    const unit = m[2]
    const iso = unit.startsWith("dia")
      ? addDays(hojeISO, n)
      : unit.startsWith("semana")
        ? addDays(hojeISO, n * 7)
        : addMonths(hojeISO, n)
    return { index: m.index ?? 0, length: m[0].length, iso }
  }
  // Weekday names, short or long ("seg"/"segunda", "sab"/"sabado", ...) — the
  // 3-letter key is captured, `\w*` absorbs whatever long-form suffix follows
  // (same loose-match convention as the pre-existing regex in tf-meta.ts).
  if ((m = folded.match(/\b(seg|ter|qua|qui|sex|sab|dom)\w*\b/))) {
    const idx = WEEKDAY_KEYS.indexOf(m[1])
    if (idx >= 0) {
      return { index: m.index ?? 0, length: m[0].length, iso: nextWeekday(hojeISO, idx) }
    }
  }
  if ((m = folded.match(/\bdia (\d{1,2})\b/))) {
    const day = Number(m[1])
    if (day >= 1 && day <= 31) {
      const hoje = parseISO(hojeISO)
      const y = hoje.getFullYear()
      const mo = hoje.getMonth()
      const thisMonthIso = isoOf(y, mo, Math.min(day, lastDayOfMonth(y, mo)))
      let iso = thisMonthIso
      if (compareISO(thisMonthIso, hojeISO) < 0) {
        const next = addMonthIndex(y, mo, 1)
        iso = isoOf(next.ano, next.mes0, Math.min(day, lastDayOfMonth(next.ano, next.mes0)))
      }
      return { index: m.index ?? 0, length: m[0].length, iso }
    }
  }
  if ((m = folded.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const day = Number(m[1])
    const month = Number(m[2])
    if (month >= 1 && month <= 12) {
      const explicitYear = m[3]
      let year = explicitYear
        ? explicitYear.length === 2
          ? 2000 + Number(explicitYear)
          : Number(explicitYear)
        : parseISO(hojeISO).getFullYear()
      let candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      if (isValidISO(candidate)) {
        // year omitted -> infer current year, rolling to next year once the
        // date has already passed relative to hojeISO
        if (!explicitYear && compareISO(candidate, hojeISO) < 0) {
          year += 1
          candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        }
        return { index: m.index ?? 0, length: m[0].length, iso: candidate }
      }
      // Calendar-invalid absolute date (e.g. "31/02") is deliberately left
      // UNMATCHED rather than clamped/rolled forward: an explicit DD/MM the
      // user typed wrong should surface as "not understood", not a
      // silently-guessed date. Falls through to the remaining checks below.
    }
  }
  if ((m = folded.match(/\b(\d{1,2}) de ([a-z]+)\b/))) {
    const day = Number(m[1])
    const monthIdx = MESES_FOLD.indexOf(m[2])
    if (monthIdx >= 0 && day >= 1 && day <= 31) {
      let year = parseISO(hojeISO).getFullYear()
      let candidate = isoOf(year, monthIdx, Math.min(day, lastDayOfMonth(year, monthIdx)))
      if (compareISO(candidate, hojeISO) < 0) {
        year += 1
        candidate = isoOf(year, monthIdx, Math.min(day, lastDayOfMonth(year, monthIdx)))
      }
      return { index: m.index ?? 0, length: m[0].length, iso: candidate }
    }
  }
  if ((m = folded.match(/\bsem (vencimento|data|prazo)\b/))) {
    return { index: m.index ?? 0, length: m[0].length, iso: null }
  }
  return null
}

function matchTimePhrase(folded: string): TimeSpan | null {
  const m = folded.match(/\b(\d{1,2})\s*[:h]\s*(\d{2})?\b/)
  if (!m) return null
  const hh = String(Math.min(23, Number(m[1]))).padStart(2, "0")
  const mm = (m[2] || "00").padStart(2, "0")
  return { index: m.index ?? 0, length: m[0].length, hora: `${hh}:${mm}` }
}

export function parseDataNatural(input: string, hojeISO: string): ParsedData | null {
  const folded = fold(input)
  const dateSpan = matchDatePhrase(folded, hojeISO)
  const timeSpan = matchTimePhrase(folded)
  if (!dateSpan && !timeSpan) return null

  const spans: Span[] = []
  if (dateSpan) spans.push({ index: dateSpan.index, length: dateSpan.length })
  if (timeSpan) spans.push({ index: timeSpan.index, length: timeSpan.length })
  const start = Math.min(...spans.map((s) => s.index))
  const end = Math.max(...spans.map((s) => s.index + s.length))

  return {
    iso: dateSpan ? dateSpan.iso : null,
    hora: timeSpan ? timeSpan.hora : null,
    matched: input.slice(start, end),
  }
}
