import * as s from "./ChartLegend.css"

export function ChartLegend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return (
    <div className={s.row}>
      {items.map((it, i) => (
        <span key={i} className={s.item}>
          {it.dash ? (
            <span className={s.dash} style={{ color: it.color }} />
          ) : (
            <span className={s.swatch} style={{ background: it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  )
}
