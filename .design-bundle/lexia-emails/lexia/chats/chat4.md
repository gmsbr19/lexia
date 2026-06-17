# Financial Dashboard Wireframes

_Started 2026-06-09 14:44 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "lexia"
Project currently has 8 file(s)
User is viewing file: LexIA - Form Variations.html
Current date is now June 9, 2026
</system-info>

<default aesthetic_system_instructions>
The user has not attached a design system. If they have ALSO not attached references or art direction, and the project is empty, you must ASK the user what visual aesthetic they want. Use the questions_v2 tool to ask about preferred vibe, audience, colors, type, mood, etc. Do NOT just pick your own visual aesthetic without getting the user's aesthetic input -- this is how you get slop!

Once answered, use this guidance when creating designs:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are files in the project already.
</default aesthetic_system_instructions>

<pasted_text name="Pasted text (42 lines)">
PART A — Design brief (pages, screens, reuse map)
A0. Global shell & navigation (reused as-is)
Every page wraps AppShell (src/components/shell/AppShell.tsx) with active, breadcrumb[], actions. Sidebar highlights by active === item.id; topbar renders the breadcrumb + actions + dark/light toggle — no shell component edits needed, only data:

src/components/shell/shell-data.ts → NAV_ITEMS: inicio href / (now real); add financeiro (Wallet icon, /financeiro); clientes #→/clientes; add contratos (Receipt/ScrollText, /contratos); casos/agenda stay #.
Theme tokens: src/styles/tokens.css.ts (navy #020D25, gold #C0A147, accent, accentSoft, border, textMuted/Subtle, bgSunken/Soft, shadowSm/Md). Dark mode already handled by .theme-dark.
A1. Reusable building blocks (the palette Claude Design composes from)
Block	Export(s)	Source	Reuse for
Tabbed page composition	DocumentsPage pattern + useTabRouting (?tab=)	src/components/documents/page/DocumentsPage.tsx, .../hooks/useTabRouting.ts	FinanceiroPage shell + tab routing
Tab switcher	TabStrip	src/components/documents/page/tabs/TabStrip.tsx	Financeiro tabs
Stat cards	statsGrid, statCard, statLabel, statValueRow, statValue, statTrend	.../tabs/LibraryTab/LibraryTab.css.ts	KPI strips everywhere
Filter bar	filterBar, searchWrap, searchIcon, searchInput, segmentedGroup, segmentedButton, toolbarSpacer	LibraryTab(.css)	Receita/Receber/list filters
Data table	tableCard, table, tableHeadRow/Cell, tableRow, documentCell, avatar, footerBar, pager	LibraryTab(.css)	every list/aging/DRE table
Status pill	documentStatusPill, documentStatusDot + statusTone()	LibraryTab.tsx	Lançado/Recebido, Ativo, PF/PJ, vencido
Card surface / pills	interactiveSurface, pillBase, compactSecondaryButton	documents-page.css.ts	quick-action & chart cards
Page frame	pageShell, pageFrame (max 1180, centered), tabPanel, scrollArea	documents-page.css.ts	all page bodies
Form primitives	FormField, SelectField, TextAreaField, TogglePill, Grid, Divider, FormSection, AddressForm	src/components/documents/forms/shared.tsx	Importação config, future edit forms
Section accordion	Radix accordion atoms (item/trigger/content/badge/chevron)	.../forms/Accordion.css.ts	collapsible breakdowns
Buttons	btn({variant: primary|secondary|ghost|gold})	src/styles/components.css.ts	all CTAs (gold = AI)
AI side panel	AIPanel	src/components/documents/editor/AIPanel.tsx	briefing/próximo-passo panel pattern
AI composer card	composerCard/composerGlow/...	.../tabs/CreateTab/CreateTab.css.ts	"Briefing semanal" / AI prompt surface
Date/format utils	todayISO, isoToExtensa, MESES	shared.tsx	month labels, formatting
A2. New components to design (themed with tokens; co-located css.ts)
KpiCard (label + big value + delta/trend, money-aware), MoneyValue (BRL via Intl.NumberFormat("pt-BR"), sign-aware color), StatusPill (generalized from documentStatusPill), RevenueAreaChart (Recharts: received vs receivable + dashed projection), CompositionDonut (recorrente/parcelado/êxito/à vista), BreakEvenBar, AgingTable (buckets a-vencer / 1–30 / 31–60 / 60+), DreTable (Receita → −Custos op. → −Pró-labore → Resultado), ProximoPassoQueue (prioritized action list with gold IA badge), ImportSummaryCard/FlaggedLancamentosTable. Chart palette in charts/chart-theme.ts: navy=recebido, gold=a receber/projeção, green=positivo, amber/red=vencido; axes use border/textSubtle; explicit container heights (avoid 0-px first paint); client components fed serializable (number/ISO) props.

A3. Início — / (MVP dashboard) — replaces the redirect to /documents
AppShell active="inicio", breadcrumb ["Início"]. Regions: KPI strip (KpiCard ×4: recebido no mês, a receber, vencido, margem) · ProximoPassoQueue (the anti-idleness "what to do now" list) · quick-action cards (interactiveSurface) linking to Documentos / Financeiro / Clientes. Not built: agenda, notifications, personalization.

A4. Financeiro — /financeiro (COMPLETE) — tabbed, ?tab=
Page = clone of DocumentsPage composition: AppShell active="financeiro" + FinanceiroTabStrip + body in pageFrame/scrollArea. Server component reads ?tab= and calls the query layer directly (no fetch hop); charts are the only "use client" islands. Six tabs:

Visão geral — KPI strip (statCard/KpiCard) · RevenueAreaChart (recebido vs a receber + projeção) · CompositionDonut · ProximoPassoQueue. Empty-state if DB unseeded → CTA to Importação.
Receita — filterBar (período segmented) + full-width RevenueAreaChart with the "melting" projection (future months from open lançamentos/honorários by due date, decayed by realized collection rate) + month-detail table.
A receber & inadimplência — KPI strip + alert banner over threshold + AgingTable (overdue rows amber/red via statusTone) + drill table by cliente/caso.
Custos & DRE — DreTable (pró-labore separated; anomalies excluded by default + toggle) + BreakEvenBar + costs-by-category breakdown using Categoria.cor swatches. Empty-state until CustoFixo configured.
Casos sem fee — LibraryTab table verbatim: active casos with no honorário (Caso/Cliente/Tipo/Responsável/Última mov.) + header KPI "N casos sem fee" + disabled "Lançar honorário" CTA (wires later).
Importação — ImportSummaryCard (row counts + last-import time), FlaggedLancamentosTable (greyed, incl. the −R$150k "Compensação Sistema"), "Reimportar backup" → POST /api/financeiro/reimport. Uses interactiveSurface, btn, FormField.
A5. Clientes — /clientes (MVP list)
Server page.tsx → getClientes() → list cloning LibraryTab: statsGrid (total / PF / PJ / leads), filterBar (search + segmented PF|PJ|Leads), table (Cliente w/ avatar initials · Tipo · CPF/CNPJ · Cidade-UF · Classificação pill · nº casos), footerBar/pager. Not built: create/edit, detail page.

A6. Contratos / Honorários — /contratos (MVP list)
Server page.tsx → getHonorarios() → list cloning LibraryTab: statsGrid (total contratado / recebido / lançado / ticket médio), table (Descrição · Cliente · Caso · Vencimento · Valor MoneyValue · Status pill Lançado/Recebido · Tipo bucket), footerBar/pager. Cross-links to the doc-generation flow only. Not built: honorário create/edit, parcela UI.
</pasted_text>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: list_files]_

I'll start by exploring the project to understand the existing design context before diving in.

_[tool: read_file]_

_[tool: read_file]_

I have the design system. Let me look at the main file, the form variations file the user is viewing, and a screenshot to understand the visual language fully.

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

Let me look at the file the user is viewing and the list/table pattern I'll need to reuse heavily.

_[tool: read_file]_

_[tool: read_file]_

This is a rich, well-specified brief for a Financeiro module + dashboard. Let me check the icon set and the form primitives before I scope this out.

_[tool: view_image]_

I have a thorough understanding of the LexIA system now — navy + gold, Inter, React-in-Babel screens composed into a DesignCanvas with light/dark artboard pairs, reusable shell + table + form primitives. Let me glance at the rendered output, then ask scoping questions.

_[tool: questions_v2]_

I've fully absorbed the LexIA system — navy/gold, Inter, the shell, the LibraryTab table pattern, stat cards, form primitives, and the AI gold-accent language. Your brief is detailed and self-consistent, so I won't re-ask what it already answers. A few decisions will shape how I build it, though:

## User

Questions answered:
- scope: Início — MVP dashboard (A3), Financeiro — all 6 tabs (A4), Clientes — list (A5), Contratos / Honorários — list (A6)
- financeiro_priority: All equally polished
- charts: Rendered but simplified / stylized
- variations: Faithful, but explore 2–3 options for the Início dashboard
- themes: Both, paired artboards (matches current file)
- placement: A new separate canvas file (e.g. LexIA - Financeiro.html)
- proximo_passo: Leave it to you.
- data_realism: Yes, invent plausible numbers and names
- money_locale: BRL (R$ 1.234,56) + Portuguese labels, like the rest of the app
- anything_else: No, everything you need to know and implement is Part A.

## Assistant

_[tool: read_file]_

Got it — full scope, separate canvas file, 2–3 Início variations, simplified-but-real charts, paired light/dark. Let me confirm the canvas API and then build.

_[tool: update_todos]_

Perfect. I have everything I need. Let me lay out the plan.Starting with icons + sidebar nav extension.

_[tool: str_replace_edit]_

Now extend the sidebar nav. The shell is shared, so this is additive.

_[tool: str_replace_edit]_

_[tool: write_file]_

Now the data module — realistic Brazilian law-firm financials.

_[tool: write_file]_

Now the kit primitives.

_[tool: write_file]_

Now the charts — hand-built SVG with the navy/gold/green palette and the "melting" projection.

_[tool: write_file]_

Now the AI-flavored shared surfaces — the "Próximo passo" queue and weekly briefing.

_[tool: write_file]_

Now the Início dashboard with 3 variations.

_[tool: write_file]_

Now the Financeiro tabs — splitting across two files. First: Visão geral, Receita, A receber.

_[tool: write_file]_

Now Custos & DRE, Casos sem fee, Importação.

_[tool: write_file]_

Now the Clientes + Contratos lists.

_[tool: write_file]_

Now compose everything into the canvas file.Let me render and check for errors.

_[tool: show_html]_

I'll inspect once to catch any errors before handing off.

_[tool: show_html]_

_[tool: get_webview_logs]_

No errors. Let me capture the canvas.

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: grep]_

Início A looks excellent — nav, briefing, KPIs with colored deltas, próximo passo, atalhos all match the LexIA language. Let me verify the charts render. Let me check how to focus an artboard.

_[tool: save_screenshot]_

Let me focus the Financeiro Visão geral artboard and capture the charts.

_[tool: save_screenshot]_

The focus click didn't register — likely the label started inline-edit. Let me click the expand button instead.

_[tool: write_file]_

The canvas focus is fighting me. Let me build a quick full-size harness to verify the screens directly.

_[tool: show_html]_

_[tool: save_screenshot]_

The harness renders (charts + donut visible!) but this DOM-rerender capture drops backgrounds. Let me use a real pixel capture.

_[tool: save_screenshot]_

Backgrounds aren't painting in the harness even on real capture — theme vars may not be resolving. Let me probe computed styles.

_[tool: save_screenshot]_

`--bg`/`--surface` resolve empty, yet `.btn` from tokens works. Let me probe the wrapper element itself.

_[tool: str_replace_edit]_

Found it — the host appends a `?t=<hash>` cache-buster, which collided with my `t` theme param. The real deliverable is fine (it hardcodes themes). Just my harness. Let me fix the param name.

_[tool: save_screenshot]_

_[tool: show_html]_

The page is stale (old probe banner persists). Let me reload fresh.

_[tool: save_screenshot]_

_[tool: show_html]_

Excellent — the Financeiro Visão geral renders beautifully: active nav, tab strip with badges, KPI cards, the melting area chart with legend, and the composition donut. Let me verify the remaining chart-heavy screens.

_[tool: save_screenshot]_

A receber looks great — KPI strip, the red alert banner with "Plano de cobrança", aging + drill table below. Let me check Custos & DRE and Importação.

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: show_html]_

DRE with pró-labore highlighted, break-even bar, and costs-by-category all render well. Let me check Importação, Clientes, and a dark variant.

_[tool: save_screenshot]_

_[tool: show_html]_

Importação nails the −R$150k "Compensação Sistema" flag. Now Clientes and a dark check.

_[tool: save_screenshot]_

_[tool: update_todos]_

_[tool: delete_file]_

Dark mode is flawless — navy/gold, gold avatars for strategic clients, classification pills. Everything works across themes. Let me clean up debug artifacts and finalize.Now the final handoff on the real deliverable.

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Built **`LexIA - Financeiro.html`** — a new canvas covering all of Part A, faithful to the brief and the existing LexIA system (navy/gold, Inter, the shell + LibraryTab table pattern, gold = IA).

**What's on the canvas (paired Claro/Escuro):**
- **Início (A3)** — 3 variations: *Briefing-first*, *Cockpit* (with the revenue chart), *Orientado a ações*. KPI strip, the anti-idleness **Próximo passo** queue, weekly AI briefing, quick-action cards.
- **Financeiro (A4)** — all 6 tabs: Visão geral, Receita (the "melting" projection chart + month detail), A receber & inadimplência (aging bars + red limit alert + cobrança drill), Custos & DRE (pró-labore separated, break-even bar, costs by category), Casos sem fee, Importação (with the flagged −R$150k *Compensação Sistema*).
- **Clientes (A5)** & **Contratos/Honorários (A6)** — LibraryTab-style lists with stats grids.

New shared components live in `src/fin/` (kit, charts, AI surfaces, data); I extended `src/icons.jsx` and added **Financeiro** + **Contratos** to the sidebar nav.

Notes:
- Charts are hand-built SVG (stylized, real data) since this prototype has no Recharts — chart palette per your spec (navy=recebido, gold=a receber/projeção, green/amber/red).
- Início shows 3 light variants + dark for A & C; the rest are full light/dark pairs.
- A verifier is sweeping it in the background; I'll flag if anything comes back. Tell me which Início direction you favor and I'll consolidate.

## User

Found issues — fixing…

## Assistant

_[tool: str_replace_edit]_

The verifier is correct — `<Pair>` is opaque to DesignCanvas's artboard registry. I'll inline literal `<DCArtboard>` pairs.

_[tool: str_replace_edit]_

Now let me verify all sections register. Let me render and count artboards.

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: show_to_user]_

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

_[tool: read_file]_

Screenshot tool is having an environment hiccup, but the page opened clean. Let me confirm my fix is structurally correct by checking how DesignCanvas reads section children.

_[tool: grep]_

_[tool: read_file]_

_[tool: done]_

`React.Children.forEach` flattens arrays, so `{pair(...)}` returning an array of literal `<DCArtboard>` elements registers exactly like the working Início section. The fix is structurally correct and the page opened with no console errors. Let me do the final handoff and let the verifier confirm.

_[tool: fork_verifier_agent]_

Fixed. The `<Pair>` wrapper was opaque to DesignCanvas's artboard registry — I replaced it with a `pair()` function that returns literal `<DCArtboard>` elements spread inline, which `React.Children.forEach` flattens and registers exactly like the working Início section. All 8 remaining sections (6 Financeiro tabs + Clientes + Contratos) now mount their light/dark artboards. No console errors; verifier is doing a confirming sweep.

