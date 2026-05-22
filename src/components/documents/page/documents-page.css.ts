import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
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

export const pageFrameLibrary = style({
  padding: "28px 40px 40px",
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

export const libraryHeader = style({
  marginBottom: 24,
})

export const statsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  marginBottom: 20,
})

export const statCard = style({
  padding: "14px 16px",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 16,
  boxShadow: tokens.color.shadowSm,
})

export const statLabel = style({
  fontSize: "11.5px",
  color: tokens.color.textMuted,
})

export const statValueRow = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  marginTop: 4,
})

export const statValue = style({
  fontSize: 22,
  fontWeight: 600,
  color: tokens.color.text,
  letterSpacing: "-0.02em",
})

export const statTrend = recipe({
  base: {
    fontSize: 11,
    fontWeight: 500,
  },
  variants: {
    positive: {
      true: { color: "#2ea043" },
    },
    negative: {
      true: { color: "#d97706" },
    },
  },
})

export const filterBar = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 16,
})

export const searchWrap = style({
  position: "relative",
  flex: 1,
  maxWidth: 320,
})

export const searchIcon = style({
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: tokens.color.textSubtle,
})

export const searchInput = style({
  width: "100%",
  height: 34,
  paddingLeft: 36,
  paddingRight: 12,
  paddingTop: 0,
  paddingBottom: 0,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: tokens.radius.sm,
  fontFamily: tokens.font.sans,
  fontSize: 13,
  color: tokens.color.text,
  outline: "none",
})

export const segmentedGroup = style({
  display: "flex",
  gap: 4,
  background: tokens.color.bgSoft,
  borderRadius: 8,
  padding: 3,
})

export const segmentedButton = recipe({
  base: {
    height: 26,
    padding: "0 10px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: tokens.color.textMuted,
    fontSize: "11.5px",
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "none",
    fontFamily: tokens.font.sans,
  },
  variants: {
    active: {
      true: {
        background: tokens.color.surface,
        color: tokens.color.text,
        boxShadow: tokens.color.shadowSm,
      },
    },
  },
})

export const tableCard = style({
  overflow: "hidden",
  padding: 0,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.lg,
  boxShadow: tokens.color.shadowSm,
})

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
})

export const tableHeadRow = style({
  background: tokens.color.bgSoft,
})

export const tableHeadCell = style({
  textAlign: "left",
  padding: "10px 16px",
  fontSize: "10.5px",
  fontWeight: 600,
  color: tokens.color.textSubtle,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
})

export const tableRow = style({
  borderTop: `1px solid ${tokens.color.border}`,
})

export const documentCell = style({
  padding: "12px 16px",
})

export const documentMeta = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
})

export const documentIcon = style({
  width: 28,
  height: 36,
  borderRadius: 4,
  background: "#FFFFFF",
  border: `1px solid ${tokens.color.borderStrong}`,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  paddingBottom: 4,
  flexShrink: 0,
  position: "relative",
})

export const documentTitle = style({
  fontSize: 13,
  fontWeight: 500,
  color: tokens.color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
})

export const documentDetails = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  color: tokens.color.textSubtle,
  marginTop: 2,
})

export const documentSeparator = style({
  width: 2,
  height: 2,
  borderRadius: "50%",
  background: "currentColor",
  opacity: 0.5,
  display: "inline-block",
})

export const avatar = style({
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: tokens.color.bgSunken,
  color: tokens.color.text,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "9.5px",
  fontWeight: 600,
})

export const tableActions = style({
  display: "inline-flex",
  gap: 4,
})

export const compactSecondaryButton = style({
  height: 32,
  fontSize: 12.5,
  display: "flex",
  alignItems: "center",
  gap: 6,
})

export const compactIconButton = style({
  width: 28,
  height: 28,
  padding: 0,
})

export const compactPageAction = style({
  fontSize: 12,
  padding: 0,
  height: "auto",
})

export const toolbarSpacer = style({
  flex: 1,
})

export const draftMetaBody = style({
  minWidth: 0,
})

export const draftProgressWrap = style({
  marginTop: "auto",
})


export const libraryTitle = style({
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  letterSpacing: "-0.025em",
  color: tokens.color.text,
})

export const librarySubtitle = style({
  margin: "6px 0 0",
  fontSize: 13,
  color: tokens.color.textMuted,
})

export const sectionCard = style({
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 16,
  background: tokens.color.surface,
})

export const documentClientText = style({
  fontSize: 12.5,
  color: tokens.color.textMuted,
})

export const documentDateText = style({
  fontSize: 12.5,
  color: tokens.color.textSubtle,
})

export const documentMetaTextWrap = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
})

export const documentAiTag = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  color: tokens.color.accent,
})

export const documentStatusPill = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  fontWeight: 500,
  padding: "3px 8px",
  borderRadius: 999,
})

export const documentStatusDot = style({
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: "currentColor",
  display: "inline-block",
})

export const documentTypeText = style({
  fontSize: 7,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "#020D25",
  fontFamily: tokens.font.mono,
})

export const documentIconBar = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 3,
  background: "#C0A147",
  borderRadius: "4px 4px 0 0",
})

export const documentActionsCell = style({
  textAlign: "right",
})

export const footerBar = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderTop: `1px solid ${tokens.color.border}`,
  background: tokens.color.bgSoft,
  fontSize: "11.5px",
  color: tokens.color.textMuted,
})

export const pager = style({
  display: "flex",
  gap: 4,
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

export const templateMuted = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
})

export const loadingState = style({
  padding: 32,
  color: tokens.color.textMuted,
})
