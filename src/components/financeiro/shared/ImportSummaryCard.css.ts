import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 16,
  flexWrap: "wrap",
})

export const toolbarHint = style({
  fontSize: 12,
  color: tokens.color.textSubtle,
})

export const countGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 12,
  marginBottom: 24,
})

export const countCell = style({
  padding: "12px 14px",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
})

export const countValue = style({
  fontSize: 20,
  fontWeight: 500,
  color: tokens.color.text,
  fontFeatureSettings: '"tnum"',
})

export const countLabel = style({
  fontSize: 11,
  color: tokens.color.textMuted,
  marginTop: 2,
})
