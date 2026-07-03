import { style } from "@vanilla-extract/css"

// ── Shared glass surface ─────────────────────────────────────────────────────
// ONE recipe for every modal, dropdown, popover, and toast in the app. Retint
// or reshape the effect by editing the CSS custom properties in
// theme.css.ts (:root / .theme-dark) + the .crm-scope bridge in
// crm-theme.css — every surface below (and every inline consumer via the
// exported classes) picks it up automatically, nothing else needs to change.
//
// This file exists because the shine hairlines (::before top edge, ::after
// left edge) need real CSS — they can't be expressed through an inline
// `style={}` object. Consumers that used to hand-write
// `background/backdropFilter/border/boxShadow` inline should use `lexGlass`/
// `lexGlassStrong` (className) instead; plain `.css.ts` recipes should
// compose via `style([lexGlass, {...}])`.
//
// Per-surface outer elevation (the drop shadow that lifts a big modal off the
// page) layers in via the `--lex-elevation` custom property: unset by
// default (falls back to an inert shadow), or set locally — inline via
// `glassElevation(...)` for plain style={} consumers, or via vanilla-extract's
// `vars` for composed .css.ts consumers — so each surface can add its own
// outer shadow without duplicating the base recipe.
const base = style({
  position: "relative",
  overflow: "hidden",
  border: "1px solid var(--lex-acrylic-border)",
  backgroundClip: "padding-box",
  backdropFilter: "var(--lex-blur)",
  WebkitBackdropFilter: "var(--lex-blur)",
  boxShadow: "var(--lex-elevation, 0 0 #0000), var(--lex-glass-shadow)",
  backgroundImage:
    "linear-gradient(145deg, rgba(var(--lex-glass-base),0.42) 0%, rgba(var(--lex-glass-base),0.28) 46%, rgba(var(--lex-glass-base),0.16) 100%), radial-gradient(120% 100% at 12% 0%, rgba(var(--lex-glass-base),0.18) 0%, transparent 52%)",
  backgroundBlendMode: "normal, normal",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(var(--lex-glass-base),0.32), transparent)",
      pointerEvents: "none",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      width: 1,
      height: "100%",
      background: "linear-gradient(180deg, rgba(var(--lex-glass-base),0.28), transparent, rgba(var(--lex-glass-base),0.12))",
      pointerEvents: "none",
    },
  },
})

const glass = style({
  width: "240px",
  height: "360px",
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "20px",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(255, 255, 255, 0.1), inset 0 0 0px 0px rgba(255, 255, 255, 0)",
  position: "relative",
  overflow: "hidden",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(var(--lex-glass-base),0.32), transparent)",
      pointerEvents: "none",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      width: 1,
      height: "100%",
      background: "linear-gradient(180deg, rgba(var(--lex-glass-base),0.28), transparent, rgba(var(--lex-glass-base),0.12))",
      pointerEvents: "none",
    },
  },
})

/** Default-tier glass — modals, floating panels, slide-ins. */
export const lexGlass = style([glass, { background: "var(--lex-acrylic)" }])
/** Stronger-fill glass — small surfaces over live content (menus, toasts, the
 * notifications dropdown) where legibility matters more than see-through. */
export const lexGlassStrong = style([glass, { background: "var(--lex-acrylic-strong)" }])
