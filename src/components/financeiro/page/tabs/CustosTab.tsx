import { scrollArea } from "@/components/documents/page/documents-page.css"
import {
  tableCard,
  table,
  tableHeadRow,
  tableHeadCell,
  tableRow,
  documentCell,
} from "@/components/documents/page/tabs/LibraryTab/LibraryTab.css"
import { getDre, getBreakEven, getCostsByCategoria } from "@/lib/finance/queries"
import type { Periodo } from "@/lib/finance/types"
import { MoneyValue } from "../../shared/MoneyValue"
import { DreTable } from "../../shared/DreTable"
import { BreakEvenBar } from "../../charts/BreakEvenBar"
import * as f from "../financeiro.css"
import * as t from "./tabs.css"

export async function CustosTab({ mes, periodo }: { mes?: string; periodo?: Periodo }) {
  const [dre, breakEven, costs] = await Promise.all([getDre(mes, periodo), getBreakEven(), getCostsByCategoria(mes, periodo)])
  const totalCustos = costs.reduce((a, c) => a + c.valorCents, 0)

  return (
    <div className={scrollArea}>
      <div className={f.pad}>
        <div className={f.header}>
          <div>
            <h1 className={f.title}>Custos & DRE</h1>
            <p className={f.subtitle}>
              Resultado do período com pró-labore separado e ponto de equilíbrio. Artefatos de saldo são excluídos.
            </p>
          </div>
        </div>

        <div className={t.twoCol}>
          <div>
            <div className={f.sectionTitle}>DRE simplificado (período)</div>
            <DreTable rows={dre} />
          </div>
          <div>
            <div className={f.sectionTitle}>Ponto de equilíbrio</div>
            <div className={f.chartCard}>
              <BreakEvenBar
                custoFixoMensalCents={breakEven.custoFixoMensalCents}
                receitaMediaMensalCents={breakEven.receitaMediaMensalCents}
              />
            </div>
          </div>
        </div>

        <div className={f.sectionTitle}>Custos por categoria (período)</div>
        <div className={tableCard}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Categoria</th>
                <th className={tableHeadCell} style={{ textAlign: "right" }}>
                  Valor
                </th>
                <th className={tableHeadCell} style={{ textAlign: "right" }}>
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {costs.length === 0 ? (
                <tr className={tableRow}>
                  <td className={documentCell} colSpan={3}>
                    Nenhuma saída registrada neste mês.
                  </td>
                </tr>
              ) : (
                costs.map((c) => (
                  <tr key={c.nome} className={tableRow}>
                    <td className={documentCell}>
                      <span className={t.swatch} style={{ background: c.cor ?? "var(--border-strong)" }} />
                      {c.nome}
                    </td>
                    <td className={`${documentCell} ${f.numericCell}`}>
                      <MoneyValue cents={c.valorCents} />
                    </td>
                    <td className={`${documentCell} ${f.numericCell}`}>
                      {totalCustos > 0 ? `${Math.round((c.valorCents / totalCustos) * 100)}%` : "—"}
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
