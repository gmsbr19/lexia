import type { AgingBucket } from "@/lib/finance/types"
import { formatBRLCompact } from "@/lib/finance/money"
import * as s from "./AgingBars.css"

const TONE: Record<AgingBucket["key"], "green" | "amber" | "red"> = {
  a_vencer: "green",
  d1_30: "amber",
  d31_60: "amber",
  d60_plus: "red",
}

/** Horizontal aging bars — a-vencer / 1–30 / 31–60 / 60+ days. */
export function AgingBars({ buckets }: { buckets: AgingBucket[] }) {
  const max = Math.max(...buckets.map((b) => b.valorCents), 1)
  return (
    <div className={s.list}>
      {buckets.map((b) => (
        <div key={b.key} className={s.row}>
          <span className={s.bucket}>{b.label}</span>
          <div className={s.track}>
            <div className={s.fill({ tone: TONE[b.key] })} style={{ width: `${(b.valorCents / max) * 100}%` }} />
          </div>
          <span className={s.value}>{formatBRLCompact(b.valorCents)}</span>
          <span className={s.count}>{b.count} títulos</span>
        </div>
      ))}
    </div>
  )
}
