import { style, keyframes } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

// ── editor body: A4 preview (fills) + docked frosted panel (absolute, right) ──
// The panel is positioned ABSOLUTELY over the preview well so its backdrop-filter
// frosts the document workspace behind it (and the well's right padding re-centers
// the A4 to the left of the panel — the paper stays A4, never resizes).
const PANEL_W = "clamp(340px, 30vw, 420px)"

export const editorBody = style({
  position: "relative",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
})

export const previewWell = style({
  position: "absolute",
  inset: 0,
  overflow: "auto",
  background: tokens.color.bgSunken,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "16px 28px 28px",
  paddingRight: `calc(${PANEL_W} + 48px)`,
})

export const previewMeta = style({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  marginBottom: 12,
  fontSize: 12,
  color: tokens.color.textMuted,
  fontVariantNumeric: "tabular-nums",
})

// The docked panel "morphs" in — resizes/slides from the right, reading as the
// LexIA popup docking into the chat position. Transform-only (content visible).
const dockMorphIn = keyframes({
  from: { transform: "translateX(38px) scale(0.965)" },
  to: { transform: "translateX(0) scale(1)" },
})

// frosted glass shell — same acrylic family as the LexIA popup it morphs from,
// absolutely docked over the right of the preview so the blur frosts the workspace.
export const docPanel = style({
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: PANEL_W,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  borderLeft: "1px solid var(--lex-acrylic-border)",
  background: "var(--lex-acrylic)",
  backdropFilter: "var(--lex-blur, blur(16px) saturate(1.7))",
  WebkitBackdropFilter: "var(--lex-blur, blur(16px) saturate(1.7))",
  boxShadow: "var(--lex-glass-shadow, 0 4px 30px rgba(2,13,37,0.12))",
  transformOrigin: "right center",
  animation: `${dockMorphIn} 0.46s cubic-bezier(0.32, 0.72, 0.24, 1)`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
})

// Floating popup wrapper for the embedded LexIA chat (chat mode). Unlike docPanel
// (a full-height bordered side panel for the manual form), this floats the LexIA
// popup in the lateral position — the embedded card carries its own acrylic/blur.
export const lexFloat = style({
  position: "absolute",
  top: 16,
  right: 24,
  bottom: 16,
  width: "clamp(360px, 30vw, 440px)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minHeight: 0,
  zIndex: 5,
})

// The open-document name chip above the floating popup (the embedded bar has no
// header, so this keeps the document context visible).
export const lexFloatContext = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: tokens.radius.md,
  background: "var(--lex-acrylic-strong)",
  backdropFilter: "var(--lex-blur, blur(16px) saturate(1.7))",
  WebkitBackdropFilter: "var(--lex-blur, blur(16px) saturate(1.7))",
  border: "1px solid var(--lex-acrylic-border)",
  flexShrink: 0,
})

export const docPanelHeader = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "13px 14px",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
})

export const docPanelMark = style({
  position: "relative",
  width: 30,
  height: 30,
  borderRadius: tokens.radius.sm,
  flexShrink: 0,
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
})

export const docContextRow = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderBottom: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--bg-soft) 45%, transparent)",
  flexShrink: 0,
})

// scroll container when the panel shows the manual form
export const formScroll = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
})

// segmented toggle [LexIA | Formulário] in the toolbar
export const seg = style({
  display: "flex",
  alignItems: "center",
  gap: 2,
  background: tokens.color.bgSunken,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: tokens.radius.sm,
  padding: 3,
  height: 32,
  flexShrink: 0,
})

export const resizeRail = style({
  width: 10,
  display: "flex",
  alignItems: "stretch",
  justifyContent: "center",
  background: tokens.color.bg,
  borderRight: `1px solid ${tokens.color.border}`,
  borderLeft: `1px solid ${tokens.color.border}`,
  cursor: "col-resize",
  userSelect: "none",
  touchAction: "none",
  selectors: {
    "&:hover": {
      background: tokens.color.bgSoft,
    },
    "&:active": {
      background: tokens.color.accentSoft,
    },
  },
})

export const resizeHandle = style({
  width: 2,
  margin: "10px 0",
  borderRadius: 999,
  background: tokens.color.borderStrong,
  position: "relative",
  selectors: {
    "&::after": {
      content: "''",
      position: "absolute",
      inset: "50% auto auto 50%",
      width: 14,
      height: 28,
      transform: "translate(-50%, -50%)",
      borderRadius: 999,
      background: "transparent",
    },
    [`${resizeRail}:hover &`]: {
      background: tokens.color.accent,
    },
  },
})
