// Helpers de data/rótulo client-side (dia de hoje local, rótulo curto) — usados
// pelo DatePicker compartilhado (components/ui). O módulo Tarefas usa regras.ts.
export const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
export const WD_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
export const MO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
export const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

// "now" anchored to local noon today (avoids UTC off-by-one at day edges).
function todayNoon(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)
}
export const tIso = (dt: Date): string =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
export const TODAY = (): string => tIso(todayNoon())
export const tRel = (n: number): string => {
  const d = todayNoon()
  d.setDate(d.getDate() + n)
  return tIso(d)
}
export const tParse = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d, 12)
}
export const tDiff = (s: string): number => Math.round((tParse(s).getTime() - todayNoon().getTime()) / 86400000)

// short scheduled-date label: Hoje / Amanhã / Ontem / qua / 18 jun
export function dataLabel(s: string | null): string | null {
  if (!s) return null
  const n = tDiff(s)
  if (n === 0) return "Hoje"
  if (n === 1) return "Amanhã"
  if (n === -1) return "Ontem"
  const d = tParse(s)
  if (n > 1 && n < 7) return WD[d.getDay()]
  return `${d.getDate()} ${MO[d.getMonth()]}`
}
