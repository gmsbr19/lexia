import { tokens } from "@/styles/tokens.css"
import type { CSSProperties } from "react"

export const header: CSSProperties = {
  padding: "24px 20px 16px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexShrink: 0,
}

export const headerHairline: CSSProperties = {
  height: 1,
  background: tokens.color.border,
  flexShrink: 0,
}

export const containerRoot: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
}

export const modelSubtitle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  color: tokens.color.accent,
  textTransform: "uppercase",
  marginBottom: 3,
}

export const modelTitle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.02em",
}

export const headerLabel: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.textMuted,
  marginBottom: 0,
  letterSpacing: "0.01em",
}

export const rowAlignCenterGap8: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
}

export const sectionSubtitle: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.textMuted,
  marginBottom: 8,
}

export const changeModelButton: CSSProperties = {
  padding: 0,
  background: "none",
  border: "none",
  color: tokens.color.accent,
  fontSize: "11px",
  cursor: "pointer",
  fontWeight: 500,
  fontFamily: tokens.font.sans,
}

export const formBody: CSSProperties = {
  flex: 1,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
}

export const card: CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "8px 0 8px",
  display: "grid",
  gap: 14,
  background: "transparent",
  boxShadow: "none",
}

export const smallCard: CSSProperties = {
  border: "none",
  borderRadius: 6,
  padding: "10px 0 8px",
  display: "grid",
  gap: 12,
  background: "transparent",
}

export const rowBetween: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

export const iconButton: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: tokens.color.textSubtle,
  padding: 2,
}

// Dashed full-width add button
export const addButton: CSSProperties = {
  width: "100%",
  height: 40,
  background: "transparent",
  border: `1px dashed ${tokens.color.borderStrong}`,
  borderRadius: 10,
  color: tokens.color.textMuted,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  letterSpacing: "-0.005em",
  fontFamily: tokens.font.sans,
}

// Inline text link (kept for non-add actions)
export const linkButton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: "12px",
  color: tokens.color.accent,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px 0 0",
  fontFamily: tokens.font.sans,
}

// Contratante / sócio header row
export const contratanteTitle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: tokens.color.textMuted,
}

// Repeater (sócio, parcela) numbered header
export const repeaterHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
}

export const repeaterHeaderLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
}

export const repeaterBadge: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: tokens.color.accentSoft,
  color: tokens.color.accent,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  fontWeight: 500,
  flexShrink: 0,
  fontFeatureSettings: '"tnum"',
}

export const repeaterTitle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: tokens.color.text,
  letterSpacing: "-0.005em",
}

export const removeButton: CSSProperties = {
  background: "transparent",
  border: "none",
  color: tokens.color.textSubtle,
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 500,
  padding: "4px 8px",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: tokens.font.sans,
}

export const subLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.textMuted,
  marginBottom: 6,
}

// Date + "Na assinatura" side-by-side row
export const dateFieldRow: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "stretch",
}

export const dateDisplayActive: CSSProperties = {
  flex: 1,
  height: 40,
  padding: "0 14px",
  background: tokens.color.accentSoft,
  border: "1px solid rgba(192,161,71,0.35)",
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: "13px",
  color: tokens.color.accent,
  fontWeight: 500,
  minWidth: 0,
  overflow: "hidden",
}

export const dateToggleActive: CSSProperties = {
  height: 40,
  padding: "0 12px",
  background: tokens.brand.gold,
  color: tokens.brand.navy,
  border: `1px solid ${tokens.brand.gold}`,
  borderRadius: 10,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  letterSpacing: "-0.005em",
  fontFamily: tokens.font.sans,
  flexShrink: 0,
}

export const dateToggleInactive: CSSProperties = {
  height: 40,
  padding: "0 12px",
  background: tokens.color.surface,
  color: tokens.color.textMuted,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 10,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  letterSpacing: "-0.005em",
  fontFamily: tokens.font.sans,
  flexShrink: 0,
}

export const dateInput: CSSProperties = {
  height: 38,
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${tokens.color.border}`,
  fontSize: 13,
}

export const dateIsoText: CSSProperties = {
  fontSize: 11,
  color: tokens.color.textSubtle,
  marginTop: 5,
}

export const progressContainer: CSSProperties = {
  padding: "14px 20px",
  borderTop: `1px solid ${tokens.color.border}`,
  background: tokens.color.bg,
  flexShrink: 0,
}

export const progressTextRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
  color: tokens.color.textMuted,
  marginBottom: 6,
}

export const progressBarOuter: CSSProperties = {
  height: 4,
  borderRadius: 999,
  background: tokens.color.borderStrong,
  overflow: "hidden",
}

export const progressBarInner: CSSProperties = {
  height: "100%",
  background: tokens.brand.gold,
  borderRadius: 999,
  transition: "width 0.3s",
}

export const parcelRow: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-end",
}

export const parcelFlex: CSSProperties = { flex: 1 }

export const parcelDeleteButton: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: tokens.color.textSubtle,
  padding: "0 0 10px",
  flexShrink: 0,
}

export const tipoContainer: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
}

export const tipoButtonActive: CSSProperties = {
  padding: "6px 14px",
  borderRadius: 999,
  border: `1px solid ${tokens.color.accent}`,
  background: tokens.color.accentSoft,
  color: tokens.color.accent,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: tokens.font.sans,
  transition: "background-color 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out, box-shadow 0.12s ease-out",
}

export const tipoButtonInactive: CSSProperties = {
  padding: "6px 14px",
  borderRadius: 999,
  border: `1px solid ${tokens.color.border}`,
  background: "transparent",
  color: tokens.color.textMuted,
  fontSize: "12px",
  fontWeight: 400,
  cursor: "pointer",
  fontFamily: tokens.font.sans,
  transition: "background-color 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out, box-shadow 0.12s ease-out",
}

// Contratante strip (chip list) used above the client forms
export const contratanteStrip: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 18,
  paddingBottom: 14,
  borderBottom: `1px dashed ${tokens.color.borderStrong}`,
}

export const contratanteChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 10px 5px 7px",
  background: "transparent",
  color: tokens.color.textMuted,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: 999,
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "-0.005em",
  cursor: "pointer",
}

export const contratanteChipActive: CSSProperties = {
  background: tokens.color.accentSoft,
  color: tokens.color.accent,
  border: `1px solid rgba(192,161,71,0.35)`,
}

export const contratanteAddButton: CSSProperties = {
  background: "transparent",
  border: "none",
  color: tokens.color.textMuted,
  fontSize: "12px",
  fontWeight: 500,
  padding: "5px 8px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
}

// Compact segmented micro control
export const microSegContainer: CSSProperties = {
  display: "inline-flex",
  padding: 3,
  background: tokens.color.bgSoft,
  borderRadius: 10,
  border: `1px solid ${tokens.color.border}`,
  height: 40,
  boxSizing: "border-box",
}

export const microSegOptionActive: CSSProperties = {
  padding: "0 12px",
  minWidth: 28,
  fontSize: "12px",
  fontWeight: 500,
  color: tokens.color.text,
  background: tokens.color.surface,
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 2px rgba(2,13,37,0.08)",
}

export const microSegOptionInactive: CSSProperties = {
  padding: "0 12px",
  minWidth: 28,
  fontSize: "12px",
  fontWeight: 500,
  color: tokens.color.textMuted,
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}
