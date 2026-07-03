import { style } from "@vanilla-extract/css"

// ── Shared glass surface — preset "E · Vidro fosco" (design handoff) ──────────
// ONE recipe for every modal, dropdown, popover, spotlight, slide-in and toast
// in the app. Retint or reshape the whole system by editing the CSS custom
// properties (`--lex-acrylic*` / `--lex-blur` / `--lex-glass-shadow`) in
// theme.css.ts (:root = light / .theme-dark = dark) + the .crm-scope bridge in
// crm-theme.css — every surface below (and every inline/`.css.ts` consumer via
// the exported classes) picks it up automatically, nothing else needs to change.
//
// This file exists because the edge layer needs a real CSS pseudo-element —
// it can't be expressed through an inline `style={}` object:
//   ::before → a soft 1px glow ring (a masked gradient hairline on the border).
// CRITICAL: no pseudo/child of a glass surface may carry its OWN
// `backdrop-filter`. A nested backdrop-filter inside this element (which
// already has one + overflow:hidden) makes Chrome DROP the parent's blur
// entirely — the surface renders flat. The handoff's preset-E ::after
// refraction did exactly that and was removed.
//
// Per-surface outer elevation (the drop shadow that lifts a big modal off the
// page) layers in via the `--lex-elevation` custom property: unset by default
// (falls back to an inert shadow), or set locally — inline via `glassElevation()`
// for plain style={} consumers, or via vanilla-extract's `vars` for composed
// .css.ts consumers — so each surface adds its own drop without redefining the
// base recipe.
const glass = style({
  position: "relative",
  overflow: "hidden",
  borderRadius: 14,
  border: "1px solid var(--lex-acrylic-border)",
  backgroundClip: "padding-box",
  // Standard property ONLY — do NOT hand-write WebkitBackdropFilter here.
  // Turbopack's Lightning CSS collapses a manual webkit+standard pair into one
  // property group and re-emits it WRONG: the served chunk kept only
  // `-webkit-backdrop-filter`, which Chrome discards → no blur anywhere
  // (confirmed live: raw chunk had only the -webkit- form). Lightning adds
  // vendor prefixes for the configured targets (Safari) by itself.
  backdropFilter: "var(--lex-blur)",
  boxShadow: "var(--lex-elevation, 0 0 #0000), var(--lex-glass-shadow)",
  selectors: {
    // soft 1px glow ring — a masked gradient hairline riding the border
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      padding: 1,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.04) 38%, rgba(255,255,255,0.09))",
      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
      mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
      WebkitMaskComposite: "xor",
      maskComposite: "exclude",
      pointerEvents: "none",
    },
  },
})

/** Default-tier glass — modals, floating panels, spotlight, slide-ins. */
export const lexGlass = style([glass, { background: "var(--lex-acrylic)" }])
/** Stronger-fill glass — small surfaces over live content (menus, toasts, the
 * notifications dropdown) where legibility matters more than see-through. */
export const lexGlassStrong = style([glass, { background: "var(--lex-acrylic-strong)" }])
