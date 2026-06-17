import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const page = style({
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: tokens.color.bg,
  padding: tokens.space["6"],
})

export const card = style({
  width: "100%",
  maxWidth: 380,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.lg,
  boxShadow: tokens.color.shadowLg,
  padding: tokens.space["7"],
  display: "flex",
  flexDirection: "column",
  gap: tokens.space["6"],
})

export const brand = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space["3"],
})

export const brandMark = style({
  width: 38,
  height: 38,
  borderRadius: tokens.radius.sm,
  background: tokens.brand.navy,
  color: tokens.brand.gold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  fontWeight: 500,
  flexShrink: 0,
})

export const brandTitle = style({
  fontSize: 16,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.02em",
})

export const brandSubtitle = style({
  fontSize: 12,
  color: tokens.color.textMuted,
  marginTop: 2,
})

export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.space["4"],
})

export const errorBox = style({
  fontSize: 12,
  color: "var(--fin-neg, #C0492F)",
  background: "rgba(192, 73, 47, 0.08)",
  border: "1px solid rgba(192, 73, 47, 0.25)",
  borderRadius: tokens.radius.sm,
  padding: "9px 12px",
})
