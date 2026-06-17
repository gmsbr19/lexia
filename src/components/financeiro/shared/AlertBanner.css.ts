import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

export const banner = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    borderRadius: tokens.radius.md,
    marginBottom: 20,
  },
  variants: {
    tone: {
      vencido: { background: "rgba(192,73,47,0.10)", border: "1px solid rgba(192,73,47,0.16)" },
      alerta: { background: "rgba(217,138,43,0.10)", border: "1px solid rgba(217,138,43,0.16)" },
    },
  },
})

export const iconWrap = recipe({
  base: { flexShrink: 0, display: "flex" },
  variants: { tone: { vencido: { color: "#C0492F" }, alerta: { color: "#C77E1F" } } },
})

export const body = style({ flex: 1, minWidth: 0 })

export const title = style({
  fontSize: 13,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
})

export const desc = style({ fontSize: 12, color: tokens.color.textMuted, marginTop: 2 })
