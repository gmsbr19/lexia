import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"
import { interactiveSurface, pillBase } from "../../documents-page.css"

export const pageFrameTemplates = style({
  padding: "28px 40px 48px",
})

export const templatesHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
})

export const templatesTitle = style({
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  letterSpacing: "-0.025em",
  color: tokens.color.text,
})

export const templatesActions = style({
  display: "flex",
  gap: 8,
  alignItems: "center",
})

export const templateChipRow = style({
  display: "flex",
  gap: 6,
  marginBottom: 24,
  flexWrap: "wrap",
})

export const templateChip = recipe({
  base: pillBase,
  variants: {
    active: {
      true: {
        borderColor: tokens.color.accent,
        background: tokens.color.accentSoft,
        color: tokens.color.accent,
        fontWeight: 600,
      },
    },
  },
})

export const templatesGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 14,
})

export const templateCard = style([
  interactiveSurface,
  {
    padding: "20px 20px 16px",
    display: "block",
    cursor: "pointer",
  },
])

export const templateCardDisabled = style({
  opacity: 0.55,
})

export const templateDisabledHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: 12,
})

export const templateHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
})

export const templateBadge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: "10.5px",
  fontWeight: 600,
  background: tokens.color.accentSoft,
  color: tokens.color.accent,
})

export const templateBadgeMuted = style({
  background: tokens.color.bgSunken,
  color: tokens.color.textSubtle,
})

export const templateTitle = style({
  fontSize: 13.5,
  fontWeight: 600,
  color: tokens.color.text,
  marginBottom: 6,
  lineHeight: 1.3,
})

export const templateDescription = style({
  fontSize: 12,
  color: tokens.color.textMuted,
  lineHeight: 1.45,
  marginBottom: 14,
})

export const templateFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 12,
  borderTop: `1px solid ${tokens.color.border}`,
})
