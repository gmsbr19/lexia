import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const pageFrameCreate = style({
  padding: "32px 40px 48px",
})

export const section = style({
  marginBottom: 36,
})

export const heroTitle = style({
  margin: 0,
  fontSize: 28,
  fontWeight: 600,
  letterSpacing: "-0.025em",
  color: tokens.color.text,
})

export const heroLead = style({
  margin: "6px 0 20px",
  fontSize: 13.5,
  color: tokens.color.textMuted,
  letterSpacing: "-0.005em",
})

export const composerCard = style({
  position: "relative",
  overflow: "hidden",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 16,
  boxShadow: tokens.color.shadowMd,
  padding: "14px 16px 12px",
})

export const composerGlow = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background: "radial-gradient(circle at 100% 0%, var(--accent-soft) 0%, transparent 55%)",
})

export const composerInner = style({
  position: "relative",
})

export const composerLabel = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  fontSize: 11,
  fontWeight: 500,
  color: tokens.color.accent,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
})

export const composerTextarea = style({
  width: "100%",
  minHeight: 96,
  resize: "vertical",
  border: "none",
  outline: "none",
  background: "transparent",
  padding: 0,
  fontFamily: tokens.font.sans,
  fontSize: 15,
  lineHeight: 1.55,
  letterSpacing: "-0.005em",
  color: tokens.color.text,
  selectors: {
    "&::placeholder": {
      color: tokens.color.textSubtle,
    },
  },
})

export const composerFooter = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 10,
  paddingTop: 10,
  borderTop: `1px solid ${tokens.color.border}`,
})

export const composerHint = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
  whiteSpace: "nowrap",
})

export const compactButton = style({
  height: 28,
  fontSize: 11.5,
  padding: "0 8px",
})

export const compactGoldButton = style({
  height: 30,
  fontSize: 12.5,
  padding: "0 14px",
})

export const exampleRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 12,
})

export const exampleLabel = style({
  alignSelf: "center",
  marginRight: 4,
  fontSize: 11,
  color: tokens.color.textSubtle,
})

export const exampleChip = style({
  height: 28,
  padding: "0 12px",
  borderRadius: 999,
  border: `1px solid ${tokens.color.border}`,
  background: tokens.color.surface,
  color: tokens.color.textMuted,
  fontSize: 12,
  letterSpacing: "-0.005em",
  cursor: "pointer",
  textAlign: "left",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  maxWidth: "100%",
})

export const exampleChipIcon = style({
  color: tokens.color.accent,
  flexShrink: 0,
})

export const exampleChipText = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
})

export const draftGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
})

export const draftLink = style({
  position: "relative",
  overflow: "hidden",
  minHeight: 132,
  padding: 16,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  textDecoration: "none",
  cursor: "pointer",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  boxShadow: tokens.color.shadowMd,
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  selectors: {
    "&:hover": { borderColor: tokens.color.borderStrong },
  },
})

export const draftHeaderRow = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
})

export const draftHeaderGroup = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
})

export const draftTypeText = style({
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: tokens.color.textSubtle,
})

export const draftSourceText = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontSize: 10,
  color: tokens.color.accent,
  fontWeight: 500,
})

export const draftBody = style({
  flex: 1,
})

export const draftClientLine = style({
  fontSize: 11.5,
  color: tokens.color.textMuted,
  marginTop: 4,
})

export const draftProgressBlock = style({})

export const draftProgressLabel = style({
  fontSize: 10.5,
  color: tokens.color.textSubtle,
  marginTop: 5,
})

export const draftIcon = style({
  width: 30,
  height: 30,
  borderRadius: 8,
  background: tokens.color.bgSunken,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: tokens.color.textMuted,
  flexShrink: 0,
})

export const draftTitle = style({
  fontSize: 13.5,
  fontWeight: 600,
  color: tokens.color.text,
  letterSpacing: "-0.015em",
  lineHeight: 1.3,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
})

export const draftProgressTrack = style({
  height: 4,
  borderRadius: 999,
  background: tokens.color.borderStrong,
  overflow: "hidden",
})

export const draftProgressFill = style({
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #C0A147, #9a7f2e)",
})

export const featuredGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
})

export const featuredCard = style({
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  gap: 14,
  cursor: "pointer",
  transition: "border-color 0.15s, box-shadow 0.15s",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 16,
  boxShadow: tokens.color.shadowMd,
  textDecoration: "none",
  selectors: {
    "&:hover": { borderColor: tokens.color.borderStrong },
  },
})

export const quickTemplateIcon = style({
  width: 32,
  height: 40,
  borderRadius: 5,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  paddingBottom: 4,
  flexShrink: 0,
  position: "relative",
})

export const quickTemplateCode = style({
  fontSize: 7.5,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "#020D25",
  fontFamily: tokens.font.mono,
})

export const quickTemplateBar = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 3.5,
  background: "#C0A147",
  borderRadius: "5px 5px 0 0",
})

export const quickTemplateBody = style({
  flex: 1,
  minWidth: 0,
})

export const quickTemplateTitle = style({
  fontSize: 13,
  fontWeight: 600,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})

export const quickTemplateSubtitle = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
  marginTop: 2,
})

export const quickTemplateArrow = style({
  color: tokens.color.textSubtle,
  flexShrink: 0,
})

export const cardFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 8,
  borderTop: `1px solid ${tokens.color.border}`,
})

export const categoryGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
})

export const categoryCard = style({
  position: "relative",
  overflow: "hidden",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 14,
  padding: "18px 18px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: tokens.font.sans,
  boxShadow: tokens.color.shadowSm,
  selectors: {
    "&:hover": { borderColor: tokens.color.borderStrong },
  },
})

export const categoryTitle = style({
  fontSize: 14,
  fontWeight: 600,
  color: tokens.color.text,
  letterSpacing: "-0.015em",
  marginBottom: 4,
})

export const categoryDescription = style({
  fontSize: 12,
  color: tokens.color.textMuted,
  lineHeight: 1.45,
})
