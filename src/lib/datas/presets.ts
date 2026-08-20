// "Quick date" preset chips for the DatePicker UI — pt-BR labels, computed
// purely from an explicit hojeISO (never `new Date()`).
import { addDays, nextWeekday, weekdayOf } from "./util"
import { WD } from "./mes"

export interface DatePreset {
  key: string
  label: string
  iso: string | null
  hint?: string
}

export function datePresets(hojeISO: string): DatePreset[] {
  const wd = weekdayOf(hojeISO)
  const amanhaIso = addDays(hojeISO, 1)
  // "Este fim de semana": next Saturday — but if hojeISO itself already falls
  // on the weekend (Sat or Sun), stay on hojeISO instead of jumping to next
  // week's Saturday.
  const fimDeSemanaIso = wd === 6 || wd === 0 ? hojeISO : addDays(hojeISO, 6 - wd)
  // "Próxima semana": next Monday STRICTLY after hojeISO (today-if-Monday jumps +7).
  const proximaSemanaIso = nextWeekday(hojeISO, 1)

  return [
    { key: "hoje", label: "Hoje", iso: hojeISO, hint: WD[weekdayOf(hojeISO)] },
    { key: "amanha", label: "Amanhã", iso: amanhaIso, hint: WD[weekdayOf(amanhaIso)] },
    { key: "fim-de-semana", label: "Este fim de semana", iso: fimDeSemanaIso, hint: WD[weekdayOf(fimDeSemanaIso)] },
    { key: "proxima-semana", label: "Próxima semana", iso: proximaSemanaIso, hint: WD[weekdayOf(proximaSemanaIso)] },
    { key: "sem-vencimento", label: "Sem vencimento", iso: null },
  ]
}
