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

export const pageFrameCreate = style({
  padding: "32px 40px 48px",
})

export const pageFrameLibrary = style({
  padding: "28px 40px 40px",
})

export const pageFrameTemplates = style({
  padding: "28px 40px 48px",
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

export const draftList = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
})

export const draftGrid = draftList

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

export const draftMeta = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  minWidth: 0,
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

export const draftSubtitle = style({
  fontSize: "11.5px",
  color: tokens.color.textSubtle,
  marginTop: 4,
})

export const draftProgressMeta = style({
  fontSize: "10.5px",
  color: tokens.color.textMuted,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  fontWeight: 600,
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

export const cardOrb = style({
  position: "absolute",
  top: -24,
  right: -24,
  width: 80,
  height: 80,
  borderRadius: "50%",
  background: tokens.color.accentSoft,
  opacity: 0.4,
})

export const featuredTitle = style({
  fontSize: 13.5,
  fontWeight: 600,
  color: tokens.color.text,
  lineHeight: 1.3,
})

export const featuredDescription = style({
  fontSize: "11.5px",
  color: tokens.color.textMuted,
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

export const categoryIcon = style({
  width: 38,
  height: 38,
  borderRadius: 10,
  background: tokens.color.bgSunken,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: tokens.color.accent,
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

export const exampleChipIcon = style({
  color: tokens.color.accent,
  flexShrink: 0,
})

export const exampleChipText = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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
  base: {
    height: 30,
    padding: "0 14px",
    borderRadius: 999,
    border: `1px solid ${tokens.color.border}`,
    background: tokens.color.surface,
    color: tokens.color.textMuted,
    fontSize: "12.5px",
    fontWeight: 400,
    cursor: "pointer",
    fontFamily: tokens.font.sans,
  },
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

export const templateCard = style({
  position: "relative",
  overflow: "hidden",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: 16,
  padding: "20px 20px 16px",
  textDecoration: "none",
  display: "block",
  boxShadow: tokens.color.shadowSm,
  cursor: "pointer",
  selectors: {
    "&:hover": { borderColor: tokens.color.borderStrong },
  },
})

export const templateCardDisabled = style({
  opacity: 0.55,
})

export const templateDisabledHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: 12,
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

export const templateMuted = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
})

export const loadingState = style({
  padding: 32,
  color: tokens.color.textMuted,
})
