import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"
import { lexGlassStrong } from "@/styles/glass.css"

export const card = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  padding: "16px 18px",
})

export const head = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 6,
})

export const headLeft = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
})

export const headIcon = style({
  width: 28,
  height: 28,
  borderRadius: 8,
  background: tokens.color.accentSoft,
  color: tokens.color.accent,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
})

export const headTitle = style({
  fontSize: 14,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
})

export const headSub = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
})

export const headLink = style({
  fontSize: 12,
  color: tokens.color.accent,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  textDecoration: "none",
})

// Row container: holds the (clickable) item + the dismiss menu side by side, and
// carries the separator so the dismiss button is excluded from the link's hit area.
export const rowWrap = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  borderTop: `1px solid ${tokens.color.border}`,
  selectors: { "&:first-child": { borderTop: "none" } },
})

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: "13px 4px",
  textDecoration: "none",
  flex: 1,
  minWidth: 0,
})

export const dismissBtn = style({
  flexShrink: 0,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: tokens.color.textSubtle,
  cursor: "pointer",
  selectors: { "&:hover": { background: tokens.color.bgSunken, color: tokens.color.text } },
})

export const menu = style([
  lexGlassStrong,
  {
    minWidth: 200,
    borderRadius: 10,
    padding: 6,
    zIndex: 60,
    vars: { "--lex-elevation": "0 12px 28px rgba(2,13,37,0.16)" },
  },
])

export const menuItem = style({
  fontSize: 12.5,
  color: tokens.color.text,
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
  outline: "none",
  selectors: { "&[data-highlighted]": { background: tokens.color.bgSunken } },
})

export const iconCircle = recipe({
  base: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  variants: {
    tone: {
      alta: { background: "rgba(192,73,47,0.10)", color: "#C0492F" },
      media: { background: "rgba(217,138,43,0.12)", color: "#D98A2B" },
      baixa: { background: tokens.color.accentSoft, color: tokens.color.accent },
    },
  },
})

export const body = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  flex: 1,
})

export const titleRow = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
})

export const itemTitle = style({
  fontSize: 13,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
})

export const iaBadge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontSize: "9.5px",
  fontWeight: 500,
  color: tokens.color.accent,
  background: tokens.color.accentSoft,
  padding: "1px 6px",
  borderRadius: 999,
  flexShrink: 0,
})

export const itemCtx = style({
  fontSize: 12,
  color: tokens.color.textMuted,
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
})

export const cta = style({ height: 30, fontSize: 12, padding: "0 12px", flexShrink: 0 })

export const empty = style({
  padding: "24px 4px",
  textAlign: "center",
  color: tokens.color.textMuted,
  fontSize: 12,
})
