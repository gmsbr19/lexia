import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

export const list = style({ display: "flex", flexDirection: "column", gap: 16 })

export const row = style({ display: "flex", alignItems: "center", gap: 14 })

export const bucket = style({ fontSize: 12, color: tokens.color.textMuted, width: 84, flexShrink: 0 })

export const track = style({
  flex: 1,
  height: 22,
  background: tokens.color.bgSunken,
  borderRadius: 6,
  overflow: "hidden",
})

export const fill = recipe({
  base: { height: "100%", borderRadius: 6, opacity: 0.9 },
  variants: {
    tone: { green: { background: "#2E9E5B" }, amber: { background: "#D98A2B" }, red: { background: "#C0492F" } },
  },
})

export const value = style({
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.text,
  fontFamily: tokens.font.mono,
  fontFeatureSettings: '"tnum"',
  width: 92,
  textAlign: "right",
  userSelect: "text",
})

export const count = style({ fontSize: 11, color: tokens.color.textSubtle, width: 64, textAlign: "right" })
