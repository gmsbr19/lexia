"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { CompositionSlice } from "@/lib/finance/types"
import { formatBRL, formatBRLCompact } from "@/lib/finance/money"
import { tooltipContentStyle } from "./chart-theme"
import * as s from "./CompositionDonut.css"

export function CompositionDonut({ slices }: { slices: CompositionSlice[] }) {
  const data = slices
    .filter((x) => x.valorCents > 0)
    .map((x) => ({ name: x.label, value: x.valorCents / 100, color: x.color }))
  const total = slices.reduce((a, x) => a + x.valorCents, 0)

  return (
    <div className={s.wrap}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="86%" paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(value, _name, item) => [
              formatBRL(Math.round(Number(value) * 100)),
              (item as { payload?: { name?: string } })?.payload?.name ?? "",
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className={s.center}>
        <span className={s.centerLabel}>Total</span>
        <span className={s.centerValue}>{formatBRLCompact(total)}</span>
      </div>
    </div>
  )
}
