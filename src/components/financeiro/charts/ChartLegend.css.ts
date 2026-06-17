import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const row = style({ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" })

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12,
  color: tokens.color.textMuted,
})

export const swatch = style({ width: 12, height: 10, borderRadius: 3, flexShrink: 0 })

export const dash = style({ width: 12, height: 0, borderTop: "2px dashed currentColor", flexShrink: 0 })
