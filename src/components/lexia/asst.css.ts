// LexIA · Assistente (redesign) — CSS co-locado (vanilla-extract globalStyle),
// no mesmo padrão de lexia.css.ts. Só os átomos que PRECISAM de CSS (máscaras,
// pseudo-elementos, animações, hover, prefers-reduced-motion); o layout/cores das
// superfícies é inline, ligado aos tokens (idioma do projeto). Reaproveita do
// crm-theme.css: .lex-orb-grad, .lex-aura-edge, .lex-icon-glow, acrílico, .fx-menu-item.
import { globalKeyframes, globalStyle } from "@vanilla-extract/css"

/* ── Sparkle dourado girando (chip de sugestão / avatar pequeno) ──
   silhueta "sparkles" (Lucide) como máscara, preenchida pelo conic dourado
   (.lex-orb-grad já gira via lexSpin). */
// SÓ a URL — mask-image não aceita position/size/repeat (isso é o shorthand
// `mask`); usar as longhands abaixo, senão a máscara não aplica e o conic
// dourado vaza como um quadrado cheio.
const SPARKLE_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z'/%3E%3C/svg%3E\")"
globalStyle(".crm-scope .lx-sparkle", {
  position: "relative",
  display: "inline-block",
  overflow: "hidden",
  WebkitMaskImage: SPARKLE_URL,
  maskImage: SPARKLE_URL,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
})

/* chip quadrado com borda dourada (sugestões do spotlight / boas-vindas) */
globalStyle(".crm-scope .lx-chip", {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: 9,
  overflow: "hidden",
  background: "color-mix(in srgb, var(--bg-elevated) 64%, transparent)",
})
globalStyle(".crm-scope .lx-chip::before", {
  content: "''",
  position: "absolute",
  inset: 0,
  borderRadius: 9,
  padding: "1.5px",
  pointerEvents: "none",
  background:
    "conic-gradient(from var(--lex-aura-angle, 0deg), #f1dda6, #C0A147, #9a7f2e, #e6cd86, #C0A147, #f1dda6)",
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
  animation: "lexAuraSpin 8s linear infinite",
})

/* ── Orbe: 3 auroras douradas que fazem crossfade de opacidade (§3) ── */
globalKeyframes("lxAuroraA", { "0%,100%": { opacity: 0.9, transform: "scale(1)" }, "50%": { opacity: 0.2, transform: "scale(1.12)" } })
globalKeyframes("lxAuroraB", { "0%,100%": { opacity: 0.2, transform: "scale(1.12)" }, "50%": { opacity: 0.9, transform: "scale(1)" } })
globalKeyframes("lxAuroraC", { "0%,100%": { opacity: 0.3, transform: "scale(0.85)" }, "50%": { opacity: 0.65, transform: "scale(1.1)" } })

/* ── Spotlight: linha de resultado (hover + ativa) ── */
globalStyle(".crm-scope .lx-sp-row", {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: "9px 12px",
  borderRadius: 11,
  cursor: "pointer",
  transition: "background .1s ease",
})
globalStyle(".crm-scope .lx-sp-row:hover", {
  background: "var(--surface-hover)",
})
globalStyle(".crm-scope .lx-sp-row.is-active", {
  background: "var(--surface-hover)",
})

/* ── "Pensando…" / "Buscando…" com shimmer dourado ── */
globalKeyframes("lxShimmer", {
  "0%": { backgroundPosition: "180% 0" },
  "100%": { backgroundPosition: "-80% 0" },
})
globalStyle(".crm-scope .lx-thinking-label", {
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  background:
    "linear-gradient(100deg, var(--text-subtle) 20%, var(--accent) 42%, #f1dda6 50%, var(--accent) 58%, var(--text-subtle) 80%)",
  backgroundSize: "220% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  animation: "lxShimmer 2.1s linear infinite",
})

/* ── Composer (foco dourado) + linhas de sugestão (boas-vindas) ── */
globalStyle(".crm-scope .lx-composer", {
  background: "color-mix(in srgb, var(--surface) 62%, transparent)",
  border: "1px solid var(--border-strong)",
  borderRadius: 14,
  padding: "10px 12px 8px",
  transition: "border-color .14s, box-shadow .14s",
})
globalStyle(".crm-scope .lx-composer:focus-within", {
  borderColor: "var(--border-gold)",
  boxShadow: "0 0 0 3px var(--ring)",
})
globalStyle(".crm-scope .lx-sugg:hover", {
  background: "var(--surface-hover)",
})

/* ── Segmented (modos do agente) ── */
globalStyle(".crm-scope .lx-seg", {
  display: "flex",
  gap: 3,
  background: "var(--bg-sunken)",
  borderRadius: 9,
  padding: 3,
})
globalStyle(".crm-scope .lx-seg-btn", {
  flex: 1,
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  fontFamily: "var(--font-sans)",
  fontSize: 12.5,
  fontWeight: 500,
  padding: "7px 4px",
  borderRadius: 6,
  cursor: "pointer",
  transition: "background .12s, color .12s",
})
globalStyle(".crm-scope .lx-seg-btn.on", {
  background: "var(--surface)",
  color: "var(--text)",
  boxShadow: "var(--shadow-sm)",
})

/* ── Toggle (acesso à web / modo automático) ── */
globalStyle(".crm-scope .lx-toggle", {
  position: "relative",
  width: 34,
  height: 20,
  borderRadius: 999,
  background: "var(--bg-sunken)",
  border: "1px solid var(--border)",
  flexShrink: 0,
  transition: "background .15s, border-color .15s",
})
globalStyle(".crm-scope .lx-toggle.on", {
  background: "var(--brand-gold)",
  borderColor: "transparent",
})
globalStyle(".crm-scope .lx-toggle i", {
  position: "absolute",
  top: 2,
  left: 2,
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
  transition: "transform .15s",
})
globalStyle(".crm-scope .lx-toggle.on i", {
  transform: "translateX(14px)",
})

/* ── Modal de personalização: abas + cartões de persona ── */
globalStyle(".crm-scope .lx-modal-tab", {
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  fontFamily: "var(--font-sans)",
  fontSize: 13.5,
  fontWeight: 500,
  padding: "7px 12px",
  borderRadius: "8px 8px 0 0",
  cursor: "pointer",
  borderBottom: "2px solid transparent",
  marginBottom: -1,
  transition: "color .12s",
})
globalStyle(".crm-scope .lx-modal-tab.on", {
  color: "var(--text)",
  borderBottomColor: "var(--accent)",
})
globalStyle(".crm-scope .lx-persona", {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 4,
  textAlign: "left",
  padding: 14,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  cursor: "pointer",
  transition: "border-color .12s, background .12s",
})
globalStyle(".crm-scope .lx-persona:hover", {
  borderColor: "var(--border-strong)",
})
globalStyle(".crm-scope .lx-persona.on", {
  borderColor: "var(--border-gold)",
  background: "var(--accent-soft)",
})

/* ── reduce motion: desliga o shimmer e o giro do chip/sparkle ── */
globalStyle(".crm-scope .lx-thinking-label", {
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none", color: "var(--text-muted)" },
  },
})
globalStyle(".crm-scope .lx-chip::before", {
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
})
