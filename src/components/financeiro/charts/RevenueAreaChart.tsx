"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { MonthlyRevenuePoint } from "@/lib/finance/types"
import { formatBRL, formatBRLCompact } from "@/lib/finance/money"
import { CHART, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme"

// Stacked: recebido (navy) + a receber (gold) on top. Future months are shaded
// + marked with a dashed divider — the "melting" projection.
export function RevenueAreaChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const chartData = data.map((d) => ({
    label: d.label,
    recebido: d.recebidoCents / 100,
    aReceber: d.aReceberCents / 100,
    isFuture: d.isFuture,
  }))
  const firstFuture = chartData.find((d) => d.isFuture)?.label
  const lastLabel = chartData[chartData.length - 1]?.label

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gRecebido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.recebido} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART.recebido} stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="gAReceber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.aReceber} stopOpacity={0.34} />
            <stop offset="100%" stopColor={CHART.aReceber} stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        {firstFuture && lastLabel && firstFuture !== lastLabel && (
          <ReferenceArea x1={firstFuture} x2={lastLabel} fill={CHART.aReceber} fillOpacity={0.05} />
        )}
        {firstFuture && (
          <ReferenceLine x={firstFuture} stroke={CHART.axis} strokeDasharray="3 3" strokeOpacity={0.6} />
        )}
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => formatBRLCompact(Math.round(Number(v) * 100))}
          tick={{ fontSize: 11, fill: CHART.axis }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value, name) => [
            formatBRL(Math.round(Number(value) * 100)),
            String(name) === "recebido" ? "Recebido" : "A receber",
          ]}
        />
        <Area
          type="monotone"
          dataKey="recebido"
          name="recebido"
          stackId="1"
          stroke={CHART.recebido}
          strokeWidth={2.4}
          fill="url(#gRecebido)"
        />
        <Area
          type="monotone"
          dataKey="aReceber"
          name="aReceber"
          stackId="1"
          stroke={CHART.aReceber}
          strokeWidth={2}
          fill="url(#gAReceber)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
