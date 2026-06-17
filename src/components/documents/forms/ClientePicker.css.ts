import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

export const root = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 6,
})

export const inputWrap = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
})

export const inputIcon = style({
  position: "absolute",
  left: 11,
  top: "50%",
  transform: "translateY(-50%)",
  color: tokens.color.textSubtle,
  pointerEvents: "none",
  display: "flex",
})

export const input = style({
  width: "100%",
  padding: "10px 14px 10px 32px",
  background: tokens.color.bgSoft,
  border: "1px solid transparent",
  borderRadius: tokens.radius.md,
  fontFamily: tokens.font.sans,
  fontSize: 13,
  color: tokens.color.text,
  outline: "none",
  boxSizing: "border-box",
  selectors: {
    "&:focus": {
      borderColor: tokens.brand.gold,
      boxShadow: `0 0 0 3px ${tokens.color.ring}`,
    },
    "&::placeholder": { color: tokens.color.textSubtle },
  },
})

export const clearBtn = style({
  position: "absolute",
  right: 8,
  top: "50%",
  transform: "translateY(-50%)",
  width: 20,
  height: 20,
  borderRadius: tokens.radius.xs,
  border: "none",
  background: "transparent",
  color: tokens.color.textSubtle,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  selectors: {
    "&:hover": { background: tokens.color.surface, color: tokens.color.text },
  },
})

export const menu = style({
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 30,
  maxHeight: 260,
  overflowY: "auto",
  background: "var(--lex-acrylic-strong)",
  backdropFilter: "var(--lex-blur)",
  WebkitBackdropFilter: "var(--lex-blur)",
  border: "1px solid var(--lex-acrylic-border)",
  borderRadius: tokens.radius.md,
  boxShadow:
    "var(--lex-glass-shadow), 0 12px 28px rgba(2,13,37,0.16), inset 0 1px 0 rgba(255,255,255,0.16)",
  padding: 4,
})

export const item = style({
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: tokens.radius.sm,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
  selectors: {
    "&:hover": { background: tokens.color.bgSoft },
  },
})

export const itemAvatar = style({
  width: 26,
  height: 26,
  flexShrink: 0,
  borderRadius: "50%",
  background: tokens.color.accentSoft,
  color: tokens.color.accent,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
})

export const itemMeta = style({
  flex: 1,
  minWidth: 0,
})

export const itemName = style({
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.text,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})

export const itemSub = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})

export const emptyState = style({
  padding: "12px 10px",
  fontSize: 12,
  color: tokens.color.textSubtle,
  textAlign: "center",
})

export const linkedChip = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px 8px 12px",
  borderRadius: tokens.radius.md,
  background: tokens.color.accentSoft,
  border: `1px solid ${tokens.color.borderGold}`,
})

export const linkedDot = style({
  width: 26,
  height: 26,
  flexShrink: 0,
  borderRadius: "50%",
  background: tokens.brand.gold,
  color: tokens.brand.navy,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
})

export const linkedMeta = style({
  flex: 1,
  minWidth: 0,
})

export const linkedName = style({
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.text,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})

export const linkedSub = style({
  fontSize: 11,
  color: tokens.color.accent,
})

export const linkedUnlink = style({
  flexShrink: 0,
  width: 22,
  height: 22,
  borderRadius: tokens.radius.xs,
  border: "none",
  background: "transparent",
  color: tokens.color.textMuted,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  selectors: {
    "&:hover": { background: tokens.color.surface, color: tokens.color.text },
  },
})

export const helpHint = style({
  fontSize: 11,
  color: tokens.color.textSubtle,
  lineHeight: 1.45,
})
