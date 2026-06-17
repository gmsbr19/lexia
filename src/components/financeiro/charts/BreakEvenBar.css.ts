import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

export const track = style({
  position: "relative",
  height: 34,
  background: tokens.color.bgSunken,
  borderRadius: 8,
  overflow: "hidden",
})

export const fill = recipe({
  base: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 8, opacity: 0.88 },
  variants: { tone: { green: { background: "#2E9E5B" }, amber: { background: "#D98A2B" } } },
})

export const marker = style({
  position: "absolute",
  top: -6,
  bottom: -6,
  width: 0,
  borderLeft: `2px dashed ${tokens.color.text}`,
})

export const markerRow = style({ position: "relative", height: 18, marginTop: 4 })

export const markerLabel = style({
  position: "absolute",
  transform: "translateX(-50%)",
  fontSize: 11,
  color: tokens.color.textMuted,
  whiteSpace: "nowrap",
})

export const footer = style({ display: "flex", justifyContent: "space-between", marginTop: 8 })

export const legend = style({ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: tokens.color.textMuted })

export const legendDot = style({ width: 9, height: 9, borderRadius: 6, background: "#2E9E5B" })

export const delta = recipe({
  base: { fontSize: 12, fontWeight: 500 },
  variants: { dir: { up: { color: "var(--fin-pos)" }, down: { color: "var(--fin-neg)" } } },
})

export const note = style({ fontSize: 12, color: tokens.color.textSubtle })
