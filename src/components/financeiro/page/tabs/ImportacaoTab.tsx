import { scrollArea } from "@/components/documents/page/documents-page.css"
import {
  tableCard,
  table,
  tableHeadRow,
  tableHeadCell,
  tableRow,
  documentCell,
} from "@/components/documents/page/tabs/LibraryTab/LibraryTab.css"
import { getImportSummary, getFlaggedLancamentos } from "@/lib/finance/queries"
import { formatDateBR } from "@/lib/finance/format"
import { MoneyValue } from "../../shared/MoneyValue"
import { ImportSummaryCard } from "../../shared/ImportSummaryCard"
import * as f from "../financeiro.css"
import * as t from "./tabs.css"

export async function ImportacaoTab() {
  const [summary, flagged] = await Promise.all([getImportSummary(), getFlaggedLancamentos()])

  return (
    <div className={scrollArea}>
      <div className={f.pad}>
        <div className={f.header}>
          <div>
            <h1 className={f.title}>Importação</h1>
            <p className={f.subtitle}>Estado do banco populado pelo backup do Astrea e lançamentos sinalizados.</p>
          </div>
        </div>

        <ImportSummaryCard summary={summary} />

        <div className={f.sectionTitle}>Lançamentos sinalizados (excluídos dos cálculos)</div>
        <div className={tableCard}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Descrição</th>
                <th className={tableHeadCell}>Cliente</th>
                <th className={tableHeadCell}>Data</th>
                <th className={tableHeadCell} style={{ textAlign: "right" }}>
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {flagged.length === 0 ? (
                <tr className={tableRow}>
                  <td className={documentCell} colSpan={4}>
                    Nenhum lançamento sinalizado.
                  </td>
                </tr>
              ) : (
                flagged.map((r) => (
                  <tr key={r.id} className={tableRow}>
                    <td className={`${documentCell} ${t.mutedCell}`}>{r.descricao}</td>
                    <td className={`${documentCell} ${t.mutedCell}`}>{r.cliente ?? "—"}</td>
                    <td className={`${documentCell} ${t.mutedCell}`}>{formatDateBR(r.vencimento)}</td>
                    <td className={`${documentCell} ${f.numericCell}`}>
                      <MoneyValue cents={r.valorCents} colorBySign />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
