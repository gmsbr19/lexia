import { pageShell, tabPanel } from "@/components/documents/page/documents-page.css"
import { getCasoOptions, getCategoriaOptions, getClienteOptions, getContaOptions, getFornecedorOptions } from "@/lib/finance/queries"
import { normalizePeriodo } from "@/lib/finance/periodo"
import { FinanceiroTabStrip } from "./FinanceiroTabStrip"
import { tabStripRow } from "./FinanceiroTabStrip.css"
import { PERIOD_TABS, normalizeFinanceiroTab, normalizeMes } from "./nav"
import { PeriodBar } from "../interativo/PeriodBar"
import type { LancOptions } from "../interativo/NovoLancamentoModal"
import { VisaoInterativaTab } from "./tabs/VisaoInterativaTab"
import { LancamentosTab } from "./tabs/LancamentosTab"
import type { InitialFilter } from "../interativo/LancamentosTable"
import { FluxoTab } from "./tabs/FluxoTab"
import { ContasTab } from "./tabs/ContasTab"
import { CustosTab } from "./tabs/CustosTab"
import { CasosSemFeeTab } from "./tabs/CasosSemFeeTab"
import { ImportacaoTab } from "./tabs/ImportacaoTab"

type Params = Record<string, string | string[] | undefined>
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

// Server component: the design tabs (Visão geral / Lançamentos / Fluxo) read the
// real Lancamento ledger; the period bar + lançamento filters live in the URL.
export async function FinanceiroPage({ params }: { params: Params }) {
  const tab = normalizeFinanceiroTab(params.tab)
  const mes = normalizeMes(params.mes)
  const periodo = normalizePeriodo(params.periodo)
  const isDesignTab = tab === "visao-geral" || tab === "lancamentos" || tab === "fluxo"

  let options: LancOptions | null = null
  if (isDesignTab) {
    const [cats, clientes, fornecedores, contas, casos] = await Promise.all([
      getCategoriaOptions(),
      getClienteOptions(),
      getFornecedorOptions(),
      getContaOptions(),
      getCasoOptions(),
    ])
    options = { cats, clientes: clientes.map((c) => c.nome), fornecedores, contas, casos: casos.map((c) => c.nome) }
  }

  const initial: InitialFilter = {
    dir: (str(params.dir) as InitialFilter["dir"]) || undefined,
    stat: (str(params.stat) as InitialFilter["stat"]) || undefined,
    cat: str(params.cat) || undefined,
    q: str(params.q) || undefined,
    aging: str(params.aging) || undefined,
  }

  return (
    <>
      <div className={pageShell}>
        <div className={tabStripRow}>
          <FinanceiroTabStrip tab={tab} mes={mes} periodo={periodo} />
        </div>

        {PERIOD_TABS.includes(tab) && <PeriodBar tab={tab} mes={mes} periodo={periodo} />}

        <div className={tabPanel}>
          {tab === "visao-geral" && <VisaoInterativaTab mes={mes} periodo={periodo} />}
          {tab === "lancamentos" && options && <LancamentosTab mes={mes} periodo={periodo} initial={initial} options={options} />}
          {tab === "fluxo" && <FluxoTab />}
          {tab === "contas" && <ContasTab />}
          {tab === "custos" && <CustosTab mes={mes} periodo={periodo} />}
          {tab === "casos-sem-honorario" && <CasosSemFeeTab />}
          {tab === "importacao" && <ImportacaoTab />}
        </div>
      </div>
    </>
  )
}
