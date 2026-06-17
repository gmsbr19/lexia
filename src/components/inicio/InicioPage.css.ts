import { keyframes, style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"
import { interactiveSurface } from "@/components/documents/page/documents-page.css"

const spin = keyframes({ to: { transform: "rotate(360deg)" } })
export const spinning = style({ animation: `${spin} 0.8s linear infinite` })

export const pad = style({
  padding: "36px 40px 110px",
  "@media": {
    "screen and (max-width: 1240px)": { padding: "32px 32px 110px" },
    "screen and (max-width: 760px)": { padding: "24px 18px 100px" },
  },
})

export const greeting = style({ marginBottom: 26 })

export const greetingTitle = style({
  margin: 0,
  fontSize: 30,
  fontWeight: 600,
  letterSpacing: "-0.03em",
  color: tokens.color.text,
  "@media": { "screen and (max-width: 760px)": { fontSize: 25 } },
})

export const greetingSub = style({ margin: "6px 0 0", fontSize: 14, color: tokens.color.textMuted })

// ── Briefing semanal (AI surface) ──
export const briefingWrap = style({ marginBottom: 24 })

export const briefingCard = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowMd,
  padding: "22px 24px",
  position: "relative",
  overflow: "hidden",
})

export const briefingGlow = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background: `radial-gradient(120% 90% at 100% 0%, ${tokens.color.accentSoft} 0%, transparent 55%)`,
})

export const briefingInner = style({ position: "relative" })

export const briefingEyebrow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  fontWeight: 600,
  color: tokens.color.accent,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 13,
})

export const briefingEyebrowTag = style({
  marginLeft: 6,
  fontSize: 10,
  fontWeight: 500,
  color: tokens.color.textSubtle,
  letterSpacing: "0.04em",
})

export const briefingText = style({
  margin: 0,
  fontSize: 14,
  lineHeight: 1.6,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
})

// the AI "foco" headline — the design's "briefing-lead"
export const briefingFoco = style({
  margin: 0,
  fontSize: 17,
  lineHeight: 1.58,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
  maxWidth: 960,
})

export const briefingStrong = style({ fontWeight: 500 })
export const briefingNeg = style({ fontWeight: 500, color: "var(--fin-neg)" })
export const briefingPos = style({ fontWeight: 500, color: "var(--fin-pos)" })

// ── highlight list ──
export const destaqueList = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  marginTop: 12,
})

export const destaqueRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "7px 0",
  borderTop: `1px solid ${tokens.color.border}`,
  textDecoration: "none",
  selectors: { "&:first-child": { borderTop: "none" } },
})

export const destaqueRowLink = style({
  borderRadius: 8,
  margin: "0 -8px",
  padding: "7px 8px",
  transition: "background-color .14s ease-out",
  selectors: {
    "&:hover": { background: tokens.color.bgSunken },
    "&:first-child": { borderTop: "none" },
  },
})

export const destaqueDot = recipe({
  base: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 6 },
  variants: {
    tom: {
      pos: { background: "var(--fin-pos)" },
      neg: { background: "var(--fin-neg)" },
      gold: { background: tokens.color.accentStrong },
      neutro: { background: tokens.color.textSubtle },
    },
  },
  defaultVariants: { tom: "neutro" },
})

export const destaqueText = style({
  flex: 1,
  minWidth: 0,
  fontSize: 14,
  lineHeight: 1.5,
  letterSpacing: "-0.01em",
  color: tokens.color.textMuted,
})

export const destaqueArrow = style({
  flexShrink: 0,
  marginTop: 2,
  color: tokens.color.textSubtle,
  display: "flex",
})

export const briefingFooter = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 14,
  paddingTop: 14,
  borderTop: `1px solid ${tokens.color.border}`,
  flexWrap: "wrap",
})

export const briefingBtn = style({ height: 32, fontSize: 12, textDecoration: "none" })

export const regenBtn = style({ height: 32, fontSize: 12, padding: "0 10px" })

export const briefingMeta = style({ marginLeft: "auto", fontSize: 11, color: tokens.color.textSubtle, whiteSpace: "nowrap" })

// ── Dashboard A layout: queue (left) · atalhos (right) ──
export const gridA = style({
  display: "grid",
  gridTemplateColumns: "1.55fr 1fr",
  gap: 20,
  alignItems: "start",
  "@media": { "screen and (max-width: 1000px)": { gridTemplateColumns: "1fr" } },
})

export const subHead = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  marginBottom: 13,
})

export const subHeadTitle = style({
  margin: 0,
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "-0.015em",
  color: tokens.color.text,
})

export const quickCol = style({ display: "flex", flexDirection: "column", gap: 10 })

export const quickCard = style([
  interactiveSurface,
  { display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", textDecoration: "none" },
])

export const quickIcon = style({
  width: 36,
  height: 36,
  borderRadius: 10,
  background: tokens.color.bgSunken,
  color: tokens.color.accent,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
})

export const quickBody = style({ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 })

export const quickTitle = style({
  fontSize: 14,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
})

export const quickDesc = style({ fontSize: 12, color: tokens.color.textSubtle, marginTop: 1 })

export const quickBadge = style({
  fontSize: 11,
  fontWeight: 500,
  color: tokens.color.accent,
  background: tokens.color.accentSoft,
  padding: "2px 8px",
  borderRadius: 999,
  flexShrink: 0,
})

export const actionBtn = style({ height: 40, fontSize: 13, textDecoration: "none", flexShrink: 0 })
