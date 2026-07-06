// LexIA · Chat kit "cc" (Cards & Robustez, handoff completo) — CSS co-locado,
// mesmo padrão de ../asst.css.ts (globalStyle/globalKeyframes; layout/cores das
// superfícies ficam inline, ligadas aos tokens; só o que PRECISA de CSS de
// verdade — máscaras, keyframes, prefers-reduced-motion — mora aqui).
//
// Reaproveita de crm-theme.css/asst.css.ts (NÃO redefinidos aqui): .lx-aura,
// .lex-icon-glow, .lex-orb-grad, .lx-sparkle, .lex-aura-edge (ring estático do
// header). O anel do ThinkingOrb (idle↔loading) é um mecanismo NOVO — nome
// próprio `.cc-ring` para não colidir/duplicar o `.lex-aura-edge::before` já
// existente (aquele fica intacto onde já é usado).
//
// REGRA (memory project_acrylic_surfaces): nunca par webkit+standard
// backdrop-filter aqui — o Lightning CSS do Turbopack corrompe o par e a
// standard some. backdrop-filter só em inline style (como o Orb existente já
// faz) — este arquivo não declara nenhum.
import { globalKeyframes, globalStyle } from "@vanilla-extract/css"

/* ============================================================================
   BOTÃO "PARAR" — quadrado, crit suave (substitui o enviar durante o streaming)
   ============================================================================ */
globalStyle(".crm-scope .cc-stopsq", {
  width: 11,
  height: 11,
  borderRadius: 2.5,
  background: "var(--crit)",
})

/* ============================================================================
   AVISO DO SISTEMA (SysCard) — família única de erro/resiliência (Fase 4)
   ============================================================================ */
globalStyle(".crm-scope .cc-sys", {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
})
globalStyle(".crm-scope .cc-sys-ic", {
  width: 28,
  height: 28,
  borderRadius: 8,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
})
globalStyle(".crm-scope .cc-sys-dismiss", {
  width: 22,
  height: 22,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--text-subtle)",
  borderRadius: 6,
  cursor: "pointer",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
})
globalStyle(".crm-scope .cc-sys-dismiss:hover", { background: "var(--bg-sunken)", color: "var(--text)" })

/* ============================================================================
   TIMELINE DO AGENTE (AgentTimeline) — colapsada "N passos" com hover
   ============================================================================ */
globalStyle(".crm-scope .cc-timeline-toggle", {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  fontFamily: "var(--font-sans)",
  fontSize: 12.5,
  fontWeight: 500,
  padding: "4px 2px",
  cursor: "pointer",
  borderRadius: 6,
})
globalStyle(".crm-scope .cc-timeline-toggle:hover", { color: "var(--text)" })

/* ============================================================================
   AÇÕES DE MENSAGEM (AiActionsBar) — barra monocromática, só aparece no hover
   do grupo (avatar+conteúdo da resposta). Dourado é reservado à proveniência
   de IA — nunca preenche estes botões utilitários.
   ============================================================================ */
globalStyle(".crm-scope .cc-msgactions", {
  display: "flex",
  alignItems: "center",
  gap: 2,
  opacity: 0,
  transition: "opacity .12s ease",
})
globalStyle(".crm-scope .cc-msggroup:hover .cc-msgactions", { opacity: 1 })
globalStyle(".crm-scope .cc-msgactions:focus-within", { opacity: 1 })
globalStyle(".crm-scope .cc-actbtn", {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  padding: 0,
  border: "none",
  borderRadius: 7,
  background: "transparent",
  color: "var(--text-subtle)",
  cursor: "pointer",
  transition: "background .12s, color .12s",
})
globalStyle(".crm-scope .cc-actbtn:hover", { background: "var(--bg-sunken)", color: "var(--text)" })
globalStyle(".crm-scope .cc-actbtn:focus-visible", { outline: "none", boxShadow: "0 0 0 3px var(--ring)", color: "var(--text)" })

/* ============================================================================
   SELO DO MODELO (ModelSeal) — proveniência de IA (sparkles dourado + nome)
   ============================================================================ */
globalStyle(".crm-scope .cc-seal", {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-subtle)",
})

/* ============================================================================
   LINHA COMPACTA (CcRow) — hover real (mesmo tratamento de .lx-sp-row)
   ============================================================================ */
globalStyle(".crm-scope .cc-row", { transition: "background .1s ease, border-color .1s ease" })
globalStyle(".crm-scope .cc-row:hover", { background: "var(--surface-hover)" })
globalStyle(".crm-scope .cc-row.demo-hover", { background: "var(--surface-hover)" })

/* ============================================================================
   FOCO VISÍVEL DOURADO (a11y, Fase 8) — operáveis específicos do chat que não
   usam .btn (que já tem seu próprio anel em crm-theme.css): linhas de entidade
   clicáveis (CcRow) e as opções do ChoiceCard (perguntar_usuario, Fase 6).
   ============================================================================ */
globalStyle(".crm-scope .cc-row:focus-visible, .crm-scope .cc-optrow:focus-visible", {
  outline: "none",
  boxShadow: "0 0 0 3px var(--ring)",
})
// Caixa de busca com ícone + input sem borda própria (HistoryDropdown, Fase 8) —
// mesmo tratamento de foco do .lx-composer (anel dourado no :focus-within).
globalStyle(".crm-scope .cc-searchbox:focus-within", {
  borderColor: "var(--border-gold)",
  boxShadow: "0 0 0 3px var(--ring)",
})

/* ============================================================================
   ANEL DO ORBE — idle e "pensando" são os dois extremos do mesmo movimento
   (integrado via rAF em useOrbRing, motion.tsx). --angle/--arc/--feather são
   escritos por JS a cada frame; aqui só o conic-gradient mascarado.
   ============================================================================ */
globalStyle(".crm-scope .cc-ring", {
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  padding: "1.6px",
  pointerEvents: "none",
  zIndex: 4,
  background:
    "conic-gradient(from calc(var(--angle, 0deg) - var(--arc, 200deg) / 2 - var(--feather, 64deg)), transparent 0deg, #9a7f2e var(--feather, 64deg), #f1dda6 calc(var(--feather, 64deg) + var(--arc, 200deg) * 0.5), #9a7f2e calc(var(--arc, 200deg) + var(--feather, 64deg)), transparent calc(var(--arc, 200deg) + var(--feather, 64deg) * 2))",
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
})

/* ============================================================================
   PALAVRA DE STATUS ("Elaborando…") — marca + palavra com shimmer dourado
   ============================================================================ */
globalStyle(".crm-scope .cc-think", {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  minHeight: 20,
})
globalStyle(".crm-scope .cc-think-mark", {
  position: "relative",
  width: 20,
  height: 20,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--accent)",
})
globalStyle(".crm-scope .cc-word", {
  position: "relative",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  color: "var(--text-muted)",
})
globalStyle(".crm-scope .cc-swap", {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
})
globalStyle(".crm-scope .cc-shimmer", {
  backgroundImage: "linear-gradient(100deg, var(--text-muted) 34%, var(--accent) 50%, var(--text-muted) 66%)",
  backgroundSize: "220% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
})
globalStyle(".crm-scope .cc-word-ell", {
  color: "var(--text-subtle)",
  WebkitTextFillColor: "currentColor",
})

globalKeyframes("ccShimmer", { from: { backgroundPosition: "210% 0" }, to: { backgroundPosition: "-70% 0" } })
globalKeyframes("ccSwapIn", {
  from: { opacity: 0, transform: "translateY(6px)", filter: "blur(3px)" },
  to: { opacity: 1, transform: "none", filter: "blur(0)" },
})
globalStyle(".crm-scope .cc-shimmer", {
  "@media": { "(prefers-reduced-motion: no-preference)": { animation: "ccShimmer var(--cc-shimmer, 2.4s) linear infinite" } },
})

/* ============================================================================
   SKELETON (histórico buscando — Fase 8) — mesmo recipe do .tf-scope .skeleton
   (Projetos/Tarefas), reescrito p/ .crm-scope; reusa a keyframe ccShimmer.
   ============================================================================ */
globalStyle(".crm-scope .cc-skeleton", {
  borderRadius: 6,
  background: "linear-gradient(90deg, var(--bg-sunken) 25%, var(--surface-hover) 37%, var(--bg-sunken) 63%)",
  backgroundSize: "400% 100%",
  "@media": { "(prefers-reduced-motion: no-preference)": { animation: "ccShimmer 1.4s ease-in-out infinite" } },
})
globalStyle(".crm-scope .cc-swap", {
  "@media": { "(prefers-reduced-motion: no-preference)": { animation: "ccSwapIn .46s cubic-bezier(.22,1,.36,1) both" } },
})

/* ============================================================================
   ENTRADA EM GRUPO (troca sincronizada ícone+palavra do variant "cycle")
   ============================================================================ */
globalKeyframes("ccPop", { from: { opacity: 0, transform: "scale(.72)" }, to: { opacity: 1, transform: "scale(1)" } })
globalStyle(".crm-scope .cc-pop", {
  "@media": { "(prefers-reduced-motion: no-preference)": { animation: "ccPop .42s cubic-bezier(.22,1,.36,1) both" } },
})

/* ============================================================================
   ÍCONES ANIMADOS — cada nome tem partes internas com classe própria
   ============================================================================ */
globalStyle(".crm-scope .cc-ic", { display: "block", overflow: "visible" })
globalStyle(".crm-scope .cc-ic .ln, .crm-scope .cc-ic .ink", { willChange: "stroke-dashoffset, opacity" })

globalKeyframes("ccPenBob", {
  "0%,100%": { transform: "translate(0,0) rotate(0deg)" },
  "35%": { transform: "translate(-.7px,.7px) rotate(-3deg)" },
  "70%": { transform: "translate(.5px,-.2px) rotate(1.5deg)" },
})
globalKeyframes("ccInk", {
  "0%": { strokeDashoffset: 9, opacity: 0 },
  "18%": { opacity: 1 },
  "55%": { strokeDashoffset: 0 },
  "84%": { strokeDashoffset: 0, opacity: 1 },
  "100%": { strokeDashoffset: 0, opacity: 0 },
})
globalKeyframes("ccTilt", { "0%,100%": { transform: "rotate(-6deg)" }, "50%": { transform: "rotate(6deg)" } })
globalKeyframes("ccTwinkle", {
  "0%,100%": { transform: "scale(.9) rotate(0deg)", opacity: 0.82 },
  "50%": { transform: "scale(1.08) rotate(8deg)", opacity: 1 },
})
globalKeyframes("ccTwinkleB", { "0%,100%": { opacity: 0.15, transform: "scale(.6)" }, "55%": { opacity: 0.95, transform: "scale(1)" } })
globalKeyframes("ccTap", {
  "0%,60%,100%": { transform: "rotate(0deg)" },
  "10%": { transform: "rotate(-18deg)" },
  "24%": { transform: "rotate(2deg)" },
  "34%": { transform: "rotate(0deg)" },
})
globalKeyframes("ccDraw", {
  "0%": { strokeDashoffset: "var(--l, 10)", opacity: 0 },
  "16%": { opacity: 1 },
  "50%": { strokeDashoffset: 0 },
  "84%": { strokeDashoffset: 0, opacity: 1 },
  "100%": { strokeDashoffset: 0, opacity: 0 },
})
globalKeyframes("ccOrbit", {
  "0%,100%": { transform: "translate(0,0)" },
  "25%": { transform: "translate(1.2px,-1px)" },
  "50%": { transform: "translate(0,-1.7px)" },
  "75%": { transform: "translate(-1.2px,-1px)" },
})
globalKeyframes("ccBreathe", { "0%,100%": { transform: "scale(.94)" }, "50%": { transform: "scale(1.05)" } })
globalKeyframes("ccBar", { "0%,100%": { transform: "scaleY(.4)" }, "50%": { transform: "scaleY(1)" } })
globalKeyframes("ccBraceL", { "0%,100%": { transform: "translateX(0)" }, "50%": { transform: "translateX(-1.3px)" } })
globalKeyframes("ccBraceR", { "0%,100%": { transform: "translateX(0)" }, "50%": { transform: "translateX(1.3px)" } })
globalKeyframes("ccRevolve", { to: { transform: "rotate(360deg)" } })

const reduceNoPref = (selector: string, style: Parameters<typeof globalStyle>[1]) =>
  globalStyle(selector, { "@media": { "(prefers-reduced-motion: no-preference)": style } })

reduceNoPref(".crm-scope .cc-ic-pen .pen", { transformBox: "fill-box", transformOrigin: "82% 18%", animation: "ccPenBob 1.7s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-pen .ink", { strokeDasharray: 9, animation: "ccInk 1.7s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-scale .beam", { transformBox: "fill-box", transformOrigin: "50% 8%", animation: "ccTilt 2.7s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-spark .s1", { transformBox: "fill-box", transformOrigin: "center", animation: "ccTwinkle 2.3s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-spark .s2", { transformBox: "fill-box", transformOrigin: "center", animation: "ccTwinkleB 2.3s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-gavel .mallet", { transformBox: "fill-box", transformOrigin: "70% 30%", animation: "ccTap 2s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-scroll .l1", { strokeDasharray: 10, animation: "ccDraw 2.5s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-scroll .l2", { strokeDasharray: 10, animation: "ccDraw 2.5s ease-in-out .28s infinite" })
reduceNoPref(".crm-scope .cc-ic-scroll .l3", { strokeDasharray: 4, animation: "ccDraw 2.5s ease-in-out .12s infinite" })
reduceNoPref(".crm-scope .cc-ic-search .glass", { animation: "ccOrbit 2.5s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-sigma .sig", { transformBox: "fill-box", transformOrigin: "center", animation: "ccBreathe 2.3s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-bars .b1", { transformBox: "fill-box", transformOrigin: "50% 100%", animation: "ccBar 1.6s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-bars .b2", { transformBox: "fill-box", transformOrigin: "50% 100%", animation: "ccBar 1.6s ease-in-out .16s infinite" })
reduceNoPref(".crm-scope .cc-ic-bars .b3", { transformBox: "fill-box", transformOrigin: "50% 100%", animation: "ccBar 1.6s ease-in-out .32s infinite" })
reduceNoPref(".crm-scope .cc-ic-braces .lft", { animation: "ccBraceL 2.3s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-braces .rgt", { animation: "ccBraceR 2.3s ease-in-out infinite" })
reduceNoPref(".crm-scope .cc-ic-orbit .rev", { transformBox: "view-box", transformOrigin: "12px 12px", animation: "ccRevolve 1.9s linear infinite" })

/* ============================================================================
   REVELAÇÃO DA RESPOSTA + CARET DE STREAMING
   ============================================================================ */
globalStyle(".crm-scope .cc-rv-word", { display: "inline-block", whiteSpace: "pre-wrap" })
globalStyle(".crm-scope .cc-rv-line", { display: "block" })
globalStyle(".crm-scope .cc-caret", {
  display: "inline-block",
  width: 2,
  height: "1.02em",
  marginLeft: 1.5,
  verticalAlign: "-0.14em",
  borderRadius: 1,
  background: "var(--accent)",
})

globalKeyframes("ccWordIn", {
  from: { opacity: 0, transform: "translateY(.16em)", filter: "blur(3px)" },
  to: { opacity: 1, transform: "none", filter: "blur(0)" },
})
globalKeyframes("ccLineIn", { from: { opacity: 0, transform: "translateY(9px)" }, to: { opacity: 1, transform: "none" } })
globalKeyframes("ccCaret", { "0%,45%": { opacity: 1 }, "55%,100%": { opacity: 0 } })

reduceNoPref(".crm-scope .cc-rv-word", { animation: "ccWordIn .44s cubic-bezier(.22,1,.36,1) both" })
reduceNoPref(".crm-scope .cc-rv-line", { animation: "ccLineIn .5s cubic-bezier(.22,1,.36,1) both" })
reduceNoPref(".crm-scope .cc-caret", { animation: "ccCaret 1s steps(1,end) infinite" })

/* ============================================================================
   PULSO CRÍTICO — ponto "ao vivo" do CcUrgencyBanner quando tone=crit (Fase 3)
   ============================================================================ */
globalKeyframes("ccPulse", {
  "0%,100%": { opacity: 1, transform: "scale(1)" },
  "50%": { opacity: 0.35, transform: "scale(0.72)" },
})
reduceNoPref(".crm-scope .cc-pulse", { animation: "ccPulse 1.4s ease-in-out infinite" })
