import { formatBRL } from "@/lib/finance/money"

/** Renders integer centavos as BRL, optionally tinting by sign. */
export function MoneyValue({
  cents,
  className,
  colorBySign = false,
}: {
  cents: number
  className?: string
  colorBySign?: boolean
}) {
  const color = colorBySign ? (cents < 0 ? "var(--fin-neg,#C0492F)" : cents > 0 ? "var(--fin-pos,#2E9E5B)" : undefined) : undefined
  return (
    <span className={className} style={color ? { color } : undefined}>
      {formatBRL(cents)}
    </span>
  )
}
