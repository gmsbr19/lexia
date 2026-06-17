import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const stackedField = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
})

export const label = style({
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.textMuted,
  marginBottom: 0,
  letterSpacing: "0.01em",
})

export const input = style({
  width: "100%",
  padding: "10px 14px",
  background: tokens.color.bgSoft,
  border: "1px solid transparent",
  borderRadius: 10,
  fontFamily: tokens.font.sans,
  fontSize: 13,
  color: tokens.color.text,
  outline: "none",
  boxSizing: "border-box",
  selectors: {
    "&:focus": {
      borderColor: tokens.brand.gold,
      boxShadow: `0 0 0 3px ${tokens.color.ring}`,
    },
  },
})

export const inputMono = style({
  padding: "10px 14px",
  fontFamily: tokens.font.mono,
})

export const textarea = style({
  width: "100%",
  padding: "12px 14px",
  background: tokens.color.bgSoft,
  borderRadius: 10,
  border: "1px solid transparent",
  fontFamily: tokens.font.sans,
  fontSize: 13,
  color: tokens.color.text,
  outline: "none",
  boxSizing: "border-box",
  lineHeight: 1.6,
  resize: "vertical",
  selectors: {
    "&:focus": {
      borderColor: tokens.brand.gold,
      boxShadow: `0 0 0 3px ${tokens.color.ring}`,
    },
  },
})

export const hint = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
  marginTop: 6,
  lineHeight: 1.45,
})
