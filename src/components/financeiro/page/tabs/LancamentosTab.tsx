import { getLancamentos } from "@/lib/finance/queries"
import type { Periodo } from "@/lib/finance/types"
import { LancamentosTable, type InitialFilter } from "../../interativo/LancamentosTable"
import type { LancOptions } from "../../interativo/NovoLancamentoModal"

export async function LancamentosTab({
  mes,
  periodo,
  initial,
  options,
}: {
  mes: string
  periodo: Periodo
  initial?: InitialFilter
  options: LancOptions
}) {
  const items = await getLancamentos(mes, periodo)
  return <LancamentosTable rows={items} options={options} initial={initial} />
}
