import { globalStyle, keyframes, style } from "@vanilla-extract/css"

export const editorWrap = style({ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 })

export const toolbar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 4,
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg)",
  flexShrink: 0,
})

export const tbtn = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  height: 30,
  minWidth: 30,
  padding: "0 8px",
  borderRadius: 6,
  border: "1px solid transparent",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  transition: "background 120ms ease, color 120ms ease",
  selectors: { "&:hover": { background: "var(--surface-hover)" } },
})

export const tbtnActive = style({ background: "var(--accent-soft)", color: "var(--accent)" })

export const sep = style({ width: 1, height: 18, background: "var(--border)", margin: "0 4px" })

export const editorScroll = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  // block + margin:auto on the paper centers it when it fits and scrolls (without
  // clipping the left edge) when the A4 page is wider than the column.
  padding: 24,
  background: "var(--bg-soft)",
})

export const paper = style({
  position: "relative",
  boxSizing: "border-box",
  // fixed A4 — independent of the column width, so the margins never "breathe"
  // when the side panel / chat toggles.
  width: "210mm",
  maxWidth: "none",
  margin: "0 auto",
  backgroundColor: "#fff",
  // one letterhead + page-guide tile per A4 page
  backgroundRepeat: "repeat-y",
  backgroundPosition: "top center",
  backgroundSize: "210mm 297mm",
  borderRadius: 2,
  boxShadow: "0 1px 3px rgba(2,13,37,0.06), 0 12px 36px rgba(2,13,37,0.10)",
  minHeight: "297mm",
  // padding (safe-area margins) is applied inline per the selected letterhead
})

// ProseMirror content — match the renderers' typography so editing ≈ output.
globalStyle(`${paper} .ProseMirror`, {
  outline: "none",
  fontFamily: "Arial, sans-serif",
  fontSize: "12pt",
  lineHeight: 1.5,
  color: "#020D25",
})
globalStyle(`${paper} .ProseMirror:focus`, { outline: "none" })
globalStyle(`${paper} .ProseMirror p`, { marginBottom: "10pt" })
globalStyle(`${paper} .ProseMirror h1`, { fontSize: "14pt", fontWeight: 700, margin: "16pt 0 10pt" })
globalStyle(`${paper} .ProseMirror h2`, { fontSize: "13pt", fontWeight: 700, margin: "14pt 0 8pt" })
globalStyle(`${paper} .ProseMirror h3`, { fontSize: "12pt", fontWeight: 700, margin: "12pt 0 6pt" })
globalStyle(`${paper} .ProseMirror ul, ${paper} .ProseMirror ol`, { margin: "0 0 10pt 1.2cm" })
globalStyle(`${paper} .ProseMirror li`, { marginBottom: "4pt" })
globalStyle(`${paper} .ProseMirror blockquote`, {
  margin: "0 0 10pt 0.8cm",
  paddingLeft: "0.4cm",
  borderLeft: "2px solid rgba(2,13,37,0.2)",
})
globalStyle(`${paper} .ProseMirror img`, { maxWidth: "100%" })

// Armed "posicionar campo" mode — crosshair + gold ring on the paper.
export const paperArmed = style({
  boxShadow: "0 0 0 2px var(--accent-strong), 0 1px 3px rgba(2,13,37,0.06), 0 12px 36px rgba(2,13,37,0.14)",
})
globalStyle(`${paperArmed} .ProseMirror, ${paperArmed} .ProseMirror *`, { cursor: "crosshair" })

// Merge-field chip: empty → gold pill `{{label}}` (clickable to fill); filled →
// the value rendered inline with a soft gold underline (matches the PDF/preview).
globalStyle(`${paper} .lex-chip`, {
  background: "rgba(138,109,31,0.12)",
  color: "#8a6d1f",
  borderRadius: 4,
  padding: "0 4px",
  fontWeight: 500,
  whiteSpace: "pre-wrap",
  cursor: "pointer",
  transition: "background 120ms ease",
})
globalStyle(`${paper} .lex-chip:hover`, { background: "rgba(138,109,31,0.22)" })
globalStyle(`${paper} .lex-chip.filled`, {
  background: "transparent",
  color: "inherit",
  fontWeight: 600,
  padding: "0 1px",
  borderRadius: 0,
  borderBottom: "1.5px solid rgba(138,109,31,0.45)",
})
globalStyle(`${paper} .lex-chip.filled:hover`, { background: "rgba(138,109,31,0.10)" })
globalStyle(`${paper} .ProseMirror .lex-chip.ProseMirror-selectednode`, {
  outline: "2px solid rgba(138,109,31,0.5)",
})

// Transient gold flash where the LexIA just applied an edit.
const aiInsFade = keyframes({
  "0%": { background: "rgba(192,161,71,0.42)", boxShadow: "0 0 0 3px rgba(192,161,71,0.14)" },
  "65%": { background: "rgba(192,161,71,0.24)", boxShadow: "0 0 0 2px rgba(192,161,71,0.07)" },
  "100%": { background: "rgba(192,161,71,0)", boxShadow: "0 0 0 0 rgba(192,161,71,0)" },
})
globalStyle(`${paper} .doc-ai-ins`, {
  borderRadius: 3,
  padding: "0 1px",
  animation: `${aiInsFade} 1.6s cubic-bezier(.22,1,.36,1) forwards`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
})
globalStyle(`${paper} .lex-pb`, {
  textAlign: "center",
  color: "var(--text-subtle)",
  fontSize: 11,
  border: "1px dashed var(--border)",
  borderRadius: 6,
  padding: "4px 0",
  margin: "12px 0",
  userSelect: "none",
})
