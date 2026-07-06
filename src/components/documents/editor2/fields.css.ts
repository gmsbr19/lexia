import { globalStyle, keyframes, style } from "@vanilla-extract/css"

// The design's interactive form-control kit (`.f-in`, from "LexIA - Documentos"):
// a FILLED input — soft-fill background, no visible border until focus, then a
// gold border + ring. Shared by the fields form panel and the on-paper
// fill / new-field popovers so filling a document feels like a real form.
export const fInput = style({
  height: 40,
  width: "100%",
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid transparent",
  background: "var(--bg-soft)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text)",
  outline: "none",
  letterSpacing: "-0.005em",
  transition: "border-color .14s, box-shadow .14s, background .14s",
  selectors: {
    "&::placeholder": { color: "var(--text-subtle)" },
    "&:hover:not(:focus)": { borderColor: "var(--border-strong)" },
    "&:focus": { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--ring)" },
  },
})

const fFlashKf = keyframes({ "0%": { background: "var(--accent-soft)" }, "100%": {} })
// Brief gold pulse when a value is set externally (client autofill / AI).
export const fFlash = style({ animation: `${fFlashKf} 1s ease` })

// Multi-line variant (endereço etc.).
export const fArea = style([fInput, { height: "auto", padding: "12px 14px", lineHeight: 1.6, resize: "vertical" }])

// The soft-fill glass select trigger (letterhead-style menus reuse the glass class).
export const fSelectTrigger = style([
  fInput,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    textAlign: "left",
  },
])

// Accordion section header (title + count pill + chevron), matching the design.
export const fSectionHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  width: "100%",
  padding: "15px 20px 13px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
})

globalStyle(`${fSectionHead}:hover`, { background: "var(--surface-hover)" })
