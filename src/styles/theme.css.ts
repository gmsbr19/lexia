import { createGlobalTheme, createTheme, globalStyle, style } from "@vanilla-extract/css";
import { tokens } from "./tokens.css";

const fontSans =
  "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
const fontMono =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// Radii are concentric: 6 / 8 / 10 / 14 — legacy xl/2xl aliases pinned to the
// top of the scale so nothing exceeds 14px.
const radius = {
  xs: "6px",
  sm: "8px",
  md: "10px",
  lg: "14px",
  xl: "14px",
  "2xl": "14px",
};

const space = {
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
};

const brand = {
  navy: "#020D25",
  gold: "#C0A147",
  goldSoft: "#D8BE7A",
  goldDeep: "#9A7F2E",
};

const font = { sans: fontSans, display: fontSans, mono: fontMono };

// Light theme — surfaces: page #FAFAF7, card/sidebar #FFFFFF, elevated #FFFFFF
// (separated by border, not by a fourth tone). bg-sunken is a subtle navy fill
// for icon containers / kbd / neutral badges.
const lightShadowMd =
  "0 12px 30px rgba(2, 13, 37, 0.10), 0 2px 6px rgba(2, 13, 37, 0.05)";
createGlobalTheme(":root", tokens, {
  brand,
  font,
  radius,
  space,
  color: {
    bg: "#FAFAF7",
    bgElevated: "#FFFFFF",
    bgSunken: "rgba(2, 13, 37, 0.05)",
    bgSoft: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceHover: "#F2F1EC",
    border: "#020d2514",
    borderStrong: "rgba(2, 13, 37, 0.16)",
    borderGold: "rgba(154, 127, 46, 0.45)",
    text: "#020D25",
    textMuted: "rgba(2, 13, 37, 0.64)",
    textSubtle: "rgba(2, 13, 37, 0.44)",
    accent: "#8A6B22",
    accentStrong: "#9A7F2E",
    accentSoft: "rgba(192, 161, 71, 0.14)",
    ok: "#1F8A4C",
    okSoft: "rgba(31, 138, 76, 0.10)",
    warn: "#B47E12",
    warnSoft: "rgba(180, 126, 18, 0.12)",
    crit: "#C0492F",
    critSoft: "rgba(192, 73, 47, 0.10)",
    neutralSoft: "rgba(2, 13, 37, 0.05)",
    ai: "#9A7F2E",
    aiSoft: "rgba(192, 161, 71, 0.12)",
    overlay: "rgba(2, 13, 37, 0.45)",
    shadowSm: "0 1px 2px rgba(2, 13, 37, 0.05)",
    shadowMd: lightShadowMd,
    shadowLg: lightShadowMd,
    ring: "rgba(192, 161, 71, 0.45)",
  },
});

export const darkTheme = "theme-dark";

// Dark theme (the system's home) — exactly 3 navy levels: page #020D25,
// card/sidebar #0A1733 (surface == bg-soft: content separates by border),
// modal/popover #13234C. Gold: accent (#D8BE7A) is for text/icons over navy;
// accent-strong (#C0A147) is the solid CTA/brand gold.
const darkShadowMd =
  "0 12px 32px rgba(0, 0, 0, 0.44), 0 2px 6px rgba(0, 0, 0, 0.30)";
createGlobalTheme(`.${darkTheme}`, tokens, {
  brand,
  font,
  radius,
  space,
  color: {
    bg: "#020D25",
    bgElevated: "#13234C",
    bgSunken: "rgba(255, 255, 255, 0.06)",
    bgSoft: "#0A1733",
    surface: "#0A1733",
    surfaceHover: "#12214A",
    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.16)",
    borderGold: "rgba(192, 161, 71, 0.40)",
    text: "#F5F1E4",
    textMuted: "rgba(245, 241, 228, 0.66)",
    textSubtle: "rgba(245, 241, 228, 0.44)",
    accent: "#D8BE7A",
    accentStrong: "#C0A147",
    accentSoft: "rgba(192, 161, 71, 0.12)",
    ok: "#4FC07D",
    okSoft: "rgba(79, 192, 125, 0.12)",
    warn: "#E0B257",
    warnSoft: "rgba(224, 178, 87, 0.14)",
    crit: "#E07A60",
    critSoft: "rgba(224, 122, 96, 0.12)",
    neutralSoft: "rgba(255, 255, 255, 0.06)",
    ai: "#C0A147",
    aiSoft: "rgba(192, 161, 71, 0.12)",
    overlay: "rgba(2, 13, 37, 0.70)",
    shadowSm: "0 1px 2px rgba(0, 0, 0, 0.40)",
    shadowMd: darkShadowMd,
    shadowLg: darkShadowMd,
    ring: "rgba(192, 161, 71, 0.55)",
  },
});

// Finance semantic colors (positive / negative / amber) — theme-aware, used by
// KPI deltas, DRE results, charts and alerts. Mapped to the system semantics
// (ok / crit / warn) so the whole app codes state with the same four colors.
globalStyle(":root", {
  vars: {
    "--fin-pos": "#1F8A4C",
    "--fin-neg": "#C0492F",
    "--fin-amber": "#B47E12",
    "--ease": "cubic-bezier(0.22, 1, 0.36, 1)",
    "--dur": "160ms",
    // Frosted-glass (acrylic) recipe — preset "E · Vidro fosco" from the design
    // handoff, defined GLOBALLY so every floating surface (modals, popups,
    // toasts, the notifications dropdown — many rendered outside .crm-scope via
    // portals) shares the EXACT same look. The shared recipe lives in
    // glass.css.ts; here we only set the tokens it reads. Translucency = rgba()
    // alpha + backdrop-filter, NEVER opacity. `--lex-glass-base` is the RGB
    // triplet so the tint recolors without touching alpha.
    // THEME-AWARE: light mode uses a white-tinted glass so the surfaces' dark
    // `var(--text)` stays legible; dark mode uses the handoff's navy fosco. The
    // Apple edge refraction + glow ring are added by glass.css.ts on top.
    // Light (:root): white glass, subtle navy hairline, gentle lift.
    "--lex-glass-base": "255,255,255",
    "--lex-acrylic": "rgba(var(--lex-glass-base),0.62)",
    "--lex-acrylic-pill": "rgba(var(--lex-glass-base),0.72)",
    "--lex-acrylic-strong": "rgba(var(--lex-glass-base),0.80)",
    "--lex-acrylic-border": "rgba(2,13,37,0.10)",
    "--lex-blur": "blur(20px) saturate(120%)",
    "--lex-glass-shadow":
      "0 10px 30px rgba(2,13,37,0.12), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 0 20px rgba(255,255,255,0.05)",
  },
});
globalStyle(`.${darkTheme}`, {
  vars: {
    "--fin-pos": "#4FC07D",
    "--fin-neg": "#E07A60",
    "--fin-amber": "#E0B257",
    // Dark (.theme-dark): the handoff's navy "fosco" — glass-base is the pure
    // brand navy #020D25 per preset E; border is a faint white hairline.
    "--lex-glass-base": "2,13,37",
    "--lex-acrylic": "rgba(var(--lex-glass-base),0.45)",
    "--lex-acrylic-pill": "rgba(var(--lex-glass-base),0.55)",
    "--lex-acrylic-strong": "rgba(var(--lex-glass-base),0.66)",
    "--lex-acrylic-border": "rgba(255,255,255,0.08)",
    "--lex-blur": "blur(20px) saturate(120%)",
    "--lex-glass-shadow":
      "0 16px 40px rgba(2,13,37,0.35), inset 0 0 24px rgba(174,174,174,0.04), inset 0 0 4px 2px rgba(255,255,255,0.03)",
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
  transition:
    "background-color 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out, box-shadow 160ms ease-out, fill 160ms ease-out, stroke 160ms ease-out, outline-color 160ms ease-out",
});
globalStyle("body *, body *::before, body *::after", {
  transition:
    "background-color 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out, box-shadow 160ms ease-out, fill 160ms ease-out, stroke 160ms ease-out, outline-color 160ms ease-out",
});
globalStyle("#__next, main", { height: "100%" });
globalStyle("::-webkit-scrollbar", { width: "10px", height: "10px" });
globalStyle("::-webkit-scrollbar-track", { background: "transparent" });
globalStyle("::-webkit-scrollbar-thumb", {
  background: tokens.color.borderStrong,
  borderRadius: "999px",
});

export const unselectable = style({
  userSelect: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
  msUserSelect: "none",
});
