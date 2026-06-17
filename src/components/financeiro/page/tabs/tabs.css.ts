import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const donutRow = style({
  display: "grid",
  gridTemplateColumns: "240px 1fr",
  gap: 16,
  alignItems: "center",
  "@media": { "screen and (max-width: 760px)": { gridTemplateColumns: "1fr" } },
})

export const legendList = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
})

export const legendItem = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
})

export const legendSwatch = style({
  width: 10,
  height: 10,
  borderRadius: 3,
  flexShrink: 0,
})

export const legendLabel = style({
  flex: 1,
  fontSize: 13,
  color: tokens.color.text,
})

export const legendPct = style({
  fontSize: 12,
  color: tokens.color.textMuted,
  fontFeatureSettings: '"tnum"',
  width: 44,
  textAlign: "right",
})

export const legendValue = style({
  fontSize: 13,
  fontWeight: 500,
  color: tokens.color.text,
  fontFeatureSettings: '"tnum"',
  userSelect: "text",
  minWidth: 100,
  textAlign: "right",
})

export const twoCol = style({
  display: "grid",
  gridTemplateColumns: "1.3fr 1fr",
  gap: 16,
  marginBottom: 20,
  "@media": { "screen and (max-width: 1000px)": { gridTemplateColumns: "1fr" } },
})

export const swatch = style({
  width: 10,
  height: 10,
  borderRadius: 3,
  display: "inline-block",
  marginRight: 8,
  verticalAlign: "middle",
})

export const mutedCell = style({
  fontSize: 12,
  color: tokens.color.textMuted,
})
