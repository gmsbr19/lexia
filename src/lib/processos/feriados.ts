// Pure holiday computation for the prazo engine. Brazilian deadlines are counted
// in days the FORUM functions, so the relevant set is: federal civil holidays +
// nationally-observed forensic/religious days (Carnaval, Sexta-feira Santa,
// Corpus Christi) + whatever estadual/forense/municipal dates the office
// configured (passed in as `extras`). Everything is "YYYY-MM-DD" strings.
//
// No Prisma here — the query layer fetches the configurable Feriado rows and
// hands their ISO dates in via `extras`, keeping this module test-clean.
import { addDiasISO } from "./datas"

/**
 * Easter Sunday (Gregorian) for `year` as "YYYY-MM-DD".
 * Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 */
export function pascoa(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Fixed + movable FEDERAL CIVIL holidays for `year` (Lei 14.759 added 20/11). */
export function feriadosNacionais(year: number): string[] {
  return [
    `${year}-01-01`, // Confraternização Universal
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia do Trabalho
    `${year}-09-07`, // Independência
    `${year}-10-12`, // Nossa Senhora Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamação da República
    `${year}-11-20`, // Consciência Negra (feriado nacional desde 2024 — Lei 14.759/2023)
    `${year}-12-25`, // Natal
  ]
}

/**
 * Nationally-observed FORENSIC/religious days when courts don't function and
 * therefore prazos don't run. Carnaval (segunda + terça) + Quarta-feira de
 * Cinzas + Sexta-feira Santa + Corpus Christi, all keyed off Easter.
 */
export function feriadosForensesNacionais(year: number): string[] {
  const p = pascoa(year)
  return [
    addDiasISO(p, -48), // Carnaval — segunda-feira
    addDiasISO(p, -47), // Carnaval — terça-feira
    addDiasISO(p, -46), // Quarta-feira de Cinzas (expediente forense suspenso)
    addDiasISO(p, -2), // Sexta-feira Santa
    addDiasISO(p, 60), // Corpus Christi
  ]
}

/**
 * Build the non-business-day Set for one or more years. `extras` are
 * already-resolved ISO dates (the query layer pulls the configurable Feriado
 * rows filtered by jurisdiction and maps them to strings).
 */
export function montarFeriados(anos: number[], extras: string[] = []): Set<string> {
  const set = new Set<string>()
  for (const ano of anos) {
    for (const d of feriadosNacionais(ano)) set.add(d)
    for (const d of feriadosForensesNacionais(ano)) set.add(d)
  }
  for (const d of extras) set.add(d)
  return set
}
