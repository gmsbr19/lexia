import { createGlobalTheme, globalStyle } from "@vanilla-extract/css";
import { tokens } from "./tokens.css";

const fontSans =
  "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
const fontMono =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

createGlobalTheme(":root", tokens, {
  brand: {
    navy: "#020D25",
    gold: "#C0A147",
    goldSoft: "#d8be7a",
    goldDeep: "#9a7f2e",
  },
  font: {
    sans: fontSans,
    display: fontSans,
    mono: fontMono,
  },
  radius: {
    xs: "6px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "22px",
    "2xl": "28px",
  },
  space: {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "32px",
    "8": "40px",
    "9": "56px",
    "10": "72px",
  },
  color: {
    bg: "#FAFAF7",
    bgElevated: "#FFFFFF",
    bgSunken: "#F2F1EC",
    bgSoft: "#F7F6F1",
    surface: "#FFFFFF",
    surfaceHover: "#F7F6F1",
    border: "rgba(2, 13, 37, 0.08)",
    borderStrong: "rgba(2, 13, 37, 0.14)",
    text: "#020D25",
    textMuted: "rgba(2, 13, 37, 0.62)",
    textSubtle: "rgba(2, 13, 37, 0.42)",
    accent: "#9a7f2e",
    accentSoft: "rgba(192, 161, 71, 0.12)",
    shadowSm:
      "0 1px 2px rgba(2, 13, 37, 0.04), 0 1px 1px rgba(2, 13, 37, 0.03)",
    shadowMd:
      "0 4px 14px rgba(2, 13, 37, 0.06), 0 1px 3px rgba(2, 13, 37, 0.04)",
    shadowLg:
      "0 18px 40px rgba(2, 13, 37, 0.08), 0 4px 12px rgba(2, 13, 37, 0.04)",
    ring: "rgba(192, 161, 71, 0.45)",
  },
});

export const darkTheme = "theme-dark";

createGlobalTheme(`.${darkTheme}`, tokens, {
  brand: {
    navy: "#020D25",
    gold: "#C0A147",
    goldSoft: "#d8be7a",
    goldDeep: "#9a7f2e",
  },
  font: {
    sans: fontSans,
    display: fontSans,
    mono: fontMono,
  },
  radius: {
    xs: "6px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "22px",
    "2xl": "28px",
  },
  space: {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "32px",
    "8": "40px",
    "9": "56px",
    "10": "72px",
  },
  color: {
    bg: "#020D25",
    bgElevated: "#0A1838",
    bgSunken: "#010718",
    bgSoft: "#07142F",
    surface: "#0C1B3E",
    surfaceHover: "#11234B",
    border: "rgba(255, 255, 255, 0.07)",
    borderStrong: "rgba(255, 255, 255, 0.14)",
    text: "#F5F1E4",
    textMuted: "rgba(245, 241, 228, 0.62)",
    textSubtle: "rgba(245, 241, 228, 0.38)",
    accent: "#C0A147",
    accentSoft: "rgba(192, 161, 71, 0.14)",
    shadowSm: "0 1px 2px rgba(0, 0, 0, 0.4)",
    shadowMd:
      "0 6px 20px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)",
    shadowLg:
      "0 24px 50px rgba(0, 0, 0, 0.5), 0 6px 16px rgba(0, 0, 0, 0.3)",
    ring: "rgba(192, 161, 71, 0.55)",
  },
});

globalStyle("*, *::before, *::after", { boxSizing: "border-box" });
globalStyle("html, body", { margin: 0, padding: 0, height: "100%" });
globalStyle("body", {
  fontFamily: tokens.font.sans,
  background: tokens.color.bg,
  color: tokens.color.text,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  letterSpacing: "-0.01em",
});
globalStyle("#__next, main", { height: "100%" });
globalStyle("::-webkit-scrollbar", { width: "10px", height: "10px" });
globalStyle("::-webkit-scrollbar-track", { background: "transparent" });
globalStyle("::-webkit-scrollbar-thumb", {
  background: tokens.color.borderStrong,
  borderRadius: "999px",
});
