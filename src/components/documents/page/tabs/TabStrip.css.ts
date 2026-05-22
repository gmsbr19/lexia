import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

export const tabStrip = style({
  display: "flex",
  gap: 0,
  borderBottom: `1px solid ${tokens.color.border}`,
  padding: "0 40px",
  background: tokens.color.bg,
  flexShrink: 0,
})

export const tabButton = recipe({
  base: {
    height: 44,
    padding: "0 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: tokens.font.sans,
    fontSize: "13.5px",
    fontWeight: 400,
    color: tokens.color.textMuted,
    borderBottom: "2px solid transparent",
    marginBottom: -1,
    transition: "color 0.15s ease, border-color 0.15s ease",
  },
  variants: {
    active: {
      true: {
        fontWeight: 600,
        color: tokens.color.text,
        borderBottomColor: tokens.color.accent,
      },
    },
  },
})
