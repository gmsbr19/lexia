import { style, styleVariants } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

// ── page frame ───────────────────────────────────────────────────────────────
// tabPanel is a bounded block (flex:1 + overflow hidden), so fill it with 100%.
export const scroll = style({ height: "100%", minHeight: 0, overflowY: "auto" })
export const flexCol = style({ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" })
export const frame = style({ padding: "24px 40px 48px", maxWidth: 1240, margin: "0 auto" })

export const pageHead = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
})
export const pageTitle = style({ margin: 0, fontSize: 21, fontWeight: 500, letterSpacing: "-0.025em", color: tokens.color.text })
export const pageSub = style({ margin: "4px 0 0", fontSize: 13, color: tokens.color.textMuted })

// ── card ─────────────────────────────────────────────────────────────────────
export const card = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
})
export const cardPad = style({ padding: "18px 22px" })
export const cardTitleRow = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
})
export const cardTitle = style({ fontSize: 14, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.01em" })
export const cardSub = style({ fontSize: 12, color: tokens.color.textSubtle, marginTop: 3 })

// ── KPI ──────────────────────────────────────────────────────────────────────
export const kpiGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  marginBottom: 22,
  "@media": { "screen and (max-width: 900px)": { gridTemplateColumns: "repeat(2, 1fr)" } },
})
export const kpiCard = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  padding: "15px 17px",
  display: "flex",
  flexDirection: "column",
  gap: 9,
  minHeight: 104,
})
export const kpiTop = style({ display: "flex", alignItems: "center", justifyContent: "space-between" })
export const kpiLabel = style({ fontSize: 12, color: tokens.color.textMuted, fontWeight: 500 })
export const kpiIcon = recipe({
  base: {
    width: 26,
    height: 26,
    borderRadius: 8,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  variants: {
    accent: {
      gold: { background: tokens.color.accentSoft, color: tokens.color.accent },
      neutral: { background: tokens.color.bgSunken, color: tokens.color.textMuted },
    },
  },
  defaultVariants: { accent: "neutral" },
})
export const kpiValue = style({
  fontSize: 25,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  fontFeatureSettings: '"tnum"',
  fontVariantNumeric: "tabular-nums",
})
export const kpiSub = style({ fontSize: 12, color: tokens.color.textSubtle })

// ── numbers ──────────────────────────────────────────────────────────────────
// Typography rule: every number uses the sans family with tabular figures —
// the mono face is reserved for code, never for valores.
export const num = style({ fontFeatureSettings: '"tnum"', fontVariantNumeric: "tabular-nums" })

// ── money (sign-aware) ───────────────────────────────────────────────────────
export const money = style({
  fontFeatureSettings: '"tnum"',
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
})

// ── status pill — dot + label, quieter than the old icon version ─────────────
export const pill = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 500,
  padding: "3px 9px",
  borderRadius: 6,
  whiteSpace: "nowrap",
})
export const pillDot = style({ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 })
export const pillButton = style({ border: "none", background: "transparent", padding: 0, cursor: "pointer", borderRadius: 999 })

// ── custom checkbox (replaces the native input — matches the kit) ────────────
export const check = recipe({
  base: {
    width: 16,
    height: 16,
    borderRadius: 6,
    padding: 0,
    flexShrink: 0,
    border: `1.5px solid ${tokens.color.borderStrong}`,
    background: tokens.color.surface,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#F5F1E4",
    transition: "border-color .12s, background .12s, box-shadow .12s",
    selectors: {
      "&:hover": { borderColor: tokens.color.accent },
      "&:focus-visible": { outline: "none", boxShadow: `0 0 0 3px ${tokens.color.ring}` },
    },
  },
  variants: {
    on: {
      true: {
        background: tokens.brand.navy,
        borderColor: tokens.brand.navy,
        selectors: {
          ".theme-dark &": { background: tokens.brand.gold, borderColor: tokens.brand.gold, color: tokens.brand.navy },
        },
      },
      false: {},
    },
  },
  defaultVariants: { on: false },
})
export const checkDash = style({ width: 8, height: 2, borderRadius: 2, background: "currentColor" })

// ── quiet "dar baixa" button — neutral at rest, green on hover ───────────────
export const baixaBtn = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 26,
  padding: "0 10px",
  borderRadius: 8,
  border: `1px solid ${tokens.color.borderStrong}`,
  background: "transparent",
  fontFamily: tokens.font.sans,
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.textMuted,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "color .12s, border-color .12s, background .12s",
  selectors: {
    "&:hover": {
      color: "var(--fin-pos,#2E9E5B)",
      borderColor: "var(--fin-pos,#2E9E5B)",
      background: "rgba(46,158,91,0.08)",
    },
  },
})

// ── direction chip ───────────────────────────────────────────────────────────
export const dirChip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 500,
  whiteSpace: "nowrap",
})
export const dirIcon = style({
  width: 18,
  height: 18,
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
})

// ── category chip ────────────────────────────────────────────────────────────
export const catChip = style({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11,
  fontWeight: 500,
  color: tokens.color.textMuted,
  background: tokens.color.bgSunken,
  padding: "3px 9px",
  borderRadius: 999,
  whiteSpace: "nowrap",
})

// ── segmented control ────────────────────────────────────────────────────────
export const segGroup = style({
  display: "inline-flex",
  gap: 3,
  background: tokens.color.bgSunken,
  borderRadius: 10,
  padding: 3,
})
export const segButton = recipe({
  base: {
    height: 32,
    padding: "0 13px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: tokens.color.textMuted,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: tokens.font.sans,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "background .12s",
  },
  variants: {
    active: { true: { background: tokens.color.surface, color: tokens.color.text, fontWeight: 500, boxShadow: tokens.color.shadowSm } },
    size: { sm: { height: 28 }, md: {} },
  },
  defaultVariants: { active: false, size: "md" },
})

// ── period bar ───────────────────────────────────────────────────────────────
export const periodBar = style({
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 40px",
  borderBottom: `1px solid ${tokens.color.border}`,
  background: tokens.color.bgSoft,
  flexShrink: 0,
  flexWrap: "wrap",
})
export const periodNav = style({ display: "flex", alignItems: "center", gap: 4 })
export const periodLabelBox = style({ minWidth: 150, textAlign: "center" })
export const periodTitle = style({ fontSize: 16, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.02em", lineHeight: 1.15 })
export const periodSub = style({ fontSize: 11, color: tokens.color.textSubtle })
export const navBtn = style({
  width: 30,
  height: 30,
  padding: 0,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: tokens.color.textMuted,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  selectors: { "&:hover": { background: tokens.color.surfaceHover, color: tokens.color.text } },
})
// ── fluxo head (title + horizon selector) ────────────────────────────────────
export const fluxoHead = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
  flexWrap: "wrap",
})
export const horizonWrap = style({ display: "flex", alignItems: "center", gap: 10 })
export const horizonLabel = style({ fontSize: 12, color: tokens.color.textSubtle, fontWeight: 500 })

// ── filter bar ───────────────────────────────────────────────────────────────
// Faceted-filter toolbar (Mercury/Ramp/Stripe pattern): the left group wraps,
// the action group stays pinned top-right aligned with the search row.
export const filterBar = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  padding: "16px 40px 14px",
  flexShrink: 0,
})
export const filterLeft = style({ display: "flex", alignItems: "center", gap: 8, rowGap: 10, flexWrap: "wrap", flex: 1, minWidth: 0 })
export const filterRight = style({ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 })
export const filterDivider = style({ width: 1, height: 22, background: tokens.color.border, flexShrink: 0 })
export const filterFunnel = style({ color: tokens.color.textSubtle, flexShrink: 0, display: "inline-flex" })
export const lancRoot = style({ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" })
export const searchWrap = style({ position: "relative", flex: "0 1 220px", minWidth: 170 })
export const searchIcon = style({ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: tokens.color.textSubtle, pointerEvents: "none" })

// ── faceted filter chip (button doubles as active-value chip) ────────────────
export const facetWrap = style({ position: "relative" })
export const facetBtn = recipe({
  base: {
    height: 34,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    fontFamily: tokens.font.sans,
    whiteSpace: "nowrap",
    letterSpacing: "-0.01em",
    transition: "border-color .12s, background .12s, color .12s",
  },
  variants: {
    active: {
      true: {
        padding: "0 5px 0 10px",
        border: `1px solid ${tokens.color.accent}`,
        background: tokens.color.accentSoft,
        color: tokens.color.accent,
      },
      false: {
        padding: "0 9px 0 11px",
        border: `1px solid ${tokens.color.borderStrong}`,
        background: tokens.color.surface,
        color: tokens.color.textMuted,
        selectors: { "&:hover": { background: tokens.color.surfaceHover } },
      },
    },
  },
  defaultVariants: { active: false },
})
export const facetValue = style({ fontWeight: 500, color: tokens.color.accent, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 128 })
export const facetRemove = style({
  display: "inline-flex",
  width: 18,
  height: 18,
  borderRadius: 6,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  selectors: { "&:hover": { background: "rgba(192,161,71,0.18)" } },
})
export const facetDot = style({ width: 7, height: 7, borderRadius: "50%", flexShrink: 0 })
export const facetMenu = style({
  position: "absolute",
  top: 40,
  zIndex: 41,
  minWidth: 192,
  maxHeight: 320,
  overflowY: "auto",
  padding: 6,
  background: "var(--lex-acrylic-strong)",
  backdropFilter: "var(--lex-blur)",
  WebkitBackdropFilter: "var(--lex-blur)",
  border: "1px solid var(--lex-acrylic-border)",
  borderRadius: 14,
  boxShadow: "var(--lex-glass-shadow), 0 12px 28px rgba(2,13,37,0.16), inset 0 1px 0 rgba(255,255,255,0.16)",
})
export const facetMenuItem = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 9,
  width: "100%",
  padding: "8px 10px",
  border: "none",
  background: "transparent",
  borderRadius: 8,
  fontSize: 13,
  color: tokens.color.text,
  cursor: "pointer",
  textAlign: "left",
  selectors: { "&:hover": { background: tokens.color.surfaceHover } },
})
export const facetMenuDiv = style({ height: 1, background: tokens.color.border, margin: "4px 4px" })
export const facetCheck = style({ color: tokens.color.accent, display: "inline-flex", flexShrink: 0 })

// ── shared inputs (modal + filters) ──────────────────────────────────────────
export const input = style({
  width: "100%",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontFamily: tokens.font.sans,
  fontSize: 14,
  color: tokens.color.text,
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  selectors: {
    "&:focus": { borderColor: tokens.brand.gold, boxShadow: `0 0 0 3px ${tokens.color.ring}` },
    "&::placeholder": { color: tokens.color.textSubtle },
  },
})
export const selectWrap = style({ position: "relative" })
export const selectChevron = style({ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: tokens.color.textSubtle })

// ── table ────────────────────────────────────────────────────────────────────
// Outer padding frame — does NOT scroll; the rounded card inside is the scroller
// so the sticky table header is clipped to the radius and the top corners keep
// their rounding on scroll (instead of squaring off behind the sticky header).
export const tableScroll = style({ flex: 1, minHeight: 0, padding: "0 40px 14px", display: "flex", flexDirection: "column", overflow: "hidden" })
export const tableCard = style({
  // fill the available height (so the card spans the whole container instead of
  // floating above empty page) and shrink + scroll when the list overflows; the
  // rounded box clips the sticky header on scroll.
  flex: "1 1 auto",
  minHeight: 0,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  padding: 0,
  overflow: "auto",
})
export const table = style({ width: "100%", borderCollapse: "collapse" })
export const theadRow = style({ background: tokens.color.bgSoft, position: "sticky", top: 0, zIndex: 2 })
export const th = recipe({
  base: {
    textAlign: "left",
    padding: "9px 14px",
    fontSize: 11,
    fontWeight: 500,
    color: tokens.color.textSubtle,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  variants: {
    align: { right: { textAlign: "right" }, left: {} },
    sticky: { true: { position: "sticky", top: 0, zIndex: 2, background: tokens.color.bgSoft }, false: {} },
  },
  defaultVariants: { align: "left", sticky: false },
})
export const row = style({
  borderTop: `1px solid ${tokens.color.border}`,
  selectors: { "&:hover": { background: tokens.color.surfaceHover } },
})
export const rowSelected = style({ background: tokens.color.accentSoft })
export const cell = style({ padding: "8px 14px", fontSize: 12, color: tokens.color.text, verticalAlign: "middle" })
export const cellTight = style({ padding: "8px 8px" })
export const descMain = style({ fontSize: 12, fontWeight: 500, color: tokens.color.text })
export const descMeta = style({ fontSize: 11, color: tokens.color.textSubtle, marginTop: 1, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" })
export const dateNum = style([num, { fontSize: 12, color: tokens.color.textMuted }])
export const dateNumSubtle = style([num, { fontSize: 12, color: tokens.color.textSubtle }])
export const serieChip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  color: tokens.color.accent,
  fontWeight: 500,
  fontSize: 11,
  border: "none",
  background: tokens.color.accentSoft,
  padding: "1px 7px",
  borderRadius: 999,
  cursor: "pointer",
})
export const emptyRow = style({ padding: "56px 16px", textAlign: "center", color: tokens.color.textSubtle, fontSize: 13 })

// ── row action menu ──────────────────────────────────────────────────────────
export const menuWrap = style({ position: "relative", display: "inline-block" })
export const menuCard = style({
  position: "absolute",
  right: 0,
  top: 32,
  zIndex: 41,
  minWidth: 168,
  padding: 6,
  background: "var(--lex-acrylic-strong)",
  backdropFilter: "var(--lex-blur)",
  WebkitBackdropFilter: "var(--lex-blur)",
  border: "1px solid var(--lex-acrylic-border)",
  borderRadius: 14,
  boxShadow: "var(--lex-glass-shadow), 0 12px 28px rgba(2,13,37,0.16), inset 0 1px 0 rgba(255,255,255,0.16)",
})
export const menuScrim = style({ position: "fixed", inset: 0, zIndex: 40 })
export const menuItem = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "8px 10px",
  border: "none",
  background: "transparent",
  borderRadius: 8,
  fontSize: 13,
  color: tokens.color.text,
  cursor: "pointer",
  textAlign: "left",
  selectors: { "&:hover": { background: tokens.color.surfaceHover } },
})
export const iconBtn = style({
  width: 28,
  height: 28,
  padding: 0,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: tokens.color.textMuted,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  selectors: { "&:hover": { background: tokens.color.surfaceHover, color: tokens.color.text } },
})

// ── bulk + totals bars ───────────────────────────────────────────────────────
export const bulkBar = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  margin: "0 40px 6px",
  background: tokens.color.accentSoft,
  border: `1px solid ${tokens.color.accent}`,
  borderRadius: 8,
  flexShrink: 0,
})
export const totalsBar = style({
  display: "flex",
  alignItems: "center",
  gap: 36,
  padding: "12px 40px",
  borderTop: `1px solid ${tokens.color.borderStrong}`,
  background: tokens.color.bgSoft,
  flexShrink: 0,
  // single line so the measured height (reported to the pill) stays constant;
  // clip rather than wrap/scroll if an extreme-narrow window can't fit it
  flexWrap: "nowrap",
  whiteSpace: "nowrap",
  overflow: "hidden",
})
export const totalCell = style({ display: "flex", alignItems: "center", gap: 10 })
export const totalIcon = style({ width: 28, height: 28, borderRadius: 8, background: tokens.color.bgSunken, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 })
export const totalLabel = style({ fontSize: 11, color: tokens.color.textSubtle, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 })
export const totalValue = style([num, { fontSize: 16, fontWeight: 500, letterSpacing: "-0.02em" }])

// ── alert (vencidos) ─────────────────────────────────────────────────────────
export const alert = style({
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: "12px 16px",
  background: "rgba(192,73,47,0.07)",
  border: "1px solid rgba(192,73,47,0.22)",
  borderRadius: 14,
  marginBottom: 22,
})

// ── grids for visão / fluxo ──────────────────────────────────────────────────
export const visaoGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)",
  gap: 20,
  alignItems: "start",
  "@media": { "screen and (max-width: 1000px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
})
export const fluxoGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)",
  gap: 20,
  alignItems: "start",
  "@media": { "screen and (max-width: 1000px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
})
export const colStack = style({ display: "flex", flexDirection: "column", gap: 20 })

// ── list rows (próximos vencimentos) ─────────────────────────────────────────
export const listRow = style({ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: `1px solid ${tokens.color.border}` })
export const listMain = style({ flex: 1, minWidth: 0 })
export const listTitle = style({ fontSize: 12, fontWeight: 500, color: tokens.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })
export const listMeta = style({ fontSize: 11, color: tokens.color.textSubtle })

// ── situação bar ─────────────────────────────────────────────────────────────
export const sitTrack = style({ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: tokens.color.bgSunken, marginBottom: 16 })
export const sitLegend = style({ display: "flex", flexDirection: "column", gap: 11 })
export const sitRow = style({ display: "flex", alignItems: "center", gap: 10 })

// ── inadimplência ────────────────────────────────────────────────────────────
export const inadBuckets = style({ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 })
export const inadBucket = style({
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "4px 8px",
  margin: "0 -8px",
  border: "none",
  background: "transparent",
  borderRadius: 8,
  width: "calc(100% + 16px)",
  textAlign: "left",
  textDecoration: "none",
  color: "inherit",
  selectors: { "&:hover": { background: tokens.color.surfaceHover } },
})
export const inadTrack = style({ flex: 1, height: 7, background: tokens.color.bgSunken, borderRadius: 6, overflow: "hidden" })
export const devedorRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "7px 8px",
  margin: "0 -8px",
  width: "calc(100% + 16px)",
  border: "none",
  background: "transparent",
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
  textDecoration: "none",
  color: "inherit",
  selectors: { "&:hover": { background: tokens.color.surfaceHover } },
})
export const devedorAvatar = style({ width: 24, height: 24, borderRadius: "50%", background: "rgba(192,73,47,0.12)", color: "var(--fin-neg,#C0492F)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 500, flexShrink: 0 })

// ── modal ────────────────────────────────────────────────────────────────────
export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  padding: 24,
})
export const modalCard = style({
  width: 680,
  maxWidth: "100%",
  maxHeight: "92%",
  display: "flex",
  flexDirection: "column",
  background: "var(--lex-acrylic)",
  backdropFilter: "var(--lex-blur)",
  WebkitBackdropFilter: "var(--lex-blur)",
  border: "1px solid var(--lex-acrylic-border)",
  borderRadius: 14,
  boxShadow: "0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24), inset 0 1px 0 rgba(255,255,255,0.16)",
  overflow: "hidden",
})
export const modalHead = style({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 24px 16px", borderBottom: `1px solid ${tokens.color.border}` })
export const modalTitle = style({ fontSize: 16, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.02em" })
export const modalSub = style({ fontSize: 12, color: tokens.color.textMuted, marginTop: 3 })
export const modalBody = style({ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 15 })
export const modalFoot = style({ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: `1px solid ${tokens.color.border}`, background: "color-mix(in srgb, var(--bg-soft) 55%, transparent)" })
export const field = style({})
export const fieldLabel = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 })
export const fieldLabelText = style({ fontSize: 12, fontWeight: 500, color: tokens.color.textMuted, letterSpacing: "0.01em" })
export const fieldHint = style({ fontSize: 11, color: tokens.color.textSubtle })
export const grid2 = style({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 })
export const dirToggle = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    height: 44,
    borderRadius: 8,
    cursor: "pointer",
    border: `1.5px solid ${tokens.color.borderStrong}`,
    background: tokens.color.surface,
  },
  variants: {
    on: { in: { borderColor: "var(--fin-pos,#2E9E5B)", background: "rgba(46,158,91,0.08)" }, out: { borderColor: "var(--fin-neg,#C0492F)", background: "rgba(192,73,47,0.07)" }, off: {} },
  },
  defaultVariants: { on: "off" },
})
export const recurBox = style({ display: "flex", alignItems: "center", gap: 12, marginTop: 10, padding: "11px 14px", background: tokens.color.bgSoft, borderRadius: 8, border: `1px solid ${tokens.color.border}`, flexWrap: "wrap" })
export const stepper = style({ display: "flex", alignItems: "center", border: `1px solid ${tokens.color.borderStrong}`, borderRadius: 8, overflow: "hidden" })
export const stepperVal = style([num, { width: 34, textAlign: "center", fontSize: 16, fontWeight: 500, color: tokens.color.text }])
export const pagoBox = style({ display: "flex", alignItems: "center", gap: 14, padding: "0 14px", minHeight: 46, borderRadius: 8, border: `1px solid ${tokens.color.border}`, background: tokens.color.bgSoft, flexWrap: "wrap" })

// ── fluxo chart ──────────────────────────────────────────────────────────────
export const bars = style({ display: "flex", alignItems: "flex-end", gap: 0, height: 172, padding: "0 2px" })
export const barCol = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 })
export const legend = style({ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" })
export const legendItem = style({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: tokens.color.textMuted, whiteSpace: "nowrap" })

// fluxo monthly table: bounded scroll with sticky header/footer
export const fluxoTableScroll = style({ maxHeight: 420, overflowY: "auto" })
export const fluxoTable = style({ width: "100%", borderCollapse: "separate", borderSpacing: 0 })
export const fluxoTd = style({ padding: "9px 14px", borderTop: `1px solid ${tokens.color.border}` })
export const fluxoFootTd = style({
  padding: "11px 14px",
  position: "sticky",
  bottom: 0,
  background: tokens.color.bgSoft,
  borderTop: `2px solid ${tokens.color.borderStrong}`,
})

// dynamic value tones reused inline-free where possible
export const toneText = styleVariants({
  pos: { color: "var(--fin-pos,#2E9E5B)" },
  neg: { color: "var(--fin-neg,#C0492F)" },
  base: { color: tokens.color.text },
  muted: { color: tokens.color.textMuted },
})
