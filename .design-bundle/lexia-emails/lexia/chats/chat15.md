# Design System LexIA

_Started 2026-06-13 00:01 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "lexia"
Project currently has 14 file(s)
User is viewing file: LexIA - Clientes, Casos & Agenda.html
Current date is now June 12, 2026
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

<pasted_text name="Pasted text (138 lines)">
Você é um designer de produto sênior padronizando o design system completo do 
LexIA, um SaaS jurídico com IA (paleta navy escuro + dourado, público: 
advogados). Direção: minimalista, elegante e moderno — referência de 
refinamento: Linear, Arc, Raycast. O dourado é a assinatura da marca, usado 
com extrema parcimônia. Toda a aplicação deve falar UMA linguagem visual: 
mesmos tokens, mesmos padrões, mesmos estados em todas as telas.

═══════════════════════════════════════════
PARTE 1 · TOKENS BASE (fundação obrigatória)
═══════════════════════════════════════════

Grade e espaçamento
- Grade de 4px. Todo padding, gap e margin em múltiplos de 4 (8, 12, 16, 24, 32).
- Container de conteúdo: max-width 1200px, padding lateral 32px.
- Modais e paletas de comando: 640px, ancorados a ~18% do topo.

Tipografia
- Escala modular 1.25: 12 / 14 / 16 / 20 / 25px. Nenhum outro tamanho.
- Dois pesos apenas: 400 (corpo) e 500 (títulos, labels, valores).
- Line-height 1.5 no corpo, 1.2 em títulos. Labels de seção e cabeçalhos de 
  tabela: 11–12px, caixa alta, letter-spacing 0.08em.
- Números tabulares (font-variant-numeric: tabular-nums) em valores, datas 
  e colunas numéricas.
- Contraste mínimo WCAG 4.5:1 para todo texto sobre o navy.

Raios (concêntricos)
- 6px (badges, chips, inputs pequenos), 8px (containers de ícone, botões), 
  10px (itens de lista, linhas destacadas), 14px (cards, modais, popovers).
- Regra: raio interno = raio externo − padding entre eles.

Bordas
- Uma única cor: branco com alpha. Três intensidades: 8% (padrão), 
  16% (hover), dourado 40% (foco/seleção). Espessura única de 1px.
- Regra "fill OU borda": nenhum elemento com fundo preenchido E borda 
  decorativa simultâneos.

Cor
- Superfícies: 3 níveis de navy no máximo (fundo da página, superfície de 
  card/sidebar, superfície elevada de modal). Definir os 3 e nunca criar 
  um quarto.
- Dourado reservado a: anel de foco, item selecionado/ativo, CTA primário 
  e marca. Máximo 4 ocorrências por tela.
- Cores semânticas (máx. 4): verde (finalizado/sucesso), âmbar (atenção/em 
  revisão), vermelho (crítico/vencido), neutro (rascunho/inativo). 
  Dourado adicional apenas para IA/geração.
- Fills sutis: cor semântica a 10–12% de alpha, texto na mesma cor em tom claro.

Ícones
- Um único set outline (Tabler ou Lucide), stroke 1.5px, grid 24px, 
  renderizados a 16–18px.
- Containers de ícone: quadrado raio 8px, tamanho único 28–32px por contexto, 
  fill 10–12% de alpha, sem borda.
- Ícone neutro por padrão; cor apenas quando codifica significado.

Profundidade e movimento
- Dois níveis de elevação no máximo. Overlay de modal: escurecimento ~70%, 
  sem glow.
- Proibido: gradientes decorativos, glow dourado, neon, sombras coloridas.
- Transições 150–200ms ease-out. Modais: fade + scale 0.98→1. 
  Hover de linhas/itens: apenas mudança de fill, sem movimento.

═══════════════════════════════════════════
PARTE 2 · COMPONENTES DA APLICAÇÃO
═══════════════════════════════════════════

Sidebar de navegação
- Largura fixa 240px, superfície nível 2.
- Itens: 40px de altura, ícone 18px + label 14px, raio 8px.
- Item ativo: fill dourado 8% + texto/ícone dourado. Hover: fill branco 6%.
  Inativos: texto neutro claro, ícone neutro.
- Contadores (badges numéricos): pill neutra, 12px, fill 10%; dourado apenas 
  se houver pendência que exige ação.
- Bloco de dica e Configurações fixados na base, separados por borda 8%.

Top bar e abas
- Altura 56px, borda inferior 8%.
- Abas estilo navegador: pill com fill sutil quando ativa, ícone 16px + 
  título 14px + botão fechar visível só no hover.
- Cluster direito (papel do usuário, tema, notificações, avatar): ícones 
  18px em botões-fantasma de 32px; dropdown de papel segue tokens de borda.

Cabeçalho de página
- Título 25px peso 500 + subtítulo 14px neutro na linha abaixo.
- CTA primário ("Gerar com a LexIA") no canto direito: ÚNICO botão sólido 
  dourado da tela, texto navy escuro, raio 8px, altura 40px.

Cards de início rápido ("Começar com a LexIA")
- Grid de 4 colunas, gap 16px, raio 14px, superfície nível 2, borda 8%.
- Conteúdo: container de ícone 32px + título 14px/500 + descrição 12px neutra.
- Sem sparkle decorativo dentro do card; hover = borda 16% + fill +2%. 
  O sparkle aparece apenas como afford de ação no hover (canto direito).

Busca e filtros de lista
- Input de busca: altura 40px, raio 8px, ícone 16px à esquerda, borda 8%, 
  foco com anel dourado.
- Filtros de status: segmented control único (Todos / Rascunhos / Em revisão 
  / Finalizados), item ativo com fill dourado 10% + texto dourado, 
  demais neutros. Sem pills soltas.

Tabela de documentos (padrão para TODAS as listas: casos, clientes, contratos)
- Cabeçalho: 11px caixa alta, letter-spacing 0.08em, neutro, borda inferior 8%.
- Linhas: 64px de altura, sem zebra, separadas por borda 8%; hover fill 
  branco 4%; linha clicável inteira.
- Célula principal: container de ícone 32px (cor por TIPO de documento, 
  fill 10%) + título 14px/500 + metadado 12px neutro abaixo.
- Badges de status: pill raio 6px, 12px, fill semântico 10–12% + texto na 
  cor semântica clara + dot de 6px. Verde = finalizado, âmbar = em revisão, 
  neutro = rascunho. Nunca borda + fill juntos.
- Datas: tabulares, formato relativo quando &lt; 7 dias ("há 2 dias"), 
  absoluto depois (09/06/26).
- Coluna formato: texto 12px neutro (DOCX, PDF), sem destaque.

Input flutuante de IA (barra inferior)
- Mesma anatomia do input da paleta ⌘K: ícone de IA à esquerda, placeholder 
  contextual (manter rotação existente), badge ⌘K à direita.
- Elevação por sombra sutil + borda 16%; SEM glow dourado. Foco = anel 
  dourado padrão.

Paleta de comandos (⌘K)
- Chips de modo sob o input: Tudo / Buscar / Perguntar / Gerar.
- Seções "Sugestões da LexIA" e "Ações rápidas" com labels 11px caixa alta.
- Ícones por tipo: âmbar = alerta, dourado/sparkle = só geração com IA, 
  balão = pergunta, neutro = ação comum.
- Item focado: fill dourado 8% + barra dourada 3px à esquerda + hint de 
  tecla no item. Rodapé com atalhos.
- Itens compactos: padding vertical 8–10px, 6–7 visíveis sem scroll.

Padrões transversais
- Botões: primário (sólido dourado, 1 por tela), secundário (borda 16%, 
  fundo transparente), fantasma (sem borda, hover fill 6%), destrutivo 
  (vermelho, mesmo sistema). Alturas: 40px padrão, 32px compacto.
- Formulários: labels 12px acima do campo, inputs 40px raio 8px, erro em 
  vermelho com mensagem 12px abaixo, foco sempre anel dourado.
- Estados vazios: ícone neutro 32px + título 16px + descrição 14px + uma 
  ação secundária. Sem ilustrações elaboradas.
- Toasts/notificações: superfície nível 3, borda 8%, ícone semântico, 
  auto-dismiss 5s, canto inferior direito.
- Tooltips: 12px, superfície nível 3, raio 6px, sem
</pasted_text>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

This is a substantial, mature LexIA codebase, and you've handed me a very complete standardization spec. Before I start refactoring, let me look at how the shared UI kit is built so my questions are grounded.

_[tool: questions_v2]_

I've now got a clear picture. LexIA is a mature multi-app suite (CRM, Comercial, Financeiro, Tarefas) sharing `styles/tokens.css` and per-app UI kits. Your spec is a meaningful **tightening** of what's already there — and there's real drift to reconcile. A few examples I can already see:

- **Weights:** spec allows only 400/500, but the kit leans on 600/700 (badges, headings, avatars, priority tags).
- **Type scale:** spec is strict 12/14/16/20/25, but the code uses 11, 11.5, 12.5, 13, 13.5, 27…
- **Radii:** spec is 6/8/10/14; tokens.css defines 6/8/12/16/22/28.
- **Badges:** spec wants 6px-radius pills with a 6px dot and no border; current badges are fully-round 999px.

So this is a foundation-level refactor, not a cosmetic pass. Before I touch anything, I want to lock scope and approach.

## User

Questions answered:
- scope: Começar pela fundação (tokens.css + kit compartilhado) e depois cascatear
- deliverable: Sim — crie uma página 'Design System' de referência
- weights: Sim, aplicar 400/500 em tudo (Linear/Arc style)
- theme: Manter os dois temas conformes ao spec
- color_strictness: Rigor total — auditar e cortar todo uso fora da regra
- priority: Os popups da LexIA
- spec_truncated: Padrões transversais
- Botões: primário (sólido dourado, 1 por tela), secundário (borda 16%, 
  fundo transparente), fantasma (sem borda, hover fill 6%), destrutivo 
  (vermelho, mesmo sistema). Alturas: 40px padrão, 32px compacto.
- Formulários: labels 12px acima do campo, inputs 40px raio 8px, erro em 
  vermelho com mensagem 12px abaixo, foco sempre anel dourado.
- Estados vazios: ícone neutro 32px + título 16px + descrição 14px + uma 
  ação secundária. Sem ilustrações elaboradas.
- Toasts/notificações: superfície nível 3, borda 8%, ícone semântico, 
  auto-dismiss 5s, canto inferior direito.
- Tooltips: 12px, superfície nível 3, raio 6px, sem seta.
- Skeleton loading: blocos com fill branco 6% pulsando, mesma geometria 
  do conteúdo final.

═══════════════════════════════════════════
PARTE 3 · CRITÉRIOS DE ACEITAÇÃO
═══════════════════════════════════════════

1. Nenhum valor de espaçamento, raio, fonte ou cor fora dos tokens.
2. Dourado em no máximo 4 lugares por tela; 1 único botão sólido dourado.
3. Nenhum elemento com fundo + borda decorativa simultâneos.
4. Todos os ícones do mesmo set, mesmo stroke; cor só com significado.
5. Estado de foco/seleção identificável a 2 metros da tela.
6. Todo texto passa em contraste 4.5:1.
7. Os mesmos padrões de tabela, badge, botão e formulário se repetem em 
   todas as seções (Documentos, Casos, Clientes, Contratos, Financeiro, 
   Agenda) sem variações locais.
8. Apenas 3 níveis de superfície navy em toda a aplicação.

Entregue: (1) tokens como variáveis CSS organizadas por categoria, 
(2) biblioteca de componentes na ordem acima, cada um com estados default / 
hover / focus / active / disabled, (3) uma tela de Documentos completa 
montada só com esses componentes como prova do sistema, (4) guia de certo/
errado do uso do dourado com 5 exemplos de cada.

## Assistant

_[tool: grep]_

_[tool: grep]_

Got it — clear plan. You want me to **start at the foundation** (tokens + shared kit), build a **living Design System reference page**, apply **strict 400/500 weights**, keep **both themes**, enforce **total rigor on gold/semantic color**, and the **LexIA popups are priority #1**. The full Parte 2/3 spec (botões, formulários, toasts, tooltips, skeleton, acceptance criteria, deliverables) is now in hand.

Let me check a couple of usages before I remap token values, so I don't break the live apps.

_[tool: update_todos]_

`--bg-soft`, `--surface`, `--r-md/--r-lg` etc. are load-bearing across ~50 files. So my foundation refactor must **keep the names** and remap their values to the strict system — that way conformance cascades automatically without breaking the live apps. Let me lay out the plan and start building.

_[tool: read_file]_

Before I build, let me read the priority components — the LexIA popups (⌘K palette + floating AI bar) — so the reference reflects the real anatomy.

_[tool: read_file]_

_[tool: write_file]_

I now have the full anatomy of both LexIA popups (the ⌘K palette and the floating AI bar with its float⇄dock morph). Note the current bar leans on a gold aurora/glow and blue/violet tones — both of which the spec explicitly **forbids** ("SEM glow dourado", semantic set has no blue/violet). Conforming those is exactly the priority.

Let me start with the foundation: a fully reorganized `tokens.css`, keeping every variable name so the live apps cascade automatically.

_[tool: show_html]_

Foundation written. Let me sanity-check the live CRM still renders under the new tokens before building the reference page.

_[tool: show_html]_

_[tool: update_todos]_

The live app cascaded cleanly under the new foundation — the "Gerar com a LexIA" CTA is now the single solid-gold button, status badges read correctly, surfaces collapsed to the 3 navy levels. The token refactor is working.

Now the main deliverable: the Design System reference page. Let me mark progress and build it across a CSS file, a small render helper, and the HTML doc.

_[tool: write_file]_

_[tool: write_file]_

Now a small vanilla-JS render helper for the repetitive token grids and state matrices (keeps the HTML lean and DRY), plus theme toggle and scroll-spy.

_[tool: str_replace_edit]_

I referenced `force-hover`/`force-active` classes — let me add them (mirroring the real hover/active rules so each state paints statically).

_[tool: write_file]_

Now the reference page itself — sprite, nav, foundations, component library, the LexIA popups, the Documentos proof, and the gold guide.

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

Excellent — foundations, the gold/semantic swatches, the full button state matrix, and the clean glow-free floating pill all render beautifully. Let me check the command palette, table, the Documentos proof, and the gold guide.

_[tool: save_screenshot]_

Everything renders cleanly — the ⌘K palette with its gold focus-bar, the universal table, the Documentos proof, and the gold guide. Let me verify the light theme and check for console errors.

_[tool: get_webview_logs]_

_[tool: update_todos]_

Light theme reads cleanly — badges keep proper contrast, the table works on white. Let me confirm the console is clean, then hand off.Clean console. Let me reset the page to dark (its canonical theme) and hand off.

_[tool: done]_

Pronto. Comecei pela fundação e entreguei a referência viva do sistema.

**`styles/tokens.css`** — refundado e organizado por categoria (Marca · Tipografia · Espaçamento · Raios · Movimento · Superfícies · Cor · Componentes). Mantive todos os nomes de variável, então a conformação **cascateou automaticamente** para CRM, Comercial, Financeiro e Tarefas: 3 níveis de navy, raios 6/8/10/14, pesos 400/500, dourado restrito, primário sólido dourado.

**`LexIA - Design System.html`** — a página de referência, dark por padrão (com toggle p/ claro), entregando os 4 itens pedidos:
1. **Tokens** como variáveis CSS por categoria (superfícies, dourado+semânticas, tipografia, grade, raios, bordas, ícones, elevação).
2. **Biblioteca de componentes** na ordem do spec, cada um com estados — botões (5 estados × 4 variantes), formulários (6 estados), feedback/badges/toasts/tooltip/skeleton, navegação, tabela universal.
3. **Tela de Documentos completa** montada só com o sistema (prova), 1 único botão dourado.
4. **Guia do dourado** — 5 acertos × 5 enganos + critérios de aceitação.

Os **popups da LexIA** (sua prioridade) ganharam seção própria e foram conformados ao spec: paleta ⌘K com chips de modo + item focado (fill 8% + barra dourada de 3px), e a barra flutuante com **elevação por sombra, sem glow dourado**.

**Próximos passos sugeridos (cascata fina, fase 2):** os componentes JSX ainda têm valores inline fora do sistema que o token não alcança — `CrmBadge` usa `borderRadius:999` (deveria ser 6) e pesos 600/700; `LEX_TONES` no `crm-lexia-bar.jsx` ainda traz azul/violeta; a aurora dourada do bar ainda existe no app real. Posso varrer arquivo por arquivo para zerar isso quando quiser — diga se sigo pelo CRM ou por outro módulo.

## User

Varra arquivo por arquivo

## Assistant

_[tool: update_todos]_

Boa — vou varrer o módulo CRM arquivo por arquivo, começando por um passe global seguro nos valores inequivocamente fora do sistema (pesos 600/700 → 500, tamanhos quebrados → escala), e depois edições cirúrgicas nos pontos sensíveis (badges, tons da barra, aurora dourada).

_[tool: run_script]_

Passe global seguro primeiro — pesos e tamanhos quebrados em todo o `src/crm`:

_[tool: read_file]_

185 valores conformados. Agora as edições cirúrgicas. Vou reler o `crm-ui.jsx` (já alterado pelo passe) para casar as strings exatas:

_[tool: str_replace_edit]_

Agora as edições cirúrgicas no kit compartilhado — badges (raio 6, sem azul, dot 6px), remapear semânticas sem azul/violeta, estado vazio, toast (nível 3, sem navy, 5s, canto inferior direito):

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

`crm-ui.jsx` conformado. Agora o arquivo prioritário — `crm-lexia-bar.jsx`. Primeiro os tons (sem azul/violeta; geração = dourado, ações comuns = neutro):

_[tool: str_replace_edit]_

Agora removo a aurora e os glows dourados do bar (spec: "SEM glow dourado") e snapo os raios para 14:

_[tool: run_script]_

Snapo os gradientes dourados decorativos dos botões de envio para dourado sólido (spec: sem gradientes decorativos) nos dois arquivos de IA:

_[tool: str_replace_edit]_

`crm-spotlight.jsx` — adicionar a barra dourada de 3px no item focado (spec) e snapar o raio do modal:

_[tool: str_replace_edit]_

O bar unificado (`CrmBarRow`) deve ter a mesma barra dourada no item focado — vou padronizar:

_[tool: update_todos]_

Núcleo conformado. Vou verificar o CRM, com foco na barra da LexIA (prioridade) e na paleta:

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

O pill está limpo agora (sem glow dourado, só sombra sutil) e os badges estão com raio 6 + dot. A barra não abriu no clique — vou reabrir com mais tempo:

_[tool: get_webview_logs]_

_[tool: grep]_

A barra é difícil de abrir pelo driver de screenshot (eventos sintéticos do React). O pill está limpo e os badges conformados. Deixa eu checar o estado ativo da sidebar e os cabeçalhos de tabela das páginas, e confirmar que não há erro de JS:

_[tool: grep]_

Sem erros de JS. Vejo pontos restantes no shell — peso ativo 600 (ternário, escapou do passe), raios 9, e gradientes decorativos. Deixa eu checar se o orb FAB ainda é usado e conformar o shell:

_[tool: run_script]_

O orb FAB é código morto (substituído pelo pill). Vou conformar o shell — peso ativo, raios 9→8 e gradientes decorativos para sólido:

_[tool: grep]_

Agora o polimento final das páginas e do painel acoplado. Vou ajustar o letter-spacing dos cabeçalhos de tabela (0.05→0.08em, igual ao spec) e snapar raios grandes restantes:

_[tool: run_script]_

_[tool: save_screenshot]_

Polimento aplicado. Verificação final — vou abrir a barra da LexIA e a paleta para confirmar o visual conformado (sem glow, foco com barra dourada):

_[tool: update_todos]_

A barra da LexIA agora está **totalmente conforme**: sem aurora/glow dourado (só superfície acrílica + sombra sutil), item focado com **fill dourado + barra de 3px**, badge "Atenção" em âmbar, e ações comuns com containers neutros (dourado só na geração via orb). A varredura atingiu o objetivo.Varredura completa do módulo CRM. Resumo do que mudou, arquivo por arquivo:

**Passe global seguro (14 arquivos, 185 valores):** pesos 600/700 → 500 (regra de 2 pesos), tamanhos quebrados → escala (13.5→14, 12.5/11.5→12, 10.5→11, 27→25).

**`crm-ui.jsx`** — `CrmBadge`: raio 999 → 6, dot 5 → 6px, sem tom azul, tons remapeados aos tokens semânticos (verde/âmbar/vermelho/neutro). Consultivo/Reunião/Fazendo/P3 saíram do azul → neutro; Revisão → âmbar; Prazo/P2 saíram do dourado → âmbar (dourado é reservado). Estado vazio (ícone 32 + título 16 + desc 14), toast (nível 3, sem navy, 5s, canto inferior direito), busca (ícone 16).

**`crm-lexia-bar.jsx`** (prioridade) — `LEX_TONES` sem azul/violeta; geração = dourado, ações comuns = neutro; **aurora e glows dourados removidos** (spec: "SEM glow dourado"); pill com sombra sutil + borda 16%; item focado com fill 8% + **barra dourada de 3px**; raios → 14; gradientes de envio → dourado sólido.

**`crm-spotlight.jsx`** — modal 16 → 14, input 18 → 16, item focado com a mesma barra dourada de 3px.

**`crm-shell.jsx`** — sidebar ativa peso 500 (não 600), raios 9 → 8, mark/avatar de gradiente → cor sólida (sem gradiente decorativo).

**`crm-lexia.jsx` / `crm-settings.jsx`** — painéis/modais 20/18/16 → 14.

**Páginas** — cabeçalhos de tabela com letter-spacing 0.08em (igual ao spec).

Confirmado na tela: badges com raio 6 + dot, CTA único dourado, e a barra da LexIA limpa com foco identificável. Sem erros de JS.

**Próximo passo, quando quiser:** os outros módulos (`com/`, `fin/`, `finx/`, `tasks/`, `screens/`) ainda têm azul (`--crm-blue`), gradientes e pesos próprios — mesma receita de varredura. Diga por qual sigo.

## User

Faça todos

## Assistant

_[tool: update_todos]_

Beleza — mesma receita para todos os módulos restantes. Começo pelo passe global seguro (pesos, tamanhos) em `com/`, `fin/`, `finx/`, `tasks/`, `screens/` e `shell.jsx`:

_[tool: run_script]_

_[tool: grep]_

~615 valores. Agora os tons azul/violeta crus e os gradientes. Deixa eu mapear o que existe:

_[tool: run_script]_

Mapa claro. Vou cortar azul/violeta crus → neutro (status, prioridade, categorias, DoR) e solidificar os gradientes decorativos (marcas, avatares, barras de rateio), preservando os gradientes de data-viz (funil/gráficos):

_[tool: grep]_

Agora os badges raio 999 → 6 nos kits dos outros módulos. Deixa eu localizar (sem mexer em trilhas de progresso/dots que usam 999 legitimamente):

_[tool: run_script]_

Muitos `999` são legítimos (toggles, trilhas de progresso, contadores numéricos — que o spec permite como pílula). Vou conformar só os **badges de status** reutilizados de cada módulo (raio 6 + dot 6px), sem tocar em switches/barras/contadores:

_[tool: run_script]_

_[tool: run_script]_

O `FxStatusPill` está em `finx/fin-ui` (não `fin/`). Corrigindo:

_[tool: show_html]_

Conformação aplicada em todos os módulos. Agora verificação — vou abrir cada app para confirmar render limpo. Começo pelo Comercial:

_[tool: show_html]_

Comercial renderiza limpo (CTA dourada, KPIs verde/vermelho, avatar sólido). Vou checar Tarefas (onde tirei azul/violeta) e Financeiro Interativo:

_[tool: show_html]_

Tarefas limpo — categoria "Cível" agora neutra (azul removido), badges raio 6, sem violeta. Vou checar Financeiro Interativo e a geração de documentos:

_[tool: show_html]_

Financeiro Interativo limpo — status raio 6 com dots, sem azul. Vou checar a geração de documentos (LexIA.html) e o Financeiro estático:

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: get_webview_logs]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: show_html]_

O preview não está capturando agora, mas os logs confirmam render sem erros. Vou checar Financeiro estático e Form Variations pelos logs:

_[tool: save_screenshot]_

_[tool: get_webview_logs]_

_[tool: show_html]_

Financeiro estático limpo. Última — Form Variations:

_[tool: get_webview_logs]_

_[tool: update_todos]_

Todos os apps carregam limpos (só o aviso esperado do Babel, zero erros). Varredura completa em toda a suíte.Varredura concluída em **toda a suíte** (~620 valores em 35 arquivos + edições cirúrgicas). Surgindo o Comercial para você ver o resultado:

_[tool: done]_

Pronto — varredura completa em **todos os módulos**. Resumo do que mudou fora do CRM:

**Passe global (35 arquivos, ~615 valores):** pesos 600/700 → 500 e `weight={600}` → `{500}`; tamanhos quebrados → escala (13.5→14, 12.5/11.5→12, 10.5→11, 26/27→25). Atingiu `com/`, `fin/`, `finx/`, `tasks/`, `screens/` e `shell.jsx`.

**Azul & violeta cortados (→ neutro):** `tasks-data` (categoria Cível, status "Em andamento", prioridade P3 = `#2A6FDB`; categoria Operação interna = violeta `#7A6FA8`), `task-modal` (DoR), `crm-lexia`. Os `var(--crm-blue,…)` já caíam em neutro pelos tokens.

**Gradientes decorativos → cor sólida:** marcas e avatares do `shell.jsx` e do fluxo de documentos (`03-ai-chat`), avatar dourado do `fin-kit`, barras de rateio do `page-casos`. Gradientes de **data-viz** (funil, gráficos de fluxo) foram preservados — são preenchimento de dado, não decoração.

**Badges de status → raio 6 + dot 6px:** `FxStatusPill` (finx), `StatusPill`/`DocChip` (fin), `CmStageBadge` e chip de origem (com), `Tag` e chips (tasks), status do histórico, prioridade/valores do `plano-acao`. Switches, trilhas de progresso e contadores numéricos ficaram em 999 — o spec permite pílula para esses.

Verifiquei Comercial, Tarefas e Financeiro Interativo na tela (sem azul, badges raio 6, CTA dourada, avatares sólidos) e os demais por log — todos carregam sem erros de JS.

**Uma observação honesta de composição** (não é token, é layout): em telas como Comercial e Tarefas há **dois botões sólidos dourados** simultâneos — o da top bar (cluster global) e o CTA do cabeçalho de página. O critério #2 pede um por tela. Posso desativar o CTA redundante da top bar quando você quiser — é uma decisão de produto, então deixei pra confirmar.

