// Popover — static styles. The panel's per-render POSITION (top/left/bottom/
// width/zIndex/visibility) is inherently dynamic (computed from the trigger's
// getBoundingClientRect() at open time) and lives inline in Popover.tsx,
// mirroring how src/components/tarefas/tf-kit.tsx's `Menu` already does it —
// everything else (radius/padding/glass composition) belongs here, following
// the pattern of src/components/ui/datagrid/datagrid.css.ts's `facetMenu`.
import { globalStyle, style } from "@vanilla-extract/css"
import { tokens } from "@/styles/tokens.css"
import { lexGlassStrong } from "@/styles/glass.css"

// Default: shrink-to-fit around a chip/button trigger (a Menu-style opener).
export const wrap = style({ position: "relative", display: "inline-flex" })
// `fill` variant: a full-width block box, so a trigger that declares
// width:100% (Combobox/DateField, which should span their form column like the
// native <input>/<select> they replace) actually fills the container instead
// of shrink-wrapping to its own content inside the inline-flex box above.
export const wrapFill = style({ position: "relative", display: "block", width: "100%" })

export const panel = style([
  lexGlassStrong,
  {
    borderRadius: 10,
    padding: 6,
    // Popovers can be triggered from inside right-aligned/centered layouts —
    // never let that alignment leak into the panel's own content.
    textAlign: "left",
    maxHeight: 360,
    overflowY: "auto",
    // Default elevation for a small floating panel — same value Menu/
    // facetMenu already use for this scale of surface. Consumers with a
    // taller/heavier panel (e.g. a DatePicker calendar) can override via
    // glassElevation() on `panelClassName` if they ever need to.
    vars: { "--lex-elevation": "0 12px 28px rgba(2,13,37,0.16)" },
  },
])

// Refined, invisible-until-hover scrollbar for the panel itself (it caps at 360px
// and scrolls for long menus). Portaled to <body>, so without this it inherits the
// always-visible global thumb. WebKit pseudo ONLY (never set scrollbar-width/color
// here — Chrome ≥121 would switch these off). Firefox keeps the global thin fallback.
globalStyle(`${panel}::-webkit-scrollbar`, { width: "6px", height: "6px" })
globalStyle(`${panel}::-webkit-scrollbar-track`, { background: "transparent" })
globalStyle(`${panel}::-webkit-scrollbar-thumb`, { backgroundColor: "transparent", borderRadius: "999px" })
globalStyle(`${panel}:hover::-webkit-scrollbar-thumb`, { backgroundColor: tokens.color.borderStrong })
globalStyle(`${panel}::-webkit-scrollbar-thumb:hover`, { backgroundColor: tokens.color.textSubtle })
