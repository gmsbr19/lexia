// Pure grouping of ContratoRow[] by month of dataFechamento — powers the
// /contratos list (sections, most recent month first). No I/O; client-safe.
import type { ContratoRow } from "./types"

export interface ContratoMesGrupo {
  key: string // "YYYY-MM" or "sem-data"
  label: string // "julho de 2026" or "Sem data"
  rows: ContratoRow[]
}

const MES_LABEL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MES_LABEL[m - 1]} de ${y}`
}

/** Group contratos by month of `dataFechamento` ("YYYY-MM" prefix), most recent
 *  month first; order WITHIN a month is preserved from the input (the caller
 *  applies its own sort before grouping). Contratos with no dataFechamento sink
 *  into a trailing "Sem data" bucket. */
export function groupContratosByMonth(rows: ContratoRow[]): ContratoMesGrupo[] {
  const byKey = new Map<string, ContratoRow[]>()
  const semData: ContratoRow[] = []
  for (const r of rows) {
    if (!r.dataFechamento) {
      semData.push(r)
      continue
    }
    const key = r.dataFechamento.slice(0, 7)
    const list = byKey.get(key)
    if (list) list.push(r)
    else byKey.set(key, [r])
  }
  const groups: ContratoMesGrupo[] = [...byKey.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupRows]) => ({ key, label: monthLabel(key), rows: groupRows }))
  if (semData.length) groups.push({ key: "sem-data", label: "Sem data", rows: semData })
  return groups
}
