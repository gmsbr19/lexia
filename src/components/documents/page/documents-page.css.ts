import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const pageShell = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
})

export const pageFrame = style({
  width: "100%",
  maxWidth: 1180,
  margin: "0 auto",
  boxSizing: "border-box",
})

export const tabPanel = style({
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
})

export const scrollArea = style({
  height: "100%",
  overflowY: "auto",
  width: "100%",
  boxSizing: "border-box",
})

export const toolbarSpacer = style({
  flex: 1,
})

export const compactSecondaryButton = style({
  height: 32,
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  gap: 6,
})

export const categoryIcon = style({
  width: 32,
  height: 32,
  borderRadius: 10,
  background: tokens.color.bgSunken,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: tokens.color.textMuted,
  flexShrink: 0,
})

export const templateOrb = style({
  position: "absolute",
  top: -20,
  right: -20,
  width: 70,
  height: 70,
  borderRadius: "50%",
  background: tokens.color.accentSoft,
  opacity: 0.4,
})

export const templateMuted = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
})

export const interactiveSurface = style({
  position: "relative",
  overflow: "hidden",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
  textDecoration: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease, scale 0.5s ease",
  selectors: {
    "&:hover": {
      borderColor: tokens.color.borderStrong,
      boxShadow: tokens.color.shadowMd,
      scale: "1.005",
    },
  },
})

export const pillBase = style([interactiveSurface, {
  height: 30,
  padding: "0 14px",
  borderRadius: 999,
  border: `1px solid ${tokens.color.border}`,
  background: tokens.color.surface,
  color: tokens.color.textMuted,
  fontSize: "12px",
  fontWeight: 400,
  cursor: "pointer",
  fontFamily: tokens.font.sans,

}])

export const documentTypeText = style({
  fontSize: 7,
  fontWeight: 500,
  letterSpacing: "0.04em",
  color: tokens.color.text,
  fontFamily: tokens.font.mono,
})

export const documentIconBar = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 3,
  background: tokens.brand.gold,
  borderRadius: "4px 4px 0 0",
})

export const loadingState = style({
  padding: 32,
  color: tokens.color.textMuted,
})
