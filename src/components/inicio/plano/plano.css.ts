import { globalStyle, style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

export const pad = style({ padding: "28px 40px 44px" })

// ── header ──
export const headRow = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
  flexWrap: "wrap",
})

export const title = style({
  margin: 0,
  fontSize: 25,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  color: tokens.color.text,
})

export const subtitle = style({ margin: "5px 0 0", fontSize: 12, color: tokens.color.textMuted })

export const smallBtn = style({ height: 30, fontSize: 12, padding: "0 10px" })
export const actionBtn = style({ height: 32, fontSize: 12 })

// ── impact hero ──
export const hero = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowMd,
  padding: "22px 24px",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  gap: 28,
  marginBottom: 22,
  flexWrap: "wrap",
})

export const heroGlow = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background: `radial-gradient(circle at 100% 0%, ${tokens.color.accentSoft} 0%, transparent 48%)`,
})

export const heroBody = style({ position: "relative", flex: 1, minWidth: 0 })

export const heroEyebrow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  fontWeight: 500,
  color: tokens.color.accent,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 10,
})

export const heroTitle = style({
  fontSize: 25,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.03em",
  lineHeight: 1.1,
})

export const heroPos = style({ color: "var(--fin-pos)" })

export const heroSub = style({
  margin: "8px 0 0",
  fontSize: 14,
  color: tokens.color.textMuted,
  lineHeight: 1.55,
  maxWidth: 520,
})

export const heroStats = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 18,
  paddingLeft: 28,
  borderLeft: `1px solid ${tokens.color.border}`,
  flexShrink: 0,
  // when the hero wraps on narrow widths, drop the divider/indent so the stats
  // sit cleanly under the copy instead of off to the side
  "@media": {
    "screen and (max-width: 720px)": { paddingLeft: 0, borderLeft: "none", width: "100%" },
  },
})

export const heroStatCol = style({ display: "flex", flexDirection: "column", gap: 9 })

export const heroStatLabel = style({ fontSize: 12, color: tokens.color.textSubtle, marginBottom: 1 })

export const heroStatValue = style({
  fontSize: 16,
  fontWeight: 500,
  color: tokens.color.text,
  fontFeatureSettings: '"tnum"',
})

export const heroStatTotal = style({ color: tokens.color.textSubtle, fontWeight: 500 })

export const heroRecovered = recipe({
  base: { fontSize: 16, fontWeight: 500, fontFeatureSettings: '"tnum"' },
  variants: {
    positive: { true: { color: "var(--fin-pos)" }, false: { color: tokens.color.text } },
  },
})

export const heroDone = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 500,
  color: "var(--fin-pos)",
})

// ── progress ring ──
export const ring = style({ position: "relative", flexShrink: 0 })

export const ringSvg = style({ transform: "rotate(-90deg)" })

export const ringTrack = style({ stroke: tokens.color.bgSunken })

export const ringBar = style({
  stroke: tokens.color.accent,
  transition: "stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)",
})

export const ringLabel = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.03em",
  fontFeatureSettings: '"tnum"',
})

// ── layout ──
export const grid = style({
  display: "grid",
  gridTemplateColumns: "1.62fr 1fr",
  gap: 20,
  alignItems: "start",
  "@media": { "screen and (max-width: 1000px)": { gridTemplateColumns: "1fr" } },
})

// grid items default to min-width:auto and refuse to shrink below their content
// (a long step title) → horizontal overflow. Pin both tracks to min-width:0.
// (globalStyle: vanilla-extract forbids `& > *` inside a style block.)
globalStyle(`${grid} > *`, { minWidth: 0 })

export const rail = style({ display: "flex", flexDirection: "column", gap: 18 })

// ── group card ──
export const card = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  padding: "16px 18px",
})

export const groupCard = style([card, { marginBottom: 16 }])

export const groupHead = style({ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 })

export const groupIcon = recipe({
  base: {
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  variants: {
    tone: {
      vencido: { background: "rgba(192,73,47,0.10)", color: "var(--fin-neg)" },
      alerta: { background: tokens.color.warnSoft, color: "var(--fin-amber)" },
      gold: { background: tokens.color.accentSoft, color: tokens.color.accent },
      espera: { background: tokens.color.neutralSoft, color: tokens.color.textMuted },
    },
  },
  defaultVariants: { tone: "gold" },
})

export const groupBody = style({ flex: 1, minWidth: 0 })

export const groupTitleRow = style({ display: "flex", alignItems: "center", gap: 9 })

export const groupTitle = style({
  fontSize: 14,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.015em",
})

export const groupValuePill = recipe({
  base: {
    fontSize: 11,
    fontWeight: 500,
    padding: "2px 9px",
    borderRadius: 999,
    fontFeatureSettings: '"tnum"',
    whiteSpace: "nowrap",
  },
  variants: {
    tone: {
      vencido: { background: "rgba(192,73,47,0.10)", color: "var(--fin-neg)" },
      alerta: { background: tokens.color.warnSoft, color: "var(--fin-amber)" },
      gold: { background: tokens.color.accentSoft, color: tokens.color.accent },
      espera: { background: tokens.color.neutralSoft, color: tokens.color.textMuted },
    },
  },
  defaultVariants: { tone: "gold" },
})

export const groupDesc = style({ fontSize: 12, color: tokens.color.textSubtle, marginTop: 2 })

export const groupCount = recipe({
  base: { fontSize: 12, fontWeight: 500, fontFeatureSettings: '"tnum"', flexShrink: 0 },
  variants: {
    complete: { true: { color: "var(--fin-pos)" }, false: { color: tokens.color.textMuted } },
  },
})

// ── action step ──
export const step = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 4px",
    borderTop: `1px solid ${tokens.color.border}`,
    transition: "opacity .2s",
    selectors: { "&:first-child": { borderTop: "none" } },
  },
  variants: { done: { true: { opacity: 0.55 }, false: {} } },
})

export const check = recipe({
  base: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    flexShrink: 0,
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color .15s ease-out, border-color .15s ease-out, color .15s ease-out, box-shadow .15s ease-out",
  },
  variants: {
    done: {
      true: { border: "none", background: "var(--fin-pos)", color: "#fff" },
      false: { border: `1.8px solid ${tokens.color.borderStrong}`, background: "transparent", color: "transparent" },
    },
  },
})

export const stepBody = style({ flex: 1, minWidth: 0 })

export const stepTitleRow = style({ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" })

export const stepTitle = recipe({
  base: {
    minWidth: 0, // allow the title to ellipsize as a flex child instead of overflowing
    fontSize: 14,
    fontWeight: 500,
    color: tokens.color.text,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  variants: {
    done: {
      true: { textDecoration: "line-through", textDecorationColor: tokens.color.textSubtle },
      false: {},
    },
  },
})

export const iaBadge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontSize: 11,
  fontWeight: 500,
  color: tokens.color.accent,
  background: tokens.color.accentSoft,
  padding: "1px 6px",
  borderRadius: 999,
  flexShrink: 0,
})

export const priorityPill = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 6,
    flexShrink: 0,
    letterSpacing: "0.01em",
    "::before": {
      content: '""',
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "currentColor",
      flexShrink: 0,
    },
  },
  variants: {
    level: {
      Alta: { background: "rgba(192,73,47,0.10)", color: "var(--fin-neg)" },
      Média: { background: tokens.color.bgSunken, color: tokens.color.textMuted },
      Baixa: { background: tokens.color.bgSunken, color: tokens.color.textSubtle },
    },
  },
})

export const stepCtx = style({
  fontSize: 12,
  color: tokens.color.textMuted,
  marginTop: 3,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})

export const stepValue = style({ textAlign: "right", flexShrink: 0, marginRight: 4 })

export const stepValueMoney = style({
  fontSize: 14,
  fontWeight: 500,
  color: tokens.color.text,
  fontFeatureSettings: '"tnum"',
  letterSpacing: "-0.01em",
})

export const stepValueKind = style({ fontSize: 11, color: tokens.color.textSubtle })

export const stepCta = style({
  height: 30,
  fontSize: 12,
  padding: "0 12px",
  flexShrink: 0,
  width: 132,
  justifyContent: "center",
  textDecoration: "none",
})

export const stepDoneBtn = style({
  height: 30,
  fontSize: 12,
  padding: "0 10px",
  flexShrink: 0,
  width: 132,
  justifyContent: "center",
  color: "var(--fin-pos)",
})

// ── side rail: reasoning ──
export const reasonCard = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  padding: "16px 18px",
  position: "relative",
  overflow: "hidden",
})

export const reasonGlow = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background: `radial-gradient(circle at 0% 0%, ${tokens.color.accentSoft} 0%, transparent 55%)`,
})

export const reasonInner = style({ position: "relative" })

export const reasonEyebrow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  fontWeight: 500,
  color: tokens.color.accent,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 12,
})

export const reasonList = style({ display: "flex", flexDirection: "column", gap: 11 })

export const reasonItem = style({ display: "flex", gap: 10, alignItems: "flex-start" })

export const reasonIcon = style({
  width: 24,
  height: 24,
  borderRadius: 8,
  background: tokens.color.bgSunken,
  color: tokens.color.textMuted,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginTop: 1,
})

export const reasonText = style({ margin: 0, fontSize: 12, lineHeight: 1.5, color: tokens.color.textMuted })

export const reasonFooter = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 14,
  paddingTop: 13,
  borderTop: `1px solid ${tokens.color.border}`,
})

export const reasonMeta = style({ marginLeft: "auto", fontSize: 11, color: tokens.color.textSubtle })

// ── side rail: timeline ──
export const timelineHead = style({ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 })

export const timelineHeadIcon = style({ color: tokens.color.textMuted, display: "flex" })

export const timelineTitle = style({
  fontSize: 14,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
})

export const timelineList = style({ display: "flex", flexDirection: "column", gap: 15 })

export const timelineRow = style({ display: "flex", gap: 11 })

export const timelineSpine = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flexShrink: 0,
})

export const timelineDot = recipe({
  base: { width: 9, height: 9, borderRadius: "50%", marginTop: 3 },
  variants: {
    tone: {
      vencido: { background: "var(--fin-neg)" },
      alerta: { background: "var(--fin-amber)" },
      gold: { background: tokens.color.accentStrong },
    },
  },
})

export const timelineLine = style({ flex: 1, width: 1.5, background: tokens.color.border, marginTop: 4 })

export const timelineWhen = style({ fontSize: 12, fontWeight: 500, color: tokens.color.text, marginBottom: 4 })

export const timelineItems = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 3,
})

export const timelineItem = style({ fontSize: 12, color: tokens.color.textMuted, lineHeight: 1.4 })

// ── empty state ──
export const empty = style([
  card,
  {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "48px 24px",
    textAlign: "center",
    color: tokens.color.textMuted,
    fontSize: 14,
  },
])

export const emptyIcon = style({ color: "var(--fin-pos)" })
