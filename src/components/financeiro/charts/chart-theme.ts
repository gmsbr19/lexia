import type { CSSProperties } from "react"
import { tokens } from "@/styles/tokens.css"

// Token-driven palette for Recharts. The token values are CSS custom
// properties (e.g. "var(--brand-navy)"), so charts follow light/dark themes.
export const CHART = {
  recebido: "#1F3A6E", // chart navy (lighter than brand navy for legibility)
  aReceber: "#C0A147", // gold — open / projection
  positivo: "#2E9E5B", // green
  amber: "#D98A2B", // 1–60 overdue
  vermelho: "#C0492F", // 60+ overdue
  slate: "#7C8AA8", // à vista
  axis: tokens.color.textSubtle,
  grid: tokens.color.border,
}

export const tooltipContentStyle: CSSProperties = {
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 10,
  fontSize: 12,
  boxShadow: tokens.color.shadowMd,
  color: tokens.color.text,
}

export const tooltipLabelStyle: CSSProperties = {
  color: tokens.color.textSubtle,
  fontSize: 11,
  marginBottom: 2,
}
