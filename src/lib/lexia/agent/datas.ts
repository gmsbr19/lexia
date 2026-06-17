// Date helpers anchored to America/Sao_Paulo (the office timezone). Used by the
// prompt builder (today's date) and the agenda tool (default window).
const TZ = "America/Sao_Paulo"

/** Today as "YYYY-MM-DD" in São Paulo. */
export function hojeISO(): string {
  // en-CA renders ISO-shaped dates (YYYY-MM-DD).
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date())
}

/** Shift a "YYYY-MM-DD" by n days (UTC math on the date-only value is exact). */
export function addDiasISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

/** "quinta-feira, 12 de junho de 2026" for the context line. */
export function dataExtenso(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date())
}
