import { getRelatorioFinanceiro } from "@/lib/finance/relatorio"
import type { Faixa } from "@/lib/finance/relatorio-periodo"
import { RelatorioBarra } from "../../relatorio/RelatorioBarra"
import { RelatorioDoc } from "../../relatorio/RelatorioDoc"
import * as c from "../../interativo/interativo.css"

// Aba Relatório: a barra de período fica fixa no topo e o documento rola —
// o MESMO documento que a rota de impressão (/financeiro/relatorio) renderiza.
export async function RelatorioTab({ faixa }: { faixa: Faixa }) {
  const rel = await getRelatorioFinanceiro(faixa)
  return (
    <div className={c.flexCol}>
      <RelatorioBarra faixa={faixa} lancamentos={rel.lancamentos} />
      {/* `flex:1 + minHeight:0` (e não height:100%) — a barra é irmã no mesmo
          flex column, então o scroller tem de ocupar só o que sobra. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ padding: "22px 40px 48px" }}>
          <RelatorioDoc rel={rel} />
        </div>
      </div>
    </div>
  )
}
