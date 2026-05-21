import { recipe } from "@vanilla-extract/recipes";
import { style } from "@vanilla-extract/css";
import { tokens } from "./tokens.css";

export const btn = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space["2"],
    height: "36px",
    padding: `0 ${tokens.space["4"]}`,
    borderRadius: tokens.radius.sm,
    fontFamily: tokens.font.sans,
    fontSize: "13.5px",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    transition:
      "background 0.15s ease, transform 0.1s ease, border-color 0.15s ease, filter 0.15s ease",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
    outline: "none",
    textDecoration: "none",
    ":active": { transform: "translateY(0.5px)" },
  },
  variants: {
    variant: {
      primary: {
        background: tokens.brand.navy,
        color: "#F5F1E4",
        selectors: {
          [`.theme-dark &`]: {
            background: tokens.brand.gold,
            color: tokens.brand.navy,
          },
          "&:hover": { filter: "brightness(1.08)" },
        },
      },
      secondary: {
        background: tokens.color.surface,
        color: tokens.color.text,
        borderColor: tokens.color.borderStrong,
        ":hover": { background: tokens.color.surfaceHover },
      },
      ghost: {
        background: "transparent",
        color: tokens.color.textMuted,
        ":hover": {
          background: tokens.color.surfaceHover,
          color: tokens.color.text,
        },
      },
      gold: {
        background: tokens.brand.gold,
        color: tokens.brand.navy,
        fontWeight: "600",
        ":hover": { background: tokens.brand.goldSoft },
      },
    },
  },
  defaultVariants: { variant: "secondary" },
});

export const input = style({
  width: "100%",
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: tokens.radius.sm,
  padding: "10px 12px",
  fontFamily: tokens.font.sans,
  fontSize: "13.5px",
  color: tokens.color.text,
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  ":focus": {
    borderColor: tokens.brand.gold,
    boxShadow: `0 0 0 3px ${tokens.color.ring}`,
  },
  "::placeholder": { color: tokens.color.textSubtle },
});

export const label = style({
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: tokens.color.textMuted,
  marginBottom: "6px",
  letterSpacing: "0.01em",
});

export const card = style({
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.lg,
  boxShadow: tokens.color.shadowSm,
});

export const pill = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  height: "22px",
  padding: "0 8px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.01em",
  background: tokens.color.accentSoft,
  color: tokens.color.accent,
});

export const divider = style({
  height: "1px",
  background: tokens.color.border,
});
