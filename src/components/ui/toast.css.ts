import { style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"

// Frosted-glass (acrylic) pill, bottom-center, above everything — same recipe as
// the LexIA bar / modals (theme-aware via the global --lex-acrylic vars).
export const toast = style({
  position: "fixed",
  bottom: 22,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 300,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 16px",
  borderRadius: 10,
  background: "var(--lex-acrylic-strong)",
  backdropFilter: "var(--lex-blur)",
  WebkitBackdropFilter: "var(--lex-blur)",
  color: tokens.color.text,
  boxShadow: "var(--lex-glass-shadow), 0 12px 32px rgba(2,13,37,0.18), inset 0 1px 0 rgba(255,255,255,0.16)",
  fontSize: 14,
  fontWeight: 500,
  border: "1px solid var(--lex-acrylic-border)",
  maxWidth: "min(560px, calc(100vw - 32px))",
})

export const toastError = style({
  borderColor: "var(--fin-neg, #C0492F)",
})

// Semantic icon slot — color follows the toast kind (neutral info / crit error).
export const toastIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  color: tokens.color.textMuted,
})

export const toastIconError = style({
  color: "var(--fin-neg, #C0492F)",
})

export const retryBtn = style({
  border: "none",
  borderRadius: 6,
  padding: "5px 10px",
  background: tokens.brand.gold,
  color: tokens.brand.navy,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  ":hover": { background: tokens.brand.goldSoft },
})
