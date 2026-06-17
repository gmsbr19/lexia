import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const pad = style({
  padding: "28px 40px 40px",
})

export const header = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 24,
})

export const title = style({
  margin: 0,
  fontSize: 25,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  color: tokens.color.text,
})

export const subtitle = style({
  margin: "6px 0 0",
  fontSize: 13,
  color: tokens.color.textMuted,
})

export const sectionTitle = style({
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: tokens.color.textSubtle,
  marginBottom: 12,
})

export const sectionGap = style({
  marginBottom: 24,
})

export const grid2 = style({
  display: "grid",
  gridTemplateColumns: "1.6fr 1fr",
  gap: 16,
  marginBottom: 20,
  "@media": {
    "screen and (max-width: 1100px)": { gridTemplateColumns: "1fr" },
  },
})

export const chartCard = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  padding: 18,
})

export const chartCardHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
})

export const chartCardTitle = style({
  fontSize: 14,
  fontWeight: 500,
  color: tokens.color.text,
})

export const chartCardHint = style({
  fontSize: 12,
  color: tokens.color.textSubtle,
})

/** Charts need an explicit height so Recharts' ResponsiveContainer paints. */
export const chartBox = style({
  width: "100%",
  height: 300,
})

export const donutBox = style({
  width: "100%",
  height: 240,
})

export const alertBanner = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  borderRadius: 14,
  background: "rgba(217,138,43,0.10)",
  border: "1px solid rgba(217,138,43,0.16)",
  color: "#D98A2B",
  fontSize: 13,
  marginBottom: 16,
})

export const emptyState = style({
  padding: "40px 24px",
  textAlign: "center",
  color: tokens.color.textMuted,
  fontSize: 13,
  background: tokens.color.bgSoft,
  borderRadius: 14,
  border: `1px dashed ${tokens.color.border}`,
})

export const numericCell = style({
  fontFeatureSettings: '"tnum"',
  textAlign: "right",
  whiteSpace: "nowrap",
  // financial values should be selectable for copy (global sets user-select:none)
  userSelect: "text",
})
