// LexIA · Chat — CSS do conteúdo rico (Fase 2, R3 do handoff): bloco de
// código (barra + copiar + colapso com fade + scroll-x), blockquote, listas
// aninhadas/tarefas, regra horizontal, tabela longa (scroll contido + thead
// fixo). Mesmo padrão das demais folhas: só o que precisa de CSS de verdade
// (hover, gradiente de fade, sticky) mora aqui; layout/cores ficam inline.
import { globalStyle } from "@vanilla-extract/css"

/* ============================================================================
   BLOCO DE CÓDIGO
   ============================================================================ */
globalStyle(".crm-scope .cc-code", {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg-sunken)",
  overflow: "hidden",
  margin: "6px 0",
})
globalStyle(".crm-scope .cc-code-bar", {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 10px",
  borderBottom: "1px solid var(--border)",
  fontSize: 11.5,
  color: "var(--text-subtle)",
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
})
globalStyle(".crm-scope .cc-code-copy", {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  border: "none",
  background: "transparent",
  color: "var(--text-subtle)",
  fontFamily: "var(--font-sans)",
  fontSize: 11.5,
  fontWeight: 500,
  padding: "3px 7px",
  borderRadius: 6,
  cursor: "pointer",
  transition: "background .12s, color .12s",
})
globalStyle(".crm-scope .cc-code-copy:hover", { background: "var(--bg-elevated)", color: "var(--text)" })
globalStyle(".crm-scope .cc-code-body", { position: "relative" })
globalStyle(".crm-scope .cc-pre", {
  margin: 0,
  padding: "10px 12px",
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: 12,
  lineHeight: 1.55,
  color: "var(--text)",
  overflowX: "auto",
  whiteSpace: "pre",
})
globalStyle(".crm-scope .cc-code-fade", {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: 56,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  paddingBottom: 8,
  background: "linear-gradient(rgba(0,0,0,0), var(--bg-sunken) 78%)",
  pointerEvents: "none",
})
globalStyle(".crm-scope .cc-code-fade button", { pointerEvents: "auto" })

/* ============================================================================
   MARKDOWN — blockquote, listas aninhadas/tarefas, regra
   ============================================================================ */
globalStyle(".crm-scope .cc-blockquote", {
  margin: "6px 0",
  padding: "2px 0 2px 12px",
  borderLeft: "3px solid var(--border-strong)",
  color: "var(--text-muted)",
  fontStyle: "italic",
})
globalStyle(".crm-scope .cc-hr", {
  border: "none",
  borderTop: "1px solid var(--border)",
  margin: "10px 0",
})
globalStyle(".crm-scope .cc-task", {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  listStyle: "none",
})
globalStyle(".crm-scope .cc-check", {
  width: 15,
  height: 15,
  marginTop: 2,
  borderRadius: 4,
  border: "1.5px solid var(--border-strong)",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: 0,
  cursor: "pointer",
  color: "#020D25",
  transition: "background .12s, border-color .12s",
})
globalStyle(".crm-scope .cc-task[data-done='1'] .cc-check", { background: "var(--accent)", borderColor: "var(--accent)" })
globalStyle(".crm-scope .cc-task[data-done='1'] span", { textDecoration: "line-through", color: "var(--text-subtle)" })

/* ============================================================================
   TABELA LONGA — scroll contido (x/y) + cabeçalho fixo
   ============================================================================ */
globalStyle(".crm-scope .cc-tablewrap", {
  overflow: "auto",
  maxHeight: 320,
  margin: "8px 0",
  borderRadius: 10,
  border: "1px solid var(--border)",
})
globalStyle(".crm-scope .cc-table", {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
})
globalStyle(".crm-scope .cc-table th", {
  position: "sticky",
  top: 0,
  textAlign: "left",
  padding: "8px 10px",
  background: "var(--bg-elevated)",
  borderBottom: "1px solid var(--border)",
  fontWeight: 500,
  color: "var(--text-muted)",
  whiteSpace: "nowrap",
})
globalStyle(".crm-scope .cc-table td", {
  padding: "7px 10px",
  borderBottom: "1px solid var(--bg-sunken)",
  color: "var(--text)",
})
