// Table-shell styles for the generic DataGrid — a deliberate FORK of the
// neutral pieces of src/components/financeiro/interativo/interativo.css.ts
// (table/theadRow/th/row/cell/emptyRow/check/facet*), not a cross-module
// import. That file also carries genuinely finance-flavored exports (money,
// totalsBar, DRE/fluxo charts) interleaved with the neutral ones, and this
// grid needs a variant that file doesn't have (`th`'s `sortable`) — so it was
// never a pure reuse. Keep visual parity by keying off the same tokens.
import { keyframes, style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"
import { lexGlassStrong } from "@/styles/glass.css"

// ── toolbar ──────────────────────────────────────────────────────────────────
export const toolbar = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  padding: "16px 40px 14px",
  flexShrink: 0,
  flexWrap: "wrap",
})
export const toolbarLeft = style({ display: "flex", alignItems: "center", gap: 8, rowGap: 10, flexWrap: "wrap", flex: 1, minWidth: 0 })
export const toolbarRight = style({ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 })
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
      true: { padding: "0 5px 0 10px", border: `1px solid ${tokens.color.accent}`, background: tokens.color.accentSoft, color: tokens.color.accent },
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
export const facetMenu = style([
  lexGlassStrong,
  {
    position: "absolute",
    top: 40,
    zIndex: 41,
    minWidth: 220,
    maxHeight: 360,
    overflowY: "auto",
    padding: 6,
    borderRadius: 14,
    vars: { "--lex-elevation": "0 12px 28px rgba(2,13,37,0.16)" },
  },
])
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

// ── custom checkbox (row selection) ───────────────────────────────────────────
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
        selectors: { ".theme-dark &": { background: tokens.brand.gold, borderColor: tokens.brand.gold, color: tokens.brand.navy } },
      },
      false: {},
    },
  },
  defaultVariants: { on: false },
})
export const checkDash = style({ width: 8, height: 2, borderRadius: 2, background: "currentColor" })

// Selection column is quiet by default: each row's checkbox only appears on
// row hover; ALL checkboxes appear once anything is selected (`shown`). Uses
// visibility, not display, so the column keeps its width (no layout shift).

// ── table ────────────────────────────────────────────────────────────────────
export const tableScroll = style({ flex: 1, minHeight: 0, padding: "0 40px 14px", display: "flex", flexDirection: "column", overflow: "hidden" })
export const tableCard = style({
  flex: "1 1 auto",
  minHeight: 0,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  padding: 0,
  overflow: "auto",
})
// max-content: columns fit their content (cells never wrap) and the card
// scrolls horizontally; minWidth keeps the table filling the card when short.
export const table = style({ width: "max-content", minWidth: "100%", borderCollapse: "collapse" })
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
    sortable: {
      true: { cursor: "pointer", userSelect: "none", selectors: { "&:hover": { color: tokens.color.textMuted } } },
      false: {},
    },
  },
  defaultVariants: { align: "left", sticky: false, sortable: false },
})
export const thBtn = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "transparent",
  border: "none",
  padding: 0,
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
})
export const row = style({
  borderTop: `1px solid ${tokens.color.border}`,
  selectors: { "&:hover": { background: tokens.color.surfaceHover } },
})
export const rowSelected = style({ background: tokens.color.accentSoft })
export const rowClickable = style({ cursor: "pointer" })
export const cell = style({ padding: "8px 14px", fontSize: 12, color: tokens.color.text, verticalAlign: "middle", whiteSpace: "nowrap" })
export const cellTight = style({ padding: "8px 8px" })
export const cellEditable = style({
  cursor: "pointer",
  borderRadius: 6,
  transition: "background .1s",
  selectors: { "&:hover": { background: tokens.color.bgSunken } },
})
// Row checkbox — hidden until the row is hovered, or forced visible (`shown`)
// once a selection exists. `${row}:hover &` is why these live AFTER `row`.
export const selReveal = recipe({
  base: {
    opacity: 0,
    transition: "opacity .12s",
    selectors: {
      [`${row}:hover &`]: { opacity: 1 },
      "&:focus-visible": { opacity: 1 },
    },
  },
  variants: { shown: { true: { opacity: 1 }, false: {} } },
  defaultVariants: { shown: false },
})
// Header select-all — appears on header hover or when a selection exists.
export const selRevealHead = recipe({
  base: {
    opacity: 0,
    transition: "opacity .12s",
    selectors: { [`${theadRow}:hover &`]: { opacity: 1 } },
  },
  variants: { shown: { true: { opacity: 1 }, false: {} } },
  defaultVariants: { shown: false },
})

export const descMain = style({ fontSize: 12, fontWeight: 500, color: tokens.color.text })
export const descMeta = style({ fontSize: 11, color: tokens.color.textSubtle, marginTop: 1, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" })
export const emptyRow = style({ padding: "56px 16px", textAlign: "center", color: tokens.color.textSubtle, fontSize: 13 })

// ── group header ─────────────────────────────────────────────────────────────
export const groupHeaderRow = style({ background: tokens.color.bgSoft })
export const groupHeaderCell = style({
  padding: "8px 14px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.text,
  cursor: "pointer",
  userSelect: "none",
})
export const groupCount = style({ fontSize: 11, color: tokens.color.textSubtle, fontWeight: 400 })

// ── skeleton (loading placeholder) ────────────────────────────────────────────
const shimmer = keyframes({ "0%": { backgroundPosition: "-200px 0" }, "100%": { backgroundPosition: "calc(200px + 100%) 0" } })
export const skelBar = style({
  height: 12,
  borderRadius: 6,
  background: tokens.color.bgSunken,
  "@media": {
    "(prefers-reduced-motion: no-preference)": {
      backgroundImage: `linear-gradient(90deg, ${tokens.color.bgSunken} 0px, ${tokens.color.surfaceHover} 40px, ${tokens.color.bgSunken} 80px)`,
      backgroundSize: "200px 100%",
      backgroundRepeat: "no-repeat",
      animation: `${shimmer} 1.2s ease-in-out infinite`,
    },
  },
})

// ── inputs ───────────────────────────────────────────────────────────────────
export const input = style({
  width: "100%",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontFamily: tokens.font.sans,
  fontSize: 13,
  color: tokens.color.text,
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  selectors: {
    "&:focus": { borderColor: tokens.brand.gold, boxShadow: `0 0 0 3px ${tokens.color.ring}` },
    "&::placeholder": { color: tokens.color.textSubtle },
  },
})
