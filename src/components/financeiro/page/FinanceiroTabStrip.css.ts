import { style } from "@vanilla-extract/css"

// Make the reused tabButton recipe behave as an anchor (no underline, centered)
// and compact it so the 7 tabs fit on one line (design: 12px, tighter pads).
export const tabLink = style({
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  fontSize: 12,
  padding: "0 11px",
  whiteSpace: "nowrap",
  flexShrink: 0,
})

// Safety horizontal scroll if the viewport is still too narrow.
// NOTE: `overflow-x: auto` forces `overflow-y` to compute to `auto`, which would
// clip the active tab's underline (drawn 1px below the strip via the tabButton's
// `marginBottom: -1`). Pin overflow-y hidden + add 1px of bottom room so the
// underline stays fully visible instead of falling into the clipped overhang.
export const tabStripScroll = style({
  overflowX: "auto",
  overflowY: "hidden",
  scrollbarWidth: "none",
  paddingTop: 0,
  paddingLeft: 28,
  paddingRight: 28,
  paddingBottom: 1,
  width: "100%",
  boxSizing: "border-box"
})

// Row holding the tab strip + (optional) month selector, right-aligned.
export const tabStripRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  height: "fit-content",
  boxSizing: "border-box"
})
