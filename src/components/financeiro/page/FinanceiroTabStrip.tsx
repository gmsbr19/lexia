import Link from "next/link"
import { tabStrip, tabButton } from "@/components/documents/page/tabs/TabStrip.css"
import { FINANCEIRO_TABS, type FinanceiroTab } from "./nav"
import { tabLink, tabStripScroll } from "./FinanceiroTabStrip.css"

// Server component: tab switching is plain navigation (?tab=…), so the page
// re-renders on the server with fresh data. Active state comes from the prop.
// `mes`/`periodo` are carried across tabs so the selected scope survives switches.
export function FinanceiroTabStrip({ tab, mes, periodo }: { tab: FinanceiroTab; mes?: string; periodo?: string }) {
  const suffix = `${mes ? `&mes=${mes}` : ""}${periodo ? `&periodo=${periodo}` : ""}`
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
