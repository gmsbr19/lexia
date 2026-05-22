import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const sectionHeader = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 14,
})

export const sectionHeaderBody = style({
  minWidth: 0,
})

export const sectionTitle = style({
  margin: 0,
  fontSize: 14.5,
  fontWeight: 600,
  letterSpacing: "-0.015em",
  color: tokens.color.text,
})

export const sectionSubtitle = style({
  fontSize: "11.5px",
  color: tokens.color.textSubtle,
  marginTop: 2,
})

export const sectionAction = style({
  fontSize: 12,
  color: tokens.color.accent,
  cursor: "pointer",
  fontWeight: 500,
  textDecoration: "none",
  whiteSpace: "nowrap",
  border: "none",
  background: "transparent",
  padding: 0,
})

export const sectionHint = style({
  fontSize: "11.5px",
  color: tokens.color.textSubtle,
})

export const sectionTitleSpacer = style({
  marginBottom: 12,
})
