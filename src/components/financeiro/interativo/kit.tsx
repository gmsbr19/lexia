// Pure presentational atoms for the Financeiro interativo (server-safe).
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Download,
  FileCheck2,
  Filter,
  Home,
  type LucideIcon,
  MinusCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sigma,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"
import type { LancDir, LancSituacao } from "@/lib/finance/types"
import { fmtMoney, SIT_LABEL } from "./fx"
import * as c from "./interativo.css"

const ICONS = {
  home: Home,
  receipt: Receipt,
  trendingUp: TrendingUp,
  banknote: Banknote,
  clock: Clock,
  arrowUpRight: ArrowUpRight,
  arrowDownRight: ArrowDownRight,
  arrowRight: ArrowRight,
  sigma: Sigma,
  wallet: Wallet,
  alertTriangle: AlertTriangle,
  checkCircle: CheckCircle2,
  search: Search,
  download: Download,
  filter: Filter,
  plus: Plus,
  minusCircle: MinusCircle,
  moreHorizontal: MoreHorizontal,
  edit: Pencil,
  refreshCw: RefreshCw,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  calendar: Calendar,
  circleDot: CircleDot,
  paperclip: Paperclip,
  fileCheck: FileCheck2,
  x: X,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 15, strokeWidth = 1.9, className }: { name: IconName; size?: number; strokeWidth?: number; className?: string }) {
  const C = ICONS[name]
  return <C size={size} strokeWidth={strokeWidth} className={className} />
}

const POS = "var(--fin-pos,#2E9E5B)"
const NEG = "var(--fin-neg,#C0492F)"

export function FxMoney({ valorCents, dir, plain = false, size = 13, weight = 500 }: { valorCents: number; dir: LancDir; plain?: boolean; size?: number; weight?: number }) {
  const neg = dir === "out"
  const color = plain ? "var(--text)" : neg ? NEG : POS
  const prefix = plain ? "" : neg ? "−" : "+"
  return (
    <span className={c.money} style={{ fontSize: size, fontWeight: weight, color }}>
      {prefix}
      {fmtMoney(valorCents).replace("−", "")}
    </span>
  )
}

const PILL: Record<LancSituacao, { bg: string; fg: string }> = {
  pago: { bg: "rgba(46,158,91,0.10)", fg: POS },
  vencido: { bg: "rgba(192,73,47,0.10)", fg: NEG },
  avencer: { bg: "var(--bg-sunken)", fg: "var(--text-muted)" },
}

export function FxStatusPill({ status }: { status: LancSituacao }) {
  const t = PILL[status]
  return (
    <span className={c.pill} style={{ background: t.bg, color: t.fg }}>
      <span className={c.pillDot} />
      {SIT_LABEL[status]}
    </span>
  )
}

export function FxCheck({ checked, indeterminate, onChange, title }: { checked: boolean; indeterminate?: boolean; onChange: () => void; title?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      title={title}
      className={c.check({ on: checked || !!indeterminate })}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
    >
      {checked && <Icon name="check" size={11} strokeWidth={3.2} />}
      {!checked && indeterminate && <span className={c.checkDash} />}
    </button>
  )
}

export function FxDirChip({ dir, compact = false }: { dir: LancDir; compact?: boolean }) {
  const inc = dir === "in"
  return (
    <span className={c.dirChip} style={{ color: inc ? POS : NEG }}>
      <span className={c.dirIcon} style={{ background: inc ? "rgba(46,158,91,0.13)" : "rgba(192,73,47,0.13)" }}>
        <Icon name={inc ? "arrowDownRight" : "arrowUpRight"} size={12} strokeWidth={2.2} />
      </span>
      {!compact && (inc ? "A receber" : "A pagar")}
    </span>
  )
}

export function FxCatChip({ label }: { label: string }) {
  return <span className={c.catChip}>{label}</span>
}

export function FxKpi({ label, value, sub, icon, accent, tone }: { label: string; value: string; sub?: string; icon?: IconName; accent?: "gold" | "neutral"; tone?: "pos" | "neg" }) {
  return (
    <div className={c.kpiCard}>
      <div className={c.kpiTop}>
        <span className={c.kpiLabel}>{label}</span>
        {icon && (
          <div className={c.kpiIcon({ accent: accent ?? "neutral" })}>
            <Icon name={icon} size={14} strokeWidth={1.8} />
          </div>
        )}
      </div>
      <span className={c.kpiValue} style={{ color: tone === "neg" ? NEG : tone === "pos" ? POS : "var(--text)" }}>
        {value}
      </span>
      {sub && <span className={c.kpiSub}>{sub}</span>}
    </div>
  )
}
