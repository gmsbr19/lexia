import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

export const card = style({
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 112,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
})

export const top = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
})

export const label = style({
  fontSize: 12,
  color: tokens.color.textMuted,
  fontWeight: 500,
  letterSpacing: "0.01em",
})

export const iconBox = recipe({
  base: {
    width: 26,
    height: 26,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  variants: {
    accent: {
      gold: { background: tokens.color.accentSoft, color: tokens.color.accent },
      neutral: { background: tokens.color.bgSunken, color: tokens.color.textMuted },
    },
  },
  defaultVariants: { accent: "neutral" },
})

export const valueRow = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
})

export const value = style({
  fontSize: 25,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.025em",
  fontFeatureSettings: '"tnum"',
  userSelect: "text",
})

export const delta = recipe({
  base: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 500 },
  variants: {
    dir: { up: { color: "var(--fin-pos)" }, down: { color: "var(--fin-neg)" } },
  },
})

export const sub = style({
  fontSize: 12,
  color: tokens.color.textSubtle,
  marginTop: -2,
})
