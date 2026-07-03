import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

export const tabStrip = style({
  display: "flex",
  alignItems: "center",
  gap: 0,
  borderBottom: `1px solid ${tokens.color.border}`,
  padding: "0 40px",
  background: tokens.color.bg,
  flexShrink: 0,
  height: "fit-content",
})

export const moduleLabel = style({
  marginLeft: "auto",
  fontSize: 13,
  color: tokens.color.textSubtle,
  fontFamily: tokens.font.sans,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
  "@media": { "screen and (max-width: 720px)": { display: "none" } },
})

export const tabButton = recipe({
  base: {
    height: 44,
    padding: "0 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: tokens.font.sans,
    fontSize: "14px",
    fontWeight: 400,
    color: tokens.color.textMuted,
    borderBottom: "2px solid transparent",
    marginBottom: -1,
    transition: "color 0.15s ease, border-color 0.15s ease",
  },
  variants: {
    active: {
      true: {
        fontWeight: 500,
        color: tokens.color.text,
        borderBottomColor: tokens.color.accent,
      },
    },
  },
})
