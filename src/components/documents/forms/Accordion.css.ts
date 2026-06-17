import { style, keyframes } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

const slideDown = keyframes({
  from: { height: 0 },
  to: { height: "var(--radix-accordion-content-height)" },
})

const slideUp = keyframes({
  from: { height: "var(--radix-accordion-content-height)" },
  to: { height: 0 },
})

export const root = style({
  display: "flex",
  flexDirection: "column",
})

export const item = style({
  borderBottom: `1px solid ${tokens.color.border}`,
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
  },
})

export const trigger = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px 12px",
  width: "100%",
  cursor: "pointer",
  background: "transparent",
  border: "none",
})

export const headerLeft = style({
  display: "flex",
  flexDirection: "column",
})

export const title = style({
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: tokens.color.accent,
})

export const content = style({
  overflow: "hidden",
  selectors: {
    '&[data-state="open"]': {
      animation: `${slideDown} 220ms cubic-bezier(0.0, 0, 0.2, 1)`,
    },
    '&[data-state="closed"]': {
      animation: `${slideUp} 150ms cubic-bezier(0.4, 0, 1, 1)`,
    },
  },
})

export const contentInner = style({
  padding: "0 20px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
})

export const badge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 999,
  fontFeatureSettings: '"tnum"',
  border: `1px solid ${tokens.color.borderStrong}`,
  color: tokens.color.textSubtle,
  background: "transparent",
  textTransform: "none",
  flexShrink: 0,
})

export const chevron = style({
  color: tokens.color.textSubtle,
  transition: "transform 200ms ease",
  flexShrink: 0,
  selectors: {
    '[data-state="open"] &': {
      transform: "rotate(180deg)",
    },
  },
})
