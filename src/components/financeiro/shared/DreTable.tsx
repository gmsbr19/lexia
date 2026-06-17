import {
  tableCard,
  table,
  tableRow,
  documentCell,
} from "@/components/documents/page/tabs/LibraryTab/LibraryTab.css"
import type { DreRow } from "@/lib/finance/types"
import { numericCell } from "../page/financeiro.css"
import { MoneyValue } from "./MoneyValue"
import { resultadoRow, labelCell, labelStrong } from "./DreTable.css"

/** Simple DRE: Receita → −Custos op. → −Pró-labore → Resultado. */
export function DreTable({ rows }: { rows: DreRow[] }) {
  return (
    <div className={tableCard}>
      <table className={table}>
        <tbody>
          {rows.map((r) => {
            const isResult = r.kind === "resultado"
            return (
              <tr key={r.label} className={isResult ? resultadoRow : tableRow}>
                <td className={`${documentCell} ${labelCell} ${isResult ? labelStrong : ""}`}>{r.label}</td>
                <td className={`${documentCell} ${numericCell}`}>
                  <MoneyValue cents={r.valorCents} colorBySign={isResult} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
