// DatePicker — static styles for the INSIDE of the Popover panel (the panel
// surface itself — glass/elevation/outside-click/portal/flip — is entirely
// owned by Popover.tsx + popover.css.ts; this file never re-declares glass)
// plus the DateField trigger's own bordered-input appearance. Tokens mirror
// the plain CSS custom properties already used by sibling files
// (tf-kit.tsx, popover.css.ts, documents/editor2/fields.css.ts) rather than
// the vanilla-extract `tokens` contract object — both resolve to the exact
// same runtime custom properties (see src/styles/tokens.css.ts), this file
// just follows the convention already established in src/components/ui/.
import { style } from "@vanilla-extract/css"

// ── DateField trigger ───────────────────────────────────────────────────────

export const field = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  height: 36,
  padding: "0 8px 0 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-sunken)",
  color: "var(--text)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "left",
  transition: "border-color .14s, background .14s",
  selectors: {
    "&:hover:not(:disabled)": { borderColor: "var(--border-strong)", background: "var(--surface-hover)" },
    "&:focus-visible": { outline: "none", borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--ring)" },
    "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
  },
})

export const fieldIcon = style({ flexShrink: 0, color: "var(--text-muted)" })

export const fieldLabel = style({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "var(--text)",
})

export const fieldPlaceholder = style([fieldLabel, { color: "var(--text-subtle)" }])

export const fieldClear = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: 18,
  height: 18,
  borderRadius: 999,
  color: "var(--text-muted)",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "var(--surface-hover)", color: "var(--text)" },
  },
})

// ── Panel content ────────────────────────────────────────────────────────────

export const panelRoot = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  padding: 2,
})

export const section = style({
  padding: "6px 4px",
})

export const sectionDivider = style([
  section,
  { borderTop: "1px solid var(--border)", marginTop: 2 },
])

// NL free-text input

export const nlInput = style({
  width: "100%",
  height: 32,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-sunken)",
  color: "var(--text)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  outline: "none",
  transition: "border-color .14s, box-shadow .14s",
  selectors: {
    "&::placeholder": { color: "var(--text-subtle)" },
    "&:focus": { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--ring)" },
  },
})

export const nlPreview = style({
  padding: "5px 2px 0",
  fontSize: 11.5,
  color: "var(--text-muted)",
})

// Preset / adiar rows

export const presetRow = style({
  display: "flex",
  alignItems: "center",
  width: "100%",
  gap: 9,
  padding: "7px 8px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "var(--surface-hover)" },
  },
})

export const presetIcon = style({ flexShrink: 0, color: "var(--text-muted)" })

export const presetLabel = style({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})

export const presetHint = style({
  flexShrink: 0,
  fontSize: 11.5,
  color: "var(--text-subtle)",
  textTransform: "capitalize",
})

// Month calendar grid

export const calHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "4px 2px 8px",
})

export const calMonthLabel = style({
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text)",
})

export const calNavBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "var(--surface-hover)", color: "var(--text)" },
  },
})

export const calGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 2,
})

export const calWeekday = style({
  padding: "0 0 4px",
  fontSize: 10.5,
  fontWeight: 600,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  color: "var(--text-subtle)",
})

export const calCell = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: 30,
  border: "none",
  borderRadius: 999,
  background: "transparent",
  color: "var(--text)",
  fontFamily: "var(--font-sans)",
  fontSize: 12.5,
  fontFeatureSettings: '"tnum"',
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "var(--surface-hover)" },
  },
})

export const calCellOut = style({ color: "var(--text-subtle)" })

// Today (not selected): a thin accent ring, no fill.
export const calCellToday = style({ boxShadow: "inset 0 0 0 1.5px var(--accent)" })

// Selected: solid accent fill — same filled-circle convention as the
// checked SelectBox in tarefas/views.tsx (accent bg + brand-navy glyph,
// legible against the accent gold in both themes).
export const calCellSelected = style({
  background: "var(--accent)",
  color: "var(--brand-navy)",
  fontWeight: 600,
  selectors: {
    "&:hover": { background: "var(--accent)" },
  },
})

// Hora + Repetir rows

export const toggleRow = style([
  presetRow,
  { justifyContent: "space-between" },
])

export const timeInput = style({
  width: "100%",
  height: 32,
  marginTop: 6,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-sunken)",
  color: "var(--text)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--ring)" },
  },
})

export const recurRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "5px 8px",
})

export const recurLabel = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "var(--text)",
})

export const recurSelect = style({
  height: 28,
  padding: "0 8px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-sunken)",
  color: "var(--text)",
  fontFamily: "var(--font-sans)",
  fontSize: 12.5,
  outline: "none",
  cursor: "pointer",
  selectors: {
    "&:focus": { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--ring)" },
  },
})
