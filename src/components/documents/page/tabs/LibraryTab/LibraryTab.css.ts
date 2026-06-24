import { style } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"
import { pillBase } from "../../documents-page.css"

export const pageFrameLibrary = style({
  padding: "28px 40px 40px",
})

export const libraryHeader = style({
  marginBottom: 24,
})

export const libraryTitle = style({
  margin: 0,
  fontSize: 25,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  color: tokens.color.text,
})

export const librarySubtitle = style({
  margin: "6px 0 0",
  fontSize: 13,
  color: tokens.color.textMuted,
})

// Shared atom — reused by the financeiro KPI grids (ContasTab / CasosSemFeeTab).
export const statsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  marginBottom: 20,
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
  height: 38,
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
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
})

export const segmentedButton = recipe({
  base: [
    pillBase,
    {
      height: 32,
      padding: "0 13px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: "-0.01em",
      color: tokens.color.textMuted,
    },
  ],
  variants: {
    active: {
      true: {
        borderColor: tokens.color.borderGold,
        background: tokens.color.accentSoft,
        color: tokens.color.accent,
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
  fontSize: "11px",
  fontWeight: 500,
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

export const draftMetaBody = style({
  minWidth: 0,
})

export const documentIcon = style({
  width: 28,
  height: 36,
  borderRadius: 4,
  background: tokens.color.surface,
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

export const documentMetaTextWrap = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
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
  fontSize: "10px",
  fontWeight: 500,
})

export const documentClientText = style({
  fontSize: 12,
  color: tokens.color.textMuted,
})

export const documentDateText = style({
  fontSize: 12,
  color: tokens.color.textSubtle,
})

export const documentStatusPill = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 500,
  padding: "3px 8px",
  borderRadius: 6,
})

export const documentStatusDot = style({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "currentColor",
  display: "inline-block",
})

export const tableActions = style({
  display: "inline-flex",
  gap: 4,
})

export const documentActionsCell = style({
  textAlign: "right",
})

export const compactIconButton = style({
  width: 28,
  height: 28,
  padding: 0,
})

export const footerBar = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderTop: `1px solid ${tokens.color.border}`,
  background: tokens.color.bgSoft,
  fontSize: "12px",
  color: tokens.color.textMuted,
})

export const formatoText = style({
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: tokens.color.textSubtle,
})

// ── Row "..." menu ────────────────────────────────────────────────────────
export const rowMenuWrap = style({
  position: "relative",
  display: "inline-flex",
})

export const rowMenu = style({
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  zIndex: 20,
  minWidth: 200,
  padding: 4,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.md,
  boxShadow: tokens.color.shadowMd,
  display: "flex",
  flexDirection: "column",
  gap: 2,
})

export const rowMenuItem = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  height: 32,
  padding: "0 10px",
  borderRadius: tokens.radius.sm,
  border: "none",
  background: "transparent",
  color: tokens.color.text,
  fontSize: 13,
  fontFamily: tokens.font.sans,
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: tokens.color.bgSoft },
    "&:disabled": { opacity: 0.5, cursor: "default" },
  },
})

export const rowMenuItemDanger = style({
  color: "var(--crit)",
  selectors: {
    "&:hover": { background: "rgba(220, 38, 38, 0.08)" },
  },
})

export const rowMenuDivider = style({
  height: 1,
  margin: "3px 4px",
  background: tokens.color.border,
})

// ── Zero state ────────────────────────────────────────────────────────────
export const emptyState = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "64px 24px",
  textAlign: "center",
})

export const emptyIcon = style({
  width: 56,
  height: 56,
  borderRadius: 14,
  background: tokens.color.bgSunken,
  color: tokens.color.textSubtle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 8,
})

export const emptyTitle = style({
  fontSize: 16,
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.01em",
})

export const emptyDesc = style({
  fontSize: 14,
  color: tokens.color.textMuted,
  maxWidth: 360,
  lineHeight: 1.5,
  marginBottom: 6,
})
