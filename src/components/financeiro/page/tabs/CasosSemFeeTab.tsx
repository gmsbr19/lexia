import { AlertTriangle, Scale } from "lucide-react"
import { scrollArea } from "@/components/documents/page/documents-page.css"
import {
  statsGrid,
  tableCard,
  table,
  tableHeadRow,
  tableHeadCell,
  tableRow,
  documentCell,
  documentActionsCell,
} from "@/components/documents/page/tabs/LibraryTab/LibraryTab.css"
import { getCasosSemFee } from "@/lib/finance/queries"
import { formatDateBR } from "@/lib/finance/format"
import { KpiCard } from "../../shared/KpiCard"
import { MoneyValue } from "../../shared/MoneyValue"
import { StatusPill } from "../../shared/StatusPill"
import { LancarHonorarioButton } from "./LancarHonorarioButton"
import * as f from "../financeiro.css"

export async function CasosSemFeeTab() {
  const casos = await getCasosSemFee()
  const potencial = casos.reduce((a, c) => a + (c.valorCausaCents ?? 0), 0)

  return (
    <div className={scrollArea}>
      <div className={f.pad}>
        <div className={f.header}>
          <div>
            <h1 className={f.title}>Casos sem honorário</h1>
            <p className={f.subtitle}>Casos ativos que ainda não têm honorário cadastrado — para regularizar e cobrar.</p>
          </div>
        </div>

        <div className={statsGrid}>
          <KpiCard
            label="Casos sem honorário"
            value={String(casos.length)}
            icon={AlertTriangle}
            accent={casos.length > 0 ? "gold" : "neutral"}
          />
          <KpiCard label="Valor de causa somado" cents={potencial} icon={Scale} />
        </div>

        <div className={tableCard}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Caso</th>
                <th className={tableHeadCell}>Cliente</th>
                <th className={tableHeadCell}>Tipo</th>
                <th className={tableHeadCell}>Responsável</th>
                <th className={tableHeadCell}>Última mov.</th>
                <th className={tableHeadCell} style={{ textAlign: "right" }}>
                  Valor da causa
                </th>
                <th className={tableHeadCell} />
              </tr>
            </thead>
            <tbody>
              {casos.length === 0 ? (
                <tr className={tableRow}>
                  <td className={documentCell} colSpan={7}>
                    Todos os casos ativos têm honorário lançado.
                  </td>
                </tr>
              ) : (
                casos.map((c) => (
                  <tr key={c.id} className={tableRow}>
                    <td className={documentCell}>{c.titulo}</td>
                    <td className={documentCell}>{c.cliente ?? "—"}</td>
                    <td className={documentCell}>
                      <StatusPill
                        label={c.tipo === "litigio" ? "Litígio" : "Consultivo"}
                        tone={c.tipo === "litigio" ? "gold" : "neutral"}
                      />
                    </td>
                    <td className={documentCell}>{c.responsavel ?? "—"}</td>
                    <td className={documentCell}>{formatDateBR(c.ultimaMovimentacao)}</td>
                    <td className={`${documentCell} ${f.numericCell}`}>
                      {c.valorCausaCents ? <MoneyValue cents={c.valorCausaCents} /> : "—"}
                    </td>
                    <td className={`${documentCell} ${documentActionsCell}`}>
                      <LancarHonorarioButton casoId={c.id} clienteId={c.clienteId} titulo={c.titulo} />
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
