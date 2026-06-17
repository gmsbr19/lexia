import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

// Faithful port of the "LexIA · Início" design (home-page.jsx): KPI grid (5) +
// two columns of stacked panels. Token-mapped so it tracks light/dark.

// ── KPI grid ──
export const kpiGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 14,
  marginBottom: 24,
  "@media": {
    "screen and (max-width: 1240px)": { gridTemplateColumns: "repeat(3, 1fr)" },
    "screen and (max-width: 760px)": { gridTemplateColumns: "repeat(2, 1fr)" },
    "screen and (max-width: 440px)": { gridTemplateColumns: "1fr 1fr", gap: 10 },
  },
})

export const kpiCard = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.lg,
  padding: "16px 17px",
  minWidth: 0,
  transition: "border-color .14s",
  selectors: { "&:hover": { borderColor: tokens.color.borderStrong } },
})

export const kpiTop = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 10,
})

export const kpiLabel = style({
  fontSize: 12.5,
  color: tokens.color.textMuted,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})

export const kpiValue = recipe({
  base: {
    fontSize: 25,
    fontWeight: 500,
    letterSpacing: "-0.025em",
    lineHeight: 1.1,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    "@media": { "screen and (max-width: 440px)": { fontSize: 21 } },
  },
  variants: { tone: { crit: { color: tokens.color.crit }, plain: { color: tokens.color.text } } },
  defaultVariants: { tone: "plain" },
})

export const kpiSub = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    marginTop: 7,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  variants: { tone: { crit: { color: tokens.color.crit }, sub: { color: tokens.color.textSubtle } } },
  defaultVariants: { tone: "sub" },
})

// ── panel columns ──
export const panelCols = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  alignItems: "start",
  "@media": { "screen and (max-width: 900px)": { gridTemplateColumns: "1fr" } },
})

export const panelCol = style({ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 })

export const panel = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.lg,
  padding: "20px 22px",
  transition: "border-color .14s",
  selectors: { "&:hover": { borderColor: tokens.color.borderStrong } },
})

export const panelHead = style({ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 })

export const panelIco = style({
  width: 34,
  height: 34,
  borderRadius: tokens.radius.sm,
  flexShrink: 0,
  background: tokens.color.bgSunken,
  color: tokens.color.accent,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
})

export const panelTitle = style({ fontSize: 15, fontWeight: 500, letterSpacing: "-0.015em", color: tokens.color.text })
export const panelSub = style({ fontSize: 12, color: tokens.color.textSubtle, marginTop: 1 })

export const panelLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  fontWeight: 500,
  color: tokens.color.accent,
  whiteSpace: "nowrap",
  flexShrink: 0,
  textDecoration: "none",
  selectors: { "&:hover": { textDecoration: "underline" } },
})

export const panelDivider = style({ height: 1, background: tokens.color.border, margin: "16px 0" })

// ── stat row (3–4 column figures) ──
export const statRow = style({ display: "grid", gap: 12 })
export const statLabel = style({ fontSize: 12, color: tokens.color.textSubtle, marginBottom: 3, whiteSpace: "nowrap" })
export const statValue = recipe({
  base: { fontSize: 21, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" },
  variants: { tone: { crit: { color: tokens.color.crit }, plain: { color: tokens.color.text } } },
  defaultVariants: { tone: "plain" },
})

// ── rows ──
export const finRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "9px 0",
  borderTop: `1px solid ${tokens.color.border}`,
  textDecoration: "none",
  selectors: { "&:first-child": { borderTop: "none" } },
})
export const finRowName = style({
  flex: 1,
  minWidth: 0,
  fontSize: 13.5,
  color: tokens.color.text,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})
export const finRowValue = recipe({
  base: { fontSize: 13.5, fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flexShrink: 0 },
  variants: { tone: { crit: { color: tokens.color.crit }, muted: { color: tokens.color.textMuted } } },
  defaultVariants: { tone: "muted" },
})

export const kvRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "7px 0",
  fontSize: 13.5,
  color: tokens.color.textMuted,
})

export const taskRow = style({ display: "flex", alignItems: "center", gap: 11, padding: "5px 0", textDecoration: "none" })
export const taskName = style({
  flex: 1,
  minWidth: 0,
  fontSize: 13.5,
  color: tokens.color.text,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})
export const taskMeta = style({ fontSize: 12.5, color: tokens.color.textSubtle, fontVariantNumeric: "tabular-nums", flexShrink: 0 })

export const dot = recipe({
  base: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  variants: {
    tom: {
      crit: { background: tokens.color.crit },
      warn: { background: tokens.color.warn },
      gold: { background: tokens.color.accent },
      sub: { background: tokens.color.textSubtle },
    },
  },
  defaultVariants: { tom: "sub" },
})

// the gold highlight callout (escritório — casos sem honorário)
export const highlightRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  width: "100%",
  textAlign: "left",
  padding: "12px",
  border: `1px solid ${tokens.color.borderGold}`,
  background: tokens.color.accentSoft,
  borderRadius: tokens.radius.md,
  textDecoration: "none",
  transition: "filter .12s",
  selectors: { "&:hover": { filter: "brightness(1.08)" } },
})
export const highlightTitle = style({ display: "block", fontSize: 13.5, fontWeight: 500, color: tokens.color.text })
export const highlightSub = style({ display: "block", fontSize: 12, color: tokens.color.textSubtle, marginTop: 1 })

export const emptyNote = style({ fontSize: 13, color: tokens.color.textSubtle, padding: "6px 0 2px", lineHeight: 1.5 })
