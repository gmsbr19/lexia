import { style, keyframes } from "@vanilla-extract/css";
import { tokens } from "@/styles/tokens.css";

export const sidebar = style({
  background: tokens.color.bgSoft,
  borderRight: `1px solid ${tokens.color.border}`,
  padding: "14px 12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  flexShrink: 0,
  transition: "width 0.2s ease",
  overflowX: "hidden",
});

export const navItem = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "7px 10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13.5px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: tokens.color.textMuted,
  background: "transparent",
  border: "none",
  width: "100%",
  textAlign: "left",
  transition: "background 0.1s, color 0.1s",
  ":hover": {
    background: tokens.color.surfaceHover,
    color: tokens.color.text,
  },
  textDecoration: "none"
});

export const navItemActive = style({
  background: tokens.color.accentSoft,
  color: tokens.color.accent,
  fontWeight: 600,
  ":hover": { background: tokens.color.accentSoft, color: tokens.color.accent },
});

export const navBadge = style({
  marginLeft: "auto",
  fontSize: "11px",
  fontWeight: 500,
  background: tokens.color.bgSunken,
  color: tokens.color.textMuted,
  padding: "1px 7px",
  borderRadius: "999px",
});

export const topbar = style({
  display: "flex",
  alignItems: "center",
  gap: "16px",
  height: "62px",
  padding: "14px 28px",
  borderBottom: `1px solid ${tokens.color.border}`,
  background: tokens.color.bg,
  minHeight: "62px",
  boxSizing: "border-box",
  flexShrink: 0,
  overflow: "hidden",
});

export const mainContent = style({
  flex: 1,
  overflow: "auto",
  background: tokens.color.bg,
});

export const appShell = style({
  display: "flex",
  height: "100dvh",
  overflow: "hidden",
});

export const mainArea = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  overflow: "hidden",
});

const pulseAnim = keyframes({
  "0%, 100%": { opacity: 0.6 },
  "50%": { opacity: 1 },
});

export const pulse = style({
  animation: `${pulseAnim} 2s ease-in-out infinite`,
});
