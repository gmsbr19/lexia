import { formatBRLCompact } from "@/lib/finance/money"
import * as s from "./BreakEvenBar.css"

// Receita realizada vs. the monthly fixed-cost break-even marker.
export function BreakEvenBar({
  custoFixoMensalCents,
  receitaMediaMensalCents,
}: {
  custoFixoMensalCents: number
  receitaMediaMensalCents: number
}) {
  if (custoFixoMensalCents <= 0) {
    return <div className={s.note}>Configure os custos fixos para calcular o ponto de equilíbrio.</div>
  }
  const scaleMax = Math.max(receitaMediaMensalCents, custoFixoMensalCents) * 1.18
  const recPct = Math.min(100, (receitaMediaMensalCents / scaleMax) * 100)
  const bePct = Math.min(100, (custoFixoMensalCents / scaleMax) * 100)
  const acima = receitaMediaMensalCents >= custoFixoMensalCents
  const diff = Math.abs(receitaMediaMensalCents - custoFixoMensalCents)

  return (
    <div>
      <div className={s.track}>
        <div className={s.fill({ tone: acima ? "green" : "amber" })} style={{ width: `${recPct}%` }} />
        <div className={s.marker} style={{ left: `${bePct}%` }} />
      </div>
      <div className={s.markerRow}>
        <span className={s.markerLabel} style={{ left: `${bePct}%` }}>
          ponto de equilíbrio · {formatBRLCompact(custoFixoMensalCents)}
        </span>
      </div>
      <div className={s.footer}>
        <div className={s.legend}>
          <span className={s.legendDot} />
          Receita média / mês
        </div>
        <span className={s.delta({ dir: acima ? "up" : "down" })}>
          {acima ? "+" : "−"}
          {formatBRLCompact(diff)} {acima ? "acima do ponto" : "abaixo"}
        </span>
      </div>
    </div>
  )
}
