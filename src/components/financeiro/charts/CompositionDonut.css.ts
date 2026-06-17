import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const wrap = style({ position: "relative", width: "100%", height: "100%" })

export const center = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
})

export const centerLabel = style({ fontSize: 11, color: tokens.color.textSubtle, letterSpacing: "0.02em" })

export const centerValue = style({
  fontSize: 16,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.02em",
  fontFeatureSettings: '"tnum"',
})
