import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const panel = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  padding: 16,
})

export const panelHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
})

export const panelTitle = style({
  fontSize: 14,
  fontWeight: 500,
  color: tokens.color.text,
})

export const transferForm = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr 0.8fr 0.9fr auto",
  gap: 10,
  alignItems: "end",
  padding: 14,
  background: tokens.color.bgSoft,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  marginBottom: 14,
  "@media": {
    "screen and (max-width: 900px)": { gridTemplateColumns: "1fr 1fr" },
  },
})

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
})

export const fieldLabel = style({
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: tokens.color.textSubtle,
})

const inputBase = {
  width: "100%",
  font: "inherit",
  fontSize: "13px",
  color: tokens.color.text,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 8,
  padding: "8px 10px",
  outline: "none",
}

export const formInput = style({
  ...inputBase,
  selectors: {
    "&:focus": { borderColor: tokens.brand.gold, boxShadow: `0 0 0 3px ${tokens.color.ring}` },
  },
})

export const formSelect = style({
  ...inputBase,
  cursor: "pointer",
  selectors: {
    "&:focus": { borderColor: tokens.brand.gold, boxShadow: `0 0 0 3px ${tokens.color.ring}` },
  },
})

// flush inline name editor for the accounts table
export const nameInput = style({
  width: "100%",
  font: "inherit",
  fontSize: "13px",
  fontWeight: 500,
  color: tokens.color.text,
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 8,
  padding: "6px 8px",
  margin: "-6px -8px",
  outline: "none",
  userSelect: "text",
  selectors: {
    "&:hover": { background: tokens.color.bgSoft },
    "&:focus": {
      background: tokens.color.surface,
      borderColor: tokens.brand.gold,
      boxShadow: `0 0 0 3px ${tokens.color.ring}`,
    },
  },
})

export const iconBtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: tokens.color.textSubtle,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "rgba(192,73,47,0.12)", color: "var(--fin-neg,#C0492F)" },
  },
})

export const errorBar = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 10,
  background: "rgba(192,73,47,0.10)",
  border: "1px solid rgba(192,73,47,0.16)",
  color: "var(--fin-neg,#C0492F)",
  fontSize: 12,
  marginBottom: 12,
})
