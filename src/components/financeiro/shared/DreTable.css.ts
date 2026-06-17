import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const resultadoRow = style({
  borderTop: `2px solid ${tokens.color.borderStrong}`,
  background: tokens.color.bgSoft,
})

export const labelCell = style({
  fontSize: 13,
  color: tokens.color.text,
})

export const labelStrong = style({
  fontWeight: 500,
})
