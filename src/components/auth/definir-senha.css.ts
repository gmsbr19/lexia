// Estilos extras da página de ativação (/definir-senha/[token]). O layout base
// (page/card/brand…) é reusado de login.css.ts; aqui só o que é específico.
import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const intro = style({
  fontSize: 13,
  lineHeight: 1.55,
  color: tokens.color.textMuted,
  marginTop: -tokens.space["2"],
})

export const emailPill = style({
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.text,
  background: tokens.color.bgSunken,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.sm,
  padding: "8px 12px",
})

export const successBox = style({
  fontSize: 12,
  color: "var(--fin-pos, #2E7D52)",
  background: "rgba(46, 125, 82, 0.08)",
  border: "1px solid rgba(46, 125, 82, 0.25)",
  borderRadius: tokens.radius.sm,
  padding: "9px 12px",
})

export const hint = style({
  fontSize: 11,
  color: tokens.color.textMuted,
  marginTop: tokens.space["1"],
})
