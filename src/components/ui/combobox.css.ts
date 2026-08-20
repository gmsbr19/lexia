// Combobox — static styles. Composes the shared design tokens (never raw
// colors) so it looks native inside AND outside `.crm-scope` (the bridge in
// crm-theme.css re-declares the same custom properties for that scope) and in
// both themes. Mirrors the visual language of the app's plain `.input`
// (components.css.ts) / datagrid `input` (datagrid.css.ts) controls — same
// radius/border/focus-ring recipe, just built as a clickable trigger instead
// of a bare <input>. The panel's own glass/elevation/scroll come from
// Popover's `panel` class (popover.css.ts) — this file only styles what goes
// INSIDE that panel (search box + option list) and the trigger itself.
import { globalStyle, style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

// ── trigger (looks like a text input) ───────────────────────────────────────
// Fills its container via width:100% — Popover is opened with `fill`, so its
// trigger wrapper is a full-width block box the percentage can resolve against.
export const trigger = style({
  width: "100%",
  minWidth: 120,
  minHeight: 36,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: tokens.radius.sm,
  padding: "0 10px",
  fontFamily: tokens.font.sans,
  fontSize: "13.5px",
  color: tokens.color.text,
  cursor: "pointer",
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  selectors: {
    "&:hover": { borderColor: tokens.color.accent },
    "&:focus-visible": { borderColor: tokens.brand.gold, boxShadow: `0 0 0 3px ${tokens.color.ring}` },
  },
})

export const triggerDisabled = style({
  opacity: 0.55,
  cursor: "not-allowed",
  pointerEvents: "none",
})

export const triggerLabel = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: tokens.color.text,
})

export const triggerPlaceholder = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: tokens.color.textSubtle,
})

export const triggerIcons = style({
  display: "flex",
  alignItems: "center",
  gap: 2,
  flexShrink: 0,
  color: tokens.color.textSubtle,
})

export const clearBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: tokens.radius.xs,
  border: "none",
  background: "transparent",
  color: tokens.color.textSubtle,
  cursor: "pointer",
  padding: 0,
  selectors: {
    "&:hover": { background: tokens.color.surfaceHover, color: tokens.color.textMuted },
  },
})

export const chevron = style({ color: tokens.color.textSubtle, flexShrink: 0, transition: "transform .15s" })
export const chevronOpen = style({ transform: "rotate(180deg)" })

// ── panel content ────────────────────────────────────────────────────────────
export const panelInner = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 200,
})

export const loadingRow = style({
  padding: "16px 10px",
  textAlign: "center",
  fontSize: 12.5,
  color: tokens.color.textSubtle,
})

export const searchWrap = style({ position: "relative", flexShrink: 0 })
export const searchIcon = style({
  position: "absolute",
  left: 9,
  top: "50%",
  transform: "translateY(-50%)",
  color: tokens.color.textSubtle,
  pointerEvents: "none",
})
export const searchInput = style({
  width: "100%",
  boxSizing: "border-box",
  background: tokens.color.bgSunken,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.xs,
  padding: "7px 10px 7px 30px",
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

// Capped shorter than Popover panel's own 360px max-height (see popover.css.ts)
// so the search input never gets pushed out of view / scrolled away — only
// this inner list scrolls, the search box stays pinned above it.
export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  maxHeight: 240,
  overflowY: "auto",
})

// Refined scrollbar for the option list. The panel is portaled to <body>, OUTSIDE
// the .cm-scope/.crm-scope refinements, so without this it falls back to the
// always-visible global 8px thumb (theme.css.ts) — the "old/ugly" scroll the user
// flagged. Match the app's thin, invisible-until-hover treatment. WebKit pseudo
// ONLY: never set scrollbar-width/color alongside these (Chrome ≥121 turns the
// pseudo-elements off). Firefox gets the thin fallback via @supports.
globalStyle(`${list}::-webkit-scrollbar`, { width: "6px", height: "6px" })
globalStyle(`${list}::-webkit-scrollbar-track`, { background: "transparent" })
globalStyle(`${list}::-webkit-scrollbar-thumb`, {
  backgroundColor: "transparent",
  borderRadius: "999px",
})
globalStyle(`${list}:hover::-webkit-scrollbar-thumb`, { backgroundColor: tokens.color.borderStrong })
globalStyle(`${list}::-webkit-scrollbar-thumb:hover`, { backgroundColor: tokens.color.textSubtle })

// ── create row ("Criar '<texto>'") ───────────────────────────────────────────
export const createRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  marginTop: 2,
  border: "none",
  borderTop: `1px solid ${tokens.color.border}`,
  background: "transparent",
  borderRadius: tokens.radius.xs,
  fontSize: 13,
  fontWeight: 500,
  color: tokens.color.accent,
  cursor: "pointer",
  textAlign: "left",
  selectors: {
    "&:hover": { background: tokens.color.accentSoft },
  },
})

export const createIcon = style({ flexShrink: 0, color: tokens.color.accent })

export const emptyRow = style({
  padding: "14px 10px",
  textAlign: "center",
  fontSize: 12.5,
  color: tokens.color.textSubtle,
})

export const option = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  border: "none",
  background: "transparent",
  borderRadius: tokens.radius.xs,
  fontSize: 13,
  color: tokens.color.text,
  cursor: "pointer",
  textAlign: "left",
  selectors: {
    "&:hover": { background: tokens.color.surfaceHover },
  },
})

export const optionHighlighted = style({ background: tokens.color.surfaceHover })
// Declared after optionHighlighted so it wins the tie when a row is both the
// current selection and the keyboard-highlighted row (source order breaks the
// specificity tie between two same-specificity classes).
export const optionSelected = style({ background: tokens.color.accentSoft, color: tokens.color.accent })

export const optionLabel = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
})

export const optionHint = style({
  flexShrink: 0,
  fontSize: 11.5,
  color: tokens.color.textSubtle,
})

export const optionCheck = style({ flexShrink: 0, color: tokens.color.accent })
