// Folha de estilo do relatório financeiro — a MESMA para a tela e para a
// impressão. O documento todo lê um punhado de variáveis locais `--rel-*`
// (papel, tinta, linhas, cores semânticas) que na tela apontam para os tokens
// do app (segue o tema claro/escuro) e dentro de `@media print` são
// REDEFINIDAS para uma paleta de papel: imprimir no tema escuro jamais sai com
// fundo navy. `print-color-adjust: exact` preserva o color code no PDF — e é
// declarado SÓ na forma padrão (o Lightning CSS adiciona o prefixo; escrever o
// par webkit+padrão à mão é a armadilha documentada na CLAUDE.md §glass).
//
// ESCALA — na tela, tudo vem do design system do módulo (interativo.css.ts +
// financeiro.css.ts), sem inventar valor novo:
//   · raio 14 em toda superfície com borda (card/kpi/tabela), 8 em tile de
//     ícone, 6 em pílula e trilho de barra, 999 só na barra empilhada
//   · sombra `shadowSm` nas superfícies (removida no papel)
//   · tipos 11 (micro/uppercase 0.08em) · 12 (corpo/label) · 13 · 14 (título de
//     card) · 25 (valor de KPI e h1), pesos 400/500 apenas
//   · NÚMEROS em sans com figuras tabulares — a fonte mono é reservada a código,
//     nunca a valores (regra declarada em interativo.css.ts §numbers)
// No papel os tamanhos caem para a escala tipográfica de impressão.
import { globalStyle, style, styleVariants } from "@vanilla-extract/css"
import { recipe } from "@vanilla-extract/recipes"
import { tokens } from "@/styles/tokens.css"

/** Figuras tabulares em sans — espelha `interativo.css.ts` `num`/`money`. */
const NUM = {
  fontFeatureSettings: '"tnum"',
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
} as const

/** Superfície com borda: raio 14 + sombra sutil na tela, chapada no papel. */
const SUPERFICIE = {
  background: "var(--rel-paper)",
  border: "1px solid var(--rel-line)",
  borderRadius: 14,
  boxShadow: tokens.color.shadowSm,
} as const

const SUPERFICIE_PRINT = { borderRadius: 4, boxShadow: "none" } as const

export const doc = style({
  vars: {
    "--rel-paper": tokens.color.surface,
    "--rel-paper-soft": tokens.color.bgSoft,
    "--rel-paper-sunken": tokens.color.bgSunken,
    "--rel-ink": tokens.color.text,
    "--rel-ink-muted": tokens.color.textMuted,
    "--rel-ink-subtle": tokens.color.textSubtle,
    "--rel-line": tokens.color.border,
    "--rel-line-strong": tokens.color.borderStrong,
    "--rel-gold": tokens.color.accentStrong,
    "--rel-gold-soft": tokens.color.accentSoft,
    "--rel-pos": "var(--fin-pos,#1F8A4C)",
    "--rel-neg": "var(--fin-neg,#C0492F)",
    "--rel-amber": "var(--fin-amber,#B47E12)",
  },
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 0 56px",
  color: "var(--rel-ink)",
  printColorAdjust: "exact",
  "@media": {
    print: {
      vars: {
        "--rel-paper": "#FFFFFF",
        "--rel-paper-soft": "#FAFAF7",
        "--rel-paper-sunken": "#F1EFE8",
        "--rel-ink": "#101828",
        "--rel-ink-muted": "#4A5567",
        "--rel-ink-subtle": "#6B7686",
        "--rel-line": "#DCDAD2",
        "--rel-line-strong": "#B9B6AC",
        "--rel-gold": "#9C7D22",
        "--rel-gold-soft": "#F4EEDC",
        "--rel-pos": "#1F7A45",
        "--rel-neg": "#B2402A",
        "--rel-amber": "#9A6A0F",
      },
      maxWidth: "none",
      margin: 0,
      padding: 0,
      fontSize: 9,
    },
  },
})

// ── capa / cabeçalho ─────────────────────────────────────────────────────────

export const capa = style({
  borderBottom: "2px solid var(--rel-gold)",
  paddingBottom: 18,
  marginBottom: 26,
  "@media": { print: { paddingBottom: 10, marginBottom: 14 } },
})

export const capaTop = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 24,
  flexWrap: "wrap",
})

export const marca = style({ display: "flex", flexDirection: "column", gap: 2 })

export const marcaNome = style({
  fontSize: 13,
  fontWeight: 500,
  color: "var(--rel-ink)",
  "@media": { print: { fontSize: 10 } },
})

export const marcaMeta = style({
  fontSize: 11,
  color: "var(--rel-ink-subtle)",
  "@media": { print: { fontSize: 8 } },
})

/** Micro-rótulo: a mesma receita do `sectionTitle` de financeiro.css.ts. */
const MICRO = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const

export const docKicker = style({
  ...MICRO,
  color: "var(--rel-gold)",
  marginBottom: 6,
  "@media": { print: { fontSize: 7.5 } },
})

export const docTitulo = style({
  margin: 0,
  fontSize: 25,
  fontWeight: 500,
  letterSpacing: "-0.025em",
  lineHeight: 1.15,
  color: "var(--rel-ink)",
  "@media": { print: { fontSize: 19 } },
})

export const docPeriodo = style({
  margin: "6px 0 0",
  fontSize: 13,
  color: "var(--rel-ink-muted)",
  "@media": { print: { fontSize: 9 } },
})

export const docMeta = style({
  marginTop: 14,
  display: "flex",
  gap: 22,
  flexWrap: "wrap",
  fontSize: 11,
  color: "var(--rel-ink-subtle)",
  "@media": { print: { marginTop: 8, fontSize: 8, gap: 14 } },
})

// Legenda do color code — explica as cores antes do primeiro número.
export const legenda = style({
  ...SUPERFICIE,
  background: "var(--rel-paper-soft)",
  boxShadow: "none",
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  padding: "10px 14px",
  marginBottom: 24,
  "@media": { print: { ...SUPERFICIE_PRINT, marginBottom: 12, padding: "6px 10px" } },
})

export const legendaItem = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12,
  color: "var(--rel-ink-muted)",
  "@media": { print: { fontSize: 7.5, gap: 5 } },
})

export const legendaDot = style({
  width: 9,
  height: 9,
  borderRadius: 3,
  flexShrink: 0,
  printColorAdjust: "exact",
  "@media": { print: { width: 7, height: 7 } },
})

// ── seções ───────────────────────────────────────────────────────────────────

export const secao = style({
  marginBottom: 28,
  breakInside: "avoid",
  "@media": { print: { marginBottom: 14 } },
})

/** Força a seção a começar numa página nova (usada nas tabelas longas). */
export const secaoNovaPagina = style({
  "@media": { print: { breakBefore: "page" } },
})

export const secaoHead = style({
  display: "flex",
  alignItems: "center",
  gap: 11,
  marginBottom: 14,
  paddingBottom: 9,
  borderBottom: `1px solid var(--rel-line)`,
  "@media": { print: { marginBottom: 8, paddingBottom: 5, gap: 8 } },
})

export const secaoNum = recipe({
  base: {
    width: 28,
    height: 28,
    borderRadius: 8, // tile de ícone — mesmo raio do iconBox do KpiCard
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    printColorAdjust: "exact",
    "@media": { print: { width: 18, height: 18, borderRadius: 5 } },
  },
  variants: {
    tom: {
      gold: { background: "var(--rel-gold-soft)", color: "var(--rel-gold)" },
      pos: { background: "color-mix(in srgb, var(--rel-pos) 13%, transparent)", color: "var(--rel-pos)" },
      neg: { background: "color-mix(in srgb, var(--rel-neg) 13%, transparent)", color: "var(--rel-neg)" },
      amber: { background: "color-mix(in srgb, var(--rel-amber) 15%, transparent)", color: "var(--rel-amber)" },
      neutro: { background: "var(--rel-paper-sunken)", color: "var(--rel-ink-muted)" },
    },
  },
  defaultVariants: { tom: "gold" },
})

export const secaoTitulo = style({
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: "var(--rel-ink)",
  "@media": { print: { fontSize: 11 } },
})

export const secaoOrdem = style([
  NUM,
  { color: "var(--rel-ink-subtle)", marginRight: 7, fontWeight: 400 },
])

export const secaoSub = style({
  fontSize: 12,
  color: "var(--rel-ink-subtle)",
  marginTop: 2,
  "@media": { print: { fontSize: 8 } },
})

export const card = style({
  ...SUPERFICIE,
  padding: "18px 22px",
  breakInside: "avoid",
  "@media": { print: { ...SUPERFICIE_PRINT, padding: "9px 11px" } },
})

export const cardTitulo = style({
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: "var(--rel-ink)",
  marginBottom: 12,
  "@media": { print: { fontSize: 10, marginBottom: 7 } },
})

export const duasColunas = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  "@media": {
    "screen and (max-width: 980px)": { gridTemplateColumns: "1fr" },
    print: { gap: 9 },
  },
})

// ── KPIs ─────────────────────────────────────────────────────────────────────

export const kpiGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  marginBottom: 16,
  "@media": {
    "screen and (max-width: 900px)": { gridTemplateColumns: "repeat(2, 1fr)" },
    print: { gap: 7, marginBottom: 8 },
  },
})

export const kpi = recipe({
  base: {
    ...SUPERFICIE,
    // A faixa colorida à esquerda é o color code do cartão (o resto do app usa
    // o tile de ícone; aqui o relatório é impresso, e uma barra sobrevive
    // melhor ao papel do que um ícone colorido).
    borderLeftWidth: 3,
    padding: "15px 17px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    breakInside: "avoid",
    printColorAdjust: "exact",
    "@media": { print: { ...SUPERFICIE_PRINT, padding: "8px 10px", gap: 2 } },
  },
  variants: {
    tom: {
      pos: { borderLeftColor: "var(--rel-pos)" },
      neg: { borderLeftColor: "var(--rel-neg)" },
      gold: { borderLeftColor: "var(--rel-gold)" },
      amber: { borderLeftColor: "var(--rel-amber)" },
      neutro: { borderLeftColor: "var(--rel-line-strong)" },
    },
  },
  defaultVariants: { tom: "neutro" },
})

export const kpiLabel = style({
  fontSize: 12,
  fontWeight: 500,
  color: "var(--rel-ink-muted)",
  "@media": { print: { fontSize: 7.5 } },
})

export const kpiValor = style([
  NUM,
  {
    display: "block",
    fontSize: 25,
    fontWeight: 500,
    letterSpacing: "-0.025em",
    color: "var(--rel-ink)",
    "@media": { print: { fontSize: 14 } },
  },
])

export const kpiValorTom = styleVariants({
  pos: { color: "var(--rel-pos)" },
  neg: { color: "var(--rel-neg)" },
  ink: { color: "var(--rel-ink)" },
})

export const kpiSub = style({
  fontSize: 12,
  color: "var(--rel-ink-subtle)",
  "@media": { print: { fontSize: 7.5 } },
})

export const delta = recipe({
  base: {
    ...NUM,
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 12,
    fontWeight: 500,
    "@media": { print: { fontSize: 7.5 } },
  },
  variants: {
    dir: {
      up: { color: "var(--rel-pos)" },
      down: { color: "var(--rel-neg)" },
      flat: { color: "var(--rel-ink-subtle)" },
    },
  },
  defaultVariants: { dir: "flat" },
})

/** Linha de métricas secundárias (ticket médio, média diária…). */
export const statRow = style({
  ...SUPERFICIE,
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 1,
  background: "var(--rel-line)",
  overflow: "hidden",
  "@media": {
    "screen and (max-width: 900px)": { gridTemplateColumns: "repeat(2, 1fr)" },
    print: SUPERFICIE_PRINT,
  },
})

export const stat = style({
  background: "var(--rel-paper)",
  padding: "11px 14px",
  "@media": { print: { padding: "6px 8px" } },
})

export const statLabel = style({
  fontSize: 11,
  color: "var(--rel-ink-subtle)",
  "@media": { print: { fontSize: 7 } },
})

export const statValor = style([
  NUM,
  {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--rel-ink)",
    marginTop: 2,
    "@media": { print: { fontSize: 9.5 } },
  },
])

// ── tabelas ──────────────────────────────────────────────────────────────────

export const tabelaWrap = style({
  ...SUPERFICIE,
  overflow: "hidden",
  "@media": { print: SUPERFICIE_PRINT },
})

export const tabela = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  "@media": { print: { fontSize: 8 } },
})

export const th = style({
  ...MICRO,
  textAlign: "left",
  padding: "9px 14px",
  color: "var(--rel-ink-subtle)",
  background: "var(--rel-paper-soft)",
  borderBottom: `1px solid var(--rel-line)`,
  whiteSpace: "nowrap",
  printColorAdjust: "exact",
  "@media": { print: { padding: "4px 7px", fontSize: 7 } },
})

export const thNum = style([th, { textAlign: "right" }])

export const td = style({
  padding: "8px 14px",
  borderTop: `1px solid var(--rel-line)`,
  color: "var(--rel-ink)",
  verticalAlign: "middle",
  "@media": { print: { padding: "3.5px 7px" } },
})

export const tdNum = style([td, NUM, { textAlign: "right", userSelect: "text" }])

export const tdMeta = style({
  fontSize: 11,
  color: "var(--rel-ink-subtle)",
  marginTop: 1,
  "@media": { print: { fontSize: 7 } },
})

export const trTotal = style({
  background: "var(--rel-paper-soft)",
  fontWeight: 500,
  printColorAdjust: "exact",
})

export const trZebra = style({
  selectors: { "&:nth-child(even)": { background: "var(--rel-paper-soft)" } },
  printColorAdjust: "exact",
})

// Mantém o cabeçalho da tabela repetido em cada página impressa.
globalStyle(`.${tabela} thead`, { "@media": { print: { display: "table-header-group" } } })
globalStyle(`.${tabela} tr`, { "@media": { print: { breakInside: "avoid" } } })

export const tomTexto = styleVariants({
  pos: { color: "var(--rel-pos)" },
  neg: { color: "var(--rel-neg)" },
  amber: { color: "var(--rel-amber)" },
  gold: { color: "var(--rel-gold)" },
  ink: { color: "var(--rel-ink)" },
  muted: { color: "var(--rel-ink-muted)" },
  subtle: { color: "var(--rel-ink-subtle)" },
})

export const pill = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 9px",
    borderRadius: 6, // pílula do módulo (interativo.css.ts `pill`)
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
    printColorAdjust: "exact",
    "@media": { print: { padding: "1px 5px", fontSize: 7 } },
  },
  variants: {
    tom: {
      pago: { background: "color-mix(in srgb, var(--rel-pos) 13%, transparent)", color: "var(--rel-pos)" },
      vencido: { background: "color-mix(in srgb, var(--rel-neg) 13%, transparent)", color: "var(--rel-neg)" },
      avencer: { background: "var(--rel-paper-sunken)", color: "var(--rel-ink-muted)" },
      gold: { background: "var(--rel-gold-soft)", color: "var(--rel-gold)" },
    },
  },
  defaultVariants: { tom: "avencer" },
})

export const dot = style({
  width: 9,
  height: 9,
  borderRadius: 3,
  flexShrink: 0,
  display: "inline-block",
  printColorAdjust: "exact",
  "@media": { print: { width: 6, height: 6 } },
})

// ── barras (composições, aging, evolução) ────────────────────────────────────

export const stack = style({
  display: "flex",
  height: 10,
  borderRadius: 999,
  overflow: "hidden",
  background: "var(--rel-paper-sunken)",
  marginBottom: 16,
  printColorAdjust: "exact",
  "@media": { print: { height: 7, marginBottom: 8 } },
})

export const stackSeg = style({ height: "100%", printColorAdjust: "exact" })

export const barraLinha = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "7px 0",
  borderTop: `1px solid var(--rel-line)`,
  selectors: { "&:first-child": { borderTop: "none" } },
  "@media": { print: { padding: "3px 0", gap: 7 } },
})

export const barraLabel = style({
  fontSize: 12,
  color: "var(--rel-ink)",
  flex: "0 0 150px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  "@media": { print: { fontSize: 8, flex: "0 0 108px", gap: 6 } },
})

export const barraTrack = style({
  flex: 1,
  height: 7,
  background: "var(--rel-paper-sunken)",
  borderRadius: 6, // trilho do módulo (interativo.css.ts `inadTrack`)
  overflow: "hidden",
  minWidth: 40,
  printColorAdjust: "exact",
  "@media": { print: { height: 6 } },
})

export const barraFill = style({ height: "100%", borderRadius: 6, printColorAdjust: "exact" })

export const barraValor = style([
  NUM,
  {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--rel-ink)",
    flex: "0 0 112px",
    textAlign: "right",
    "@media": { print: { fontSize: 8, flex: "0 0 76px" } },
  },
])

export const barraPct = style([
  NUM,
  {
    fontSize: 11,
    color: "var(--rel-ink-subtle)",
    flex: "0 0 48px",
    textAlign: "right",
    "@media": { print: { fontSize: 7.5, flex: "0 0 34px" } },
  },
])

// Evolução mensal: coluna empilhada (entradas sobre saídas).
export const evoWrap = style({
  display: "flex",
  alignItems: "stretch",
  gap: 6,
  minHeight: 150,
  "@media": { print: { minHeight: 86, gap: 3 } },
})

export const evoCol = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
})

export const evoBarra = style({
  width: "100%",
  maxWidth: 44,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  flex: 1,
})

export const evoSeg = recipe({
  base: { width: "100%", borderRadius: 3, printColorAdjust: "exact" },
  variants: {
    tom: {
      pos: { background: "var(--rel-pos)" },
      neg: { background: "var(--rel-neg)", opacity: 0.85 },
    },
  },
  defaultVariants: { tom: "pos" },
})

export const evoLabel = style({
  fontSize: 11,
  color: "var(--rel-ink-subtle)",
  whiteSpace: "nowrap",
  "@media": { print: { fontSize: 7 } },
})

export const evoSaldo = style([
  NUM,
  { fontSize: 11, fontWeight: 500, "@media": { print: { fontSize: 7 } } },
])

// ── sócios ───────────────────────────────────────────────────────────────────

export const socioGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 16,
  "@media": {
    "screen and (max-width: 760px)": { gridTemplateColumns: "1fr" },
    print: { gap: 8, marginBottom: 8 },
  },
})

export const socioCard = style({
  ...SUPERFICIE,
  padding: "15px 17px",
  breakInside: "avoid",
  "@media": { print: { ...SUPERFICIE_PRINT, padding: "8px 10px" } },
})

export const socioNome = style({
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: "var(--rel-ink)",
  marginBottom: 10,
  display: "flex",
  alignItems: "center",
  gap: 8,
  "@media": { print: { fontSize: 10, marginBottom: 5 } },
})

export const socioGrupo = style({
  ...MICRO,
  color: "var(--rel-ink-subtle)",
  margin: "10px 0 4px",
  "@media": { print: { fontSize: 6.5, margin: "5px 0 2px" } },
})

export const socioLinha = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 12,
  color: "var(--rel-ink-muted)",
  padding: "2px 0",
  "@media": { print: { fontSize: 8, padding: 0 } },
})

export const socioValor = style([NUM, { color: "var(--rel-ink)" }])

export const socioSaldo = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "baseline",
  marginTop: 10,
  paddingTop: 9,
  borderTop: `1px solid var(--rel-line)`,
  fontSize: 12,
  fontWeight: 500,
  "@media": { print: { fontSize: 8.5, marginTop: 5, paddingTop: 4 } },
})

export const veredito = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    padding: "13px 16px",
    borderRadius: 14,
    border: "1px solid transparent",
    printColorAdjust: "exact",
    "@media": { print: { padding: "7px 10px", borderRadius: 4 } },
  },
  variants: {
    tom: {
      quitado: {
        background: "color-mix(in srgb, var(--rel-pos) 10%, transparent)",
        borderColor: "color-mix(in srgb, var(--rel-pos) 28%, transparent)",
      },
      devendo: { background: "var(--rel-gold-soft)", borderColor: "var(--rel-gold)" },
    },
  },
  defaultVariants: { tom: "devendo" },
})

export const vereditoTexto = style({
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: "var(--rel-ink)",
  "@media": { print: { fontSize: 10 } },
})

export const vereditoValor = style([NUM, { fontWeight: 500 }])

export const vereditoSub = style({
  fontSize: 11,
  color: "var(--rel-ink-muted)",
  marginTop: 3,
  "@media": { print: { fontSize: 7.5 } },
})

// ── estados / utilidades ─────────────────────────────────────────────────────

export const vazio = style({
  padding: "24px 16px",
  textAlign: "center",
  fontSize: 12,
  color: "var(--rel-ink-subtle)",
  background: "var(--rel-paper-soft)",
  border: `1px dashed var(--rel-line)`,
  borderRadius: 14,
  "@media": { print: { padding: "10px", fontSize: 8, borderRadius: 4 } },
})

export const nota = style({
  marginTop: 10,
  fontSize: 11,
  color: "var(--rel-ink-subtle)",
  lineHeight: 1.55,
  "@media": { print: { fontSize: 7, marginTop: 5 } },
})

export const rodape = style({
  marginTop: 30,
  paddingTop: 12,
  borderTop: `1px solid var(--rel-line)`,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  fontSize: 11,
  color: "var(--rel-ink-subtle)",
  "@media": { print: { marginTop: 14, fontSize: 7 } },
})

/** Some na impressão (barra de período, botões). */
export const semImpressao = style({ "@media": { print: { display: "none !important" } } })
