import type { LucideIcon } from "lucide-react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { formatBRLCompact } from "@/lib/finance/money"
import * as s from "./KpiCard.css"

export interface KpiDelta {
  label: string
  dir: "up" | "down"
}

/** KPI cell: label + icon, big value, optional colored delta, sub line. */
export function KpiCard({
  label,
  value,
  cents,
  delta,
  sub,
  icon: Icon,
  accent = "neutral",
}: {
  label: string
  value?: string
  cents?: number
  delta?: KpiDelta | null
  sub?: string
  icon?: LucideIcon
  accent?: "gold" | "neutral"
}) {
  // KPI cards use compact currency (e.g. "R$ 336,7 mil") to stay glanceable.
  const text = value ?? (cents !== undefined ? formatBRLCompact(cents) : "—")
  const Trend = delta?.dir === "down" ? TrendingDown : TrendingUp
  return (
    <div className={s.card}>
      <div className={s.top}>
        <span className={s.label}>{label}</span>
        {Icon && (
          <div className={s.iconBox({ accent })}>
            <Icon size={14} strokeWidth={1.8} />
          </div>
        )}
      </div>
      <div className={s.valueRow}>
        <span className={s.value}>{text}</span>
        {delta && (
          <span className={s.delta({ dir: delta.dir })}>
            <Trend size={12} strokeWidth={2} />
            {delta.label}
          </span>
        )}
      </div>
      {sub && <span className={s.sub}>{sub}</span>}
    </div>
  )
}
