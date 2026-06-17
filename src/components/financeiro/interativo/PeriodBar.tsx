"use client"

import { useRouter } from "next/navigation"
import { btn } from "@/styles/components.css"
import { currentMes, periodScope, shiftPeriod } from "@/lib/finance/periodo"
import type { Periodo } from "@/lib/finance/types"
import { Icon } from "./kit"
import * as c from "./interativo.css"

const OPTS: { value: Periodo; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
]

export function PeriodBar({ tab, mes, periodo }: { tab: string; mes: string; periodo: Periodo }) {
  const router = useRouter()
  const go = (m: string, p: Periodo) =>
    router.push(`/financeiro?tab=${tab}&mes=${m}&periodo=${p}`, { scroll: false })
  const scope = periodScope(mes, periodo)

  return (
    <div className={c.periodBar}>
      <div className={c.periodNav}>
        <button type="button" className={c.navBtn} aria-label="Anterior" onClick={() => go(shiftPeriod(mes, periodo, -1), periodo)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <div className={c.periodLabelBox}>
          <div className={c.periodTitle}>{scope.title}</div>
          <div className={c.periodSub}>{scope.sub}</div>
        </div>
        <button type="button" className={c.navBtn} aria-label="Próximo" onClick={() => go(shiftPeriod(mes, periodo, 1), periodo)}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
      <button type="button" className={btn({ variant: "secondary" })} style={{ height: 30, fontSize: 12, padding: "0 11px" }} onClick={() => go(currentMes(), periodo)}>
        Hoje
      </button>
      <div className={c.segGroup}>
        {OPTS.map((o) => (
          <button key={o.value} type="button" className={c.segButton({ active: periodo === o.value, size: "sm" })} onClick={() => go(mes, o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
