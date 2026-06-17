import type { ImportSummary } from "@/lib/finance/types"
import * as s from "./ImportSummaryCard.css"
import { ReimportButton } from "./ReimportButton"
import { GerarRecorrenciaButton } from "./GerarRecorrenciaButton"

export function ImportSummaryCard({ summary }: { summary: ImportSummary }) {
  const counts: [string, number][] = [
    ["Clientes", summary.clientes],
    ["Casos", summary.casos],
    ["Honorários", summary.honorarios],
    ["Lançamentos", summary.lancamentos],
    ["Categorias", summary.categorias],
    ["Contas", summary.contas],
    ["Centros de custo", summary.centrosCusto],
    ["Anomalias", summary.anomalias],
    ["Casos sem honorário", summary.casosSemFee],
  ]
  return (
    <div>
      <div className={s.toolbar}>
        <ReimportButton />
        <GerarRecorrenciaButton />
        <span className={s.toolbarHint}>
          Reimportar é idempotente — atualiza pelos códigos do Astrea, sem duplicar.
        </span>
      </div>
      <div className={s.countGrid}>
        {counts.map(([label, value]) => (
          <div key={label} className={s.countCell}>
            <div className={s.countValue}>{value}</div>
            <div className={s.countLabel}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
