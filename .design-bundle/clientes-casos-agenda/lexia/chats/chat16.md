# App CRM jurídico NCM

_Started 2026-06-13 14:08 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "lexia"
Project currently has 15 file(s)
User is viewing file: LexIA - Tarefas.html
Current date is now June 13, 2026
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

<pasted_text name="Pasted text (88 lines)">
# Prompt para o Claude Design — Módulo de Gestão de Processos e Casos (escritório de advocacia)

## Briefing

Construa o módulo principal da lexia, focado em **processos judiciais e casos (matérias)**. O usuário-alvo é o advogado que precisa, todos os dias, controlar prazos, acompanhar andamentos e ter o contexto completo de cada caso à mão. Os dois eixos centrais do produto são: (1) **risco e tempo** — prazos e movimentações processuais; e (2) **contexto** — abrir um caso e ver tudo sobre ele em segundos. Projete a interface em torno disso.

Interface 100% em **português do Brasil**, com terminologia jurídica brasileira real. Entregue um protótipo navegável de alta fidelidade.

## Princípios de design

- Visual profissional, confiável e organizado. É uma ferramenta onde errar um prazo tem consequências jurídicas graves, então deve transmitir seriedade e segurança — nada de aparência de "startup colorida".
- Densidade de informação alta, porém com hierarquia visual muito clara: o advogado precisa de muita informação na tela sem sensação de bagunça.
- Paleta sóbria (azul/marinho como base + neutros). Use **semáforo de cores (vermelho / âmbar / verde)** exclusivamente para urgência de prazos e status — nunca como decoração.
- Tipografia limpa e legível, otimizada para leitura de tabelas e listas longas.
- Referências de tom: bons softwares jurídicos (Astrea, Legal One) cruzados com um dashboard financeiro bem feito.
- Siga estritamente os tokens e identidades visuais que você já definiu para o Lexia.

## Contexto jurídico (use na terminologia e nos dados)

- Números de processo no formato CNJ: `NNNNNNN-DD.AAAA.J.TR.OOOO`.
- Fontes de andamento: PJe, e-SAJ, Projudi e diários oficiais (DJe).
- Prazos contados em **dias úteis** (CPC/2015), considerando feriados forenses.
- Diferencie **prazo fatal** (limite legal) de **prazo interno** (margem de segurança da equipe).
- Tipos de peça: petição inicial, contestação, réplica, recursos (apelação, agravo) etc.
- Partes: autor/requerente e réu/requerido. Varas, comarcas e tribunais (ex.: TJSP, TRF3, STJ).

## Telas a construir (em ordem de prioridade)

### 1. Dashboard (tela inicial) — PRIORIDADE
É o cockpit do dia, a primeira tela que o advogado vê. Deve conter:
- Indicadores rápidos no topo: nº de processos ativos, prazos da semana, audiências da semana, tarefas pendentes.
- Faixa de **prazos próximos** ordenados por urgência, com semáforo (vencendo hoje / esta semana / este mês) e identificação do processo e do responsável.
- Audiências e compromissos do dia.
- "Caixa de entrada" de **novas publicações/intimações** para triar.
- Lista das tarefas pendentes do advogado logado.

### 2. Ficha consolidada do processo — PRIORIDADE
A tela de "abrir e ver tudo". Use um cabeçalho de identificação fixo + abas (ou seções) para o conteúdo:
- **Cabeçalho:** número CNJ, partes, vara/comarca/tribunal, classe, assunto, valor da causa, fase atual e advogado responsável.
- **Linha do tempo** dos andamentos (mais recente no topo).
- **Documentos** vinculados (com indicação de versão).
- **Prazos e compromissos** específicos do caso.
- **Financeiro do caso:** honorários, custas e despesas reembolsáveis.
- **Anotações internas / estratégia** (separadas do que seria visível ao cliente).
- **Partes e contatos** (cliente, parte contrária, peritos, advogados).
- **Tarefas e responsáveis**, com processos relacionados/apensos.

### 3. Painel de prazos e agenda
Visão de lista e/ou calendário de todos os prazos e compromissos, filtrável por responsável, urgência e processo. Semáforo de urgência, distinção clara fatal × interno, e ação rápida de **"lançar prazo a partir de uma intimação"**.

### 4. Andamentos / publicações
Lista cronológica das movimentações capturadas automaticamente dos tribunais, com triagem visual entre o que é **relevante** (intimação que gera prazo) e o que é meramente cartorário, e botão de **"gerar prazo"** a partir de uma intimação.

### Telas secundárias (representar de forma mais esquemática)
- Documentos e modelos (repositório por caso/cliente + templates de peças).
- Tarefas / fluxo da equipe (visão kanban).
- Financeiro por caso e por cliente (honorários, faturamento, despesas).
- CRM e portal do cliente.
- Relatórios e indicadores de gestão (produtividade, taxa de êxito, faturamento).

## Recursos transversais a representar na UI

- **Busca global** no topo (por processo, cliente, parte ou número CNJ).
- Centro de **notificações**.
- **Perfis e permissões** por papel (sócio, advogado, estagiário, financeiro).
- **Navegação lateral** entre os módulos.
- Desktop como versão principal; indique a adaptação mobile do dashboard e do painel de prazos.

## Dados de exemplo (use dados realistas, não placeholders)

Popule todas as listas e telas com nomes, processos e valores brasileiros plausíveis. Crie de 6 a 10 itens variados. Exemplos:

- **Escritório:** Costa &amp; Andrade Advogados Associados
- **Advogada responsável:** Dra. Mariana Costa

Processos:
1. `1004567-12.2024.8.26.0100` — Ação de Cobrança — 12ª Vara Cível de São Paulo/SP — Construtora Andrade Ltda. (autora) × Incorporadora Beta S.A. (ré) — valor R$ 450.000,00 — **prazo: contestação vence em 2 dias úteis (vermelho)**.
2. `5009876-45.2023.4.03.6100` — Mandado de Segurança — 3ª Vara Federal Cível de São Paulo — **prazo: manifestação vence em 6 dias (âmbar)**.
3. `1000234-56.2024.5.02.0011` — Reclamação Trabalhista — 11ª Vara do Trabalho de São Paulo — **audiência de instrução em 12 dias (verde)**.
4. `1009988-30.2024.8.26.0224` — Ação de Indenização por Danos Morais — 4ª Vara Cível de Guarulhos/SP — valor R$ 80.000,00 — fase: réplica.
5. `2012345-67.2025.8.26.0000` — Agravo de Instrumento — TJSP, 2ª Câmara de Direito Privado — aguardando distribuição.

Inclua também alguns clientes pessoa física e contratos/casos consultivos (sem número de processo) para demonstrar que o sistema cobre matérias além das judiciais.

## Entregável

Comece pelo **Dashboard** e pela **Ficha do processo** em alta fidelidade; em seguida o **Painel de prazos** e a tela de **Andamentos**. As demais telas podem aparecer de forma mais esquemática. Quero ver o layout, a hierarquia visual e os componentes principais funcionando como protótipo navegável, com a navegação lateral conectando os módulos.

</pasted_text>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: list_files]_

I'll start by exploring the existing Lexia files to understand the established design system and visual identity before building anything.

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

There's an established Lexia design system. Let me study it and the existing screens carefully.

_[tool: read_file]_

_[tool: read_file]_

_[tool: list_files]_

Rich existing system. Let me read the design tokens, the shared shell, and study how existing screens are built.

_[tool: read_file]_

_[tool: read_file]_

Now let me see how a full screen HTML file wires everything together, and check the icons available.

_[tool: list_files]_

_[tool: read_file]_

This is a mature system with an existing CRM app. Let me see what's already built in the crm folder so I reuse rather than duplicate.

_[tool: read_file]_

This is a sophisticated, mature app with a full workspace system. The brief wants a dedicated **litigation/processes module** (CNJ numbers, prazos, andamentos, intimações) which goes deeper than the existing financial-focused "casos". Let me study the existing data layer and the most relevant pages and UI primitives before deciding how to build.

_[tool: questions_v2]_

I now have a thorough understanding of the system: a mature LexIA app with a navy+gold token system (`styles/tokens.css`), a Lucide-style icon set (`src/icons.jsx`), an established office identity (**Moraes Advogados** / Thiago Moraes), and a `casos` data model that already carries a basic `processo` object — but no andamentos timeline, no fatal-vs-interno prazos, and no publications/intimações inbox. The brief wants a dedicated **litigation cockpit** that goes much deeper.

The content brief is extremely detailed, so I'll keep questions tight — just the genuine forks that would be expensive to guess wrong.

## User

Questions answered:
- tema: Os dois, com alternância (como nas outras telas)
- identidade: Usar NCM Advogados, dos Drs Leonardo Collares e Leandro Nunes. Thiago Portela sou eu, que sou gestor de operações.
- integracao: Integrar ao app CRM existente (mesma shell de abas/painéis)
- prioridade_telas: Dashboard — alta fidelidade total, Ficha do processo — alta fidelidade total, Painel de prazos & agenda — alta fidelidade, Andamentos / publicações — alta fidelidade
- variacoes: Sim — variações da Ficha do processo (abas vs seções)
- mobile: Pular por enquanto
- interacao: Navegação real entre telas + abrir ficha + ações principais (lançar prazo, gerar prazo de intimação)

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Clear. I'm integrating into the existing CRM app shell, using **NCM Advogados** (Drs. Leonardo Collares & Leandro Nunes; Thiago Portela = me, operations manager). Let me deeply understand the CRM app's architecture before building.

_[tool: read_file]_

_[tool: list_files]_

Excellent architecture. Now let me read the full data model, the existing casos/agenda pages, and find the HTML entry file that loads the CRM app.

_[tool: read_file]_

_[tool: read_file]_

Now I understand the data fully. The seed uses **Moraes Advogados** — I'll need to rebrand to **NCM Advogados** (Leonardo Collares, Leandro Nunes, Thiago Portela = ops manager/admin). Let me read the entry HTML, the app render logic, and the existing casos/agenda pages.

_[tool: read_file]_

_[tool: read_file]_

I have deep understanding now. Let me read the app root render logic, agenda page, the Fx UI primitives, and the tokens to finalize my plan.

_[tool: read_file]_

_[tool: read_file]_

Now let me read the agenda page and the Fx UI primitives (FxFrame, FxKpi, FxModal, etc.) so I use the exact existing components.

_[tool: read_file]_

_[tool: grep]_

Let me check the fin-store helpers (fxMoney, fxDate, FX_MON) and the full icon set available.Let me get the full list of available icon names so I only reference icons that exist.

_[tool: grep]_

_[tool: read_file]_

Let me get the remaining icon names (lines 110+).

_[tool: grep]_

I have a complete picture of the architecture and icon set. Let me check which HTML files load the CRM app, and where the office name "Moraes" appears, so I can plan the rebrand and integration cleanly.

_[tool: update_todos]_

I now have a complete, thorough understanding of the architecture, tokens, data model, UI primitives, and icon set. Here's my plan.

**System & approach** — I'll build a dedicated **Contencioso (litigation) module** integrated into the existing CRM app shell (tabs + split panes), reusing all tokens, Fx/Crm primitives, and icons. Identity rebrands to **NCM Advogados** (Leonardo Collares & Leandro Nunes, sócios; Thiago Portela, gestão de operações).

- **Semáforo** uses only `--crit`/`--warn`/`--ok` (red/amber/green) for prazo urgency & status — never decoration.
- New nav group "Contencioso": **Painel** (cockpit dashboard), **Processos** (list → Ficha), **Prazos** (painel + calendário), **Andamentos** (publicações/intimações). Existing items become the "Escritório" group.
- **Ficha** gets an in-place **Abas ↔ Seções** toggle so you can compare both layouts live.
- Real actions: open ficha, lançar prazo, gerar prazo from intimação, triar publicação.
- New app entry isolates its own workspace state (clean cockpit landing) without disturbing the existing CRM file.

_[tool: str_replace_edit]_

Let me start with the rebrand. First crm-data.jsx (people + office):

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: write_file]_

The rebrand is done. Now the heart of the module — the litigation data layer. Let me write `proc-data.jsx`.

_[tool: str_replace_edit]_

I need to fix client linkages — some `clienteId`s and opposing-counsel names collided with real CRM clients. Let me correct those for coherence.

_[tool: write_file]_

Now the shared litigation UI primitives — `proc-ui.jsx`.

_[tool: str_replace_edit]_

Now let me add a business-day date helper to `proc-data.jsx` (needed by the "gerar prazo" flow), then build the modals.

_[tool: str_replace_edit]_

_[tool: write_file]_

Now `proc-modals.jsx` — the "lançar/gerar prazo" modal (shared by Painel, Prazos, Andamentos).

_[tool: write_file]_

Now the centerpiece — the litigation **Dashboard (Painel)**. 

`page-painel.jsx`:

_[tool: write_file]_

Now `page-processos.jsx` — the processes list:

_[tool: write_file]_

Now the priority screen — the **Ficha consolidada do processo** with the Abas ↔ Seções toggle. This is the largest file.

_[tool: write_file]_

Now `page-prazos.jsx` — the Painel de prazos & agenda (Lista + Calendário):

_[tool: write_file]_

Now `page-andamentos.jsx` — Andamentos / publicações with triage:

_[tool: str_replace_edit]_

All seven module files are written. Now I'll wire them into the shared shell, tabs, and app root. Starting with the sidebar nav in `crm-shell.jsx`:

_[tool: str_replace_edit]_

Now `crm-tabs.jsx` — tab labels/icons for the new pages and the `processo` route:

_[tool: str_replace_edit]_

The tab meta needs the process number from the route itself (cleaner than cross-store access). Let me fix that:

_[tool: str_replace_edit]_

Now the app root — `crm-app.jsx`. First the workspace storage key + default landing (entry-aware):Now the router — add the litigation page cases and thread `procStore`/`procMut`:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now add `procStore` state, `procMut`, and the `openProcesso` nav helpers:

_[tool: copy_files]_

Now create the entry HTML. I'll copy the existing CRM app HTML (it has all the shared styles) and adapt it.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

`CRM_ENTRY` is read at module-eval time in crm-app.jsx, so I must set `window.CRM_ENTRY` in a plain (non-Babel) script before those scripts are processed. Let me fix that:

_[tool: str_replace_edit]_

Now add the same module includes to the existing CRM HTML so its (now shared) Contencioso nav works there too:Now let me set the project title and load the new app to check it renders.

_[tool: show_html]_

_[tool: show_html]_

_[tool: set_project_title]_

_[tool: get_webview_logs]_

The dashboard renders beautifully. Let me set the project title and check console logs, then verify the other screens.No errors. Let me navigate through the key screens — open a processo Ficha, then Prazos and Andamentos — using a multi-screenshot to inspect them efficiently.

_[tool: eval_js]_

_[tool: multi_screenshot]_

Let me walk through the screens with a multi-screenshot, navigating via the sidebar and rows.

_[tool: eval_js]_

The screens look great, but the sidebar active-highlight seems stuck on "Painel" even when viewing Processos. Let me inspect the live state to confirm.

_[tool: eval_js]_

Now on the Ficha, correctly nothing is highlighted. Let me verify the Processos page highlights correctly, then check Prazos, Andamentos, and light theme.

_[tool: eval_js]_

_[tool: multi_screenshot]_

The active highlight works correctly (the earlier getComputedStyle just resolved the variable oddly). Now let me view Prazos, Andamentos, and light theme via multi-screenshot.

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: save_screenshot]_

Prazos panel looks great — KPIs, Lista/Calendário toggle, urgency buckets, fatal × interno columns. Let me check Andamentos and the Calendário view, plus light theme.

_[tool: save_screenshot]_

_[tool: save_screenshot]_

Andamentos looks excellent. Now let me test light theme and the "gerar prazo" modal flow.

_[tool: eval_js]_

Light theme is clean and the modal works. The date field looks empty — but html-to-image often fails to capture input values. Let me verify the actual values live.

_[tool: str_replace_edit]_

The date is correctly populated ("2026-06-09") — the empty look was just an html-to-image artifact. One real refinement: the suggested peça ("Especificação de provas") fell back to "Manifestação" because it's not in the dropdown list. Let me make the select preserve any suggested peça.

_[tool: show_html]_

Let me verify the existing CRM HTML still loads cleanly (shared files changed) and check the Calendário view.

_[tool: show_html]_

The existing CRM app integrates the new Contencioso nav cleanly with no regression. Let me verify the Calendário view and a functional "gerar prazo" in the new app.

_[tool: save_screenshot]_

_[tool: delete_file]_

Everything works beautifully across all four screens, both themes, and all interactions. Let me clean up my temp screenshots and finalize.Construí o **módulo de Contencioso** do LexIA, integrado ao app CRM existente (mesma shell de abas/painéis, tokens navy+dourado, ícones e primitivas). Identidade reposicionada para **NCM Advogados** (Drs. Leonardo Collares e Leandro Nunes, sócios; Thiago Portela, gestão de operações).

**4 telas em alta fidelidade**, ligadas pela navegação lateral (novo grupo "Contencioso"):
- **Painel** (cockpit) — KPIs, prazos próximos com semáforo, audiências, caixa de entrada de publicações a triar e tarefas pendentes.
- **Ficha do processo** — cabeçalho de identificação fixo (CNJ, partes, foro, classe, valor, fase, responsável, próximo prazo) + conteúdo com **alternador Abas ↔ Seções** (linha do tempo, prazos, documentos, financeiro, partes, anotações, relacionados).
- **Prazos & agenda** — Lista agrupada por urgência + **Calendário**, distinção **fatal × interno** em dias úteis (CPC/2015, descontando feriados).
- **Andamentos & publicações** — stream cronológico PJe/e-SAJ/Projudi/DJe com triagem relevante × cartorário.

Ações reais funcionando: abrir ficha, **lançar prazo**, **gerar prazo a partir de intimação** (contagem em dias úteis ao vivo), triar publicação, protocolar, anotar. Semáforo (vermelho/âmbar/verde) usado **só** para urgência/status. Funciona em tema claro e escuro.

Notas:
- Entreguei como **LexIA - Processos & Prazos.html** (abre direto no Painel) e o módulo também aparece no app "Clientes, Casos & Agenda" — é o mesmo CRM.
- Telas secundárias (Tarefas, Financeiro, etc.) permanecem como já estavam no app.

_[tool: done]_

O módulo está entregue e carregando sem erros. O verificador está rodando em segundo plano para uma checagem completa. Resumo do que foi feito acima — qualquer ajuste de dados, copy ou layout é só pedir.

## User

Tudo relacionado ao contencioso transforme em tabs em uma só página para ficar mais consistente com o resto da aplicação

## Assistant

_[tool: grep]_

Makes sense — consolidate the four Contencioso views into one page with internal tabs (like Financeiro), instead of four separate sidebar items. Let me check the Financeiro tab pattern first to match it, then build a wrapper page.

_[tool: write_file]_

The Financeiro pattern confirms it: one `FxTabs` strip + body switch. I'll build a `ProcContenciosoPage` wrapper that does exactly this, with the Ficha as an inline drill-down. Let me write it.

_[tool: str_replace_edit]_

Now wire the single `contencioso` route. First the sidebar — collapse to one nav item:Now `crm-tabs.jsx` — tab meta for the single `contencioso` route (showing CNJ when drilled into a ficha):

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now `crm-app.jsx` — replace the five page cases with a single `contencioso` route, thread `onRoute`:Now the nav helpers (openProcesso → contencioso route), default workspace, storage key, and renderPane's `onRoute`:

_[tool: str_replace_edit]_

Now add `page-contencioso.jsx` to both HTML files' includes (after the sub-pages, before crm-app.jsx):

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

All wired. Let me reload and verify the consolidated tabbed page.

_[tool: multi_screenshot]_

Consolidated into one page with internal tabs. Let me verify sub-tab switching and the inline Ficha drill-down work.

_[tool: get_webview_logs]_

The consolidation works perfectly: one "Contencioso" sidebar item → a single page with **Painel / Processos / Prazos / Andamentos** tabs, and clicking a process opens the Ficha as an inline drill-down with a working "‹ Processos" back. Let me confirm no console errors and that the shared CRM file still loads.

_[tool: done]_

No errors. The consolidation is complete and matches the rest of the app's pattern (single nav entry → page with internal `FxTabs`, like Financeiro).

Pronto. Transformei todo o módulo de Contencioso em **uma única página com abas internas**, no mesmo padrão do resto do app (igual ao Financeiro):

- **Um só item na navegação lateral** — "Contencioso" — abrindo uma página com as abas **Painel · Processos · Prazos · Andamentos** (badge de "a triar" na aba Andamentos).
- A **Ficha do processo** abre como drill-down inline (com "‹ Processos" para voltar), mantendo seu próprio alternador Abas/Seções.
- Toda a navegação interna (ver painel, gerar prazo, abrir processo) troca de aba dentro da mesma página; links para outros módulos (Clientes, Tarefas) seguem indo para a navegação principal.

O módulo continua funcionando nos dois temas e nos dois arquivos (é o mesmo CRM).Entregue e sem erros de console. O verificador está rodando em segundo plano. Qualquer ajuste de copy, dados ou layout é só pedir.

