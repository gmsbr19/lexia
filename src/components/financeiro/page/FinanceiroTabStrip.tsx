import Link from "next/link"
import { tabStrip, tabButton } from "@/components/documents/page/tabs/TabStrip.css"
import { FINANCEIRO_TABS, type FinanceiroTab } from "./nav"
import { tabLink, tabStripScroll } from "./FinanceiroTabStrip.css"

// Server component: tab switching is plain navigation (?tab=…), so the page
// re-renders on the server with fresh data. Active state comes from the prop.
// `mes`/`periodo` are carried across tabs so the selected scope survives switches.
export function FinanceiroTabStrip({
  tab,
  mes,
  periodo,
  de,
  ate,
}: {
  tab: FinanceiroTab
  mes?: string
  periodo?: string
  /** Faixa do relatório — carregada junto para a aba Relatório não perder o período. */
  de?: string
  ate?: string
}) {
  const suffix = `${mes ? `&mes=${mes}` : ""}${periodo ? `&periodo=${periodo}` : ""}${de ? `&de=${de}` : ""}${ate ? `&ate=${ate}` : ""}`
  return (
    <div className={`${tabStrip} ${tabStripScroll}`}>
      {FINANCEIRO_TABS.map((t) => (
        <Link
          key={t.id}
          href={`/financeiro?tab=${t.id}${suffix}`}
          scroll={false}
          className={`${tabButton({ active: tab === t.id })} ${tabLink}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
