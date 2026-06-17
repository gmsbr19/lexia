# App Jurídico com IA

_Started 2026-06-11 10:50 UTC_

---

## User

Preciso de um design para o que lhe informarei a seguir e conforme os prints anexados de como o app é atualmente:
- Página de Clientes
- Página individual de cada cliente, onde podemos ver e alterar as informações dele. Deve ter tabs para seguir a identidade visual onde podemos ver as outras informações de tudo associado ao cliente: Financeiro, Tarefas, Casos, Contratos, Eventos, Documentos
- Página de Casos
- Página individual de cada caso (pode ser um Modal), com a opção de ver o financeiro desse caso e alterar a porcentagem de divisão entre os sócios
- Página de Contratos
- Página individual de cada Contrato
- Página de Agenda


A ideia do app é ser AI-first, então preciso que também atualize o app shell para incluir um popup bonito e moderno de conversar com a LexIA, com animações bonitas. Também faça o modal da função Buscar no estilo Spotlight da Apple

## Assistant

_[tool: list_files]_

_[tool: view_image]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

Let me explore the existing app structure to understand the design system.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: questions_v2]_

I've now got a thorough understanding of your LexIA design system — navy + gold, Apple-inspired, the `AppShell` (sidebar/topbar), the `Fx*` primitives (KPI cards, tabs, segmented controls, status pills, modal shell), and the light/dark token system. The screenshots map cleanly onto these patterns.

Before I build, a few structural decisions will shape everything. Let me ask:

## User

Questions answered:
- structure: Um único app interativo navegável (sidebar troca entre Clientes/Casos/Contratos/Agenda, clicar abre detalhe) — recomendado
- client_detail_format: Página inteira dedicada com header do cliente + tabs
- contract_detail_format: Modal (como o Caso)
- ai_popup_trigger: Botão flutuante dourado no canto inferior direito (sempre visível)
- case_split_interaction: Slider visual que balanceia mas que há "pontos que prendem" no 0, 50 e 100
- theme: Manter claro e escuro (toggle), como o resto do app
- variations: Não, uma direção sólida e coesa para tudo
- agenda_default: Tabs com todas as opções

## Assistant



## User

<pasted_text name="Pasted text (132 lines)">
# Prompt funcional para o Claude Design — Clientes/Casos/Contratos/Agenda + LexIA popup + Spotlight + Configurações

## Context

O usuário já enviou ao Claude Design o pedido visual (com prints) e as respostas de estrutura (app único navegável, detalhe de cliente em página com tabs, caso/contrato em modal, botão flutuante dourado da LexIA, slider de rateio com snap 0/50/100, tema claro/escuro, direção única, agenda com tabs de todas as visões). Falta o **prompt funcional**: o Claude (este projeto) é dono da funcionalidade, o Claude Design é dono do estilo. O prompt deve descrever **como tudo funciona** — campos reais, vocabulários de status, ações disponíveis, o que existe vs. o que é novo — sem ditar estética.

Decisões tomadas com o usuário nesta sessão:
- **UAC com 3 níveis**: `admin` / `socio` / `staff` (hoje o `User.role` só tem socio|staff e nada é aplicado nas rotas — o role `admin` é novo).
- **Agenda** = novo modelo `Evento` + tarefas com data/hora (modelo `Tarefa` existente) agregadas no calendário com cor distinta.

Fatos do código que ancoram o prompt (verificados):
- Modelos reais: `Cliente`, `Caso` (+`CasoResponsavel` rateio), `Honorario` (= "contrato"), `Lancamento`, `Conta`, `Tarefa`, `User(role socio|staff)`, `AuditLog`, `CustoFixo`. **Não existem** modelos `Evento` nem `Documento` (geração de documentos é download sem persistência — a tab Documentos do cliente assume persistência futura de metadados).
- Listas atuais: `/clientes` (read-only), `/casos` (rateio inline via modal), `/contratos` (lista de honorários). Rotas REST já existentes para pagar/reabrir honorário, rateio (`PATCH /api/financeiro/casos/[id]/responsaveis`), anonimizar cliente (LGPD), tarefas CRUD.
- Shell: sidebar tem busca "Buscar… ⌘K" (placeholder, sem implementação), item "Agenda" e botão "Configurações" com `href="#"`. Topbar: theme toggle, sino, UserChip/Sair. AIPanel (LexIA) existe só no editor de documentos, mock.
- Dinheiro = centavos inteiros exibidos como R$ pt-BR; 2 sócios (Leandro/Leonardo) como contas `kind:'socio'`; ~253 clientes, 129 casos, 298 honorários, 427 lançamentos reais.

## Entregável

Salvar o prompt abaixo em `docs/design/PROMPT-claude-design-clientes-casos-agenda.md` (pasta `docs/` já existe) e apresentá-lo ao usuário pronto para copiar/colar no Claude Design. Nenhum outro arquivo é alterado.

---

## O PROMPT (conteúdo final, PT-BR)

&gt; Segue abaixo o texto integral a salvar/enviar:

---

# LexIA — Especificação funcional para o design (Clientes, Casos, Contratos, Agenda, LexIA popup, Buscar, Configurações)

Você é responsável pelo design; esta especificação é responsável pela **funcionalidade**. Tudo aqui descreve dados e comportamentos reais do app (ou planejados) — use os campos e vocabulários exatamente como descritos, mas a forma visual é sua. O app é um sistema de gestão de escritório de advocacia (2 sócios + equipe), PT-BR, com tema claro/escuro já existente. Dinheiro sempre em R$ (pt-BR), datas em pt-BR. Volume real de dados: ~253 clientes, ~129 casos, ~298 contratos de honorários, ~427 lançamentos — listas precisam de busca, filtro e paginação/scroll confortáveis.

## 1. Papéis de usuário (UAC) — vale para TODAS as telas

Três papéis: **admin** (gestor do escritório), **sócio** e **staff**.
- **admin**: acesso total, incluindo todas as Configurações, gestão de usuários, auditoria e LGPD.
- **sócio**: tudo do dia a dia + financeiro completo (incl. acerto entre sócios e rateio); nas Configurações vê Financeiro/Escritório/Importação, mas NÃO Usuários &amp; permissões, Auditoria e LGPD.
- **staff**: opera clientes, casos, tarefas, agenda e documentos; NÃO vê valores agregados sensíveis (acerto entre sócios, DRE, rateio entre sócios); nas Configurações vê apenas Perfil e Aparência.

O design deve prever o tratamento de "sem permissão": itens simplesmente ocultos para staff (não cadeados espalhados), e na tela de Configurações as seções visíveis variam por papel.

## 2. Página de Clientes (lista)

Campos por linha: nome, apelido (opcional), tipo **PF | PJ**, classificação **cliente | lead**, CPF/CNPJ, cidade/UF, nº de casos. Funcional:
- Busca por nome/CPF-CNPJ; filtros por segmento (Todos / PF / PJ / Leads); contadores no topo (total, PF, PJ, leads).
- Ação primária "Novo cliente" (modal ou rota — sua escolha) com os campos cadastrais da seção 3.
- Clicar numa linha abre a **página individual do cliente**.

## 3. Página individual do Cliente (página inteira, header + tabs)

**Header do cliente**: nome + apelido, badges PF/PJ e cliente/lead, CPF/CNPJ, contatos (múltiplos e-mails e telefones), endereço (logradouro, número, complemento, bairro, cidade/UF, CEP), e um resumo numérico: casos ativos, total recebido, a receber, vencido. Todos os dados cadastrais são **editáveis** (modo de edição ou edição por campo — sua escolha). Ações do header: **Nova tarefa**, **Novo evento**, **Gerar documento**, e (apenas admin) **Anonimizar (LGPD)** — ação destrutiva que apaga dados pessoais mantendo o histórico financeiro; precisa de confirmação forte (digitar o nome, por ex.).

**Tabs** (identidade visual de tabs igual ao resto do app):
1. **Financeiro** — lançamentos e honorários vinculados ao cliente. KPIs do cliente (recebido total, a receber, vencido). Lista de lançamentos: direção entrada/saída, descrição, caso, categoria, vencimento, valor, status pago/aberto; ações: marcar pago / reabrir, "Novo lançamento" já vinculado ao cliente.
2. **Tarefas** — tarefas com vínculo a este cliente: título, status (a fazer / fazendo / revisão / concluída), prioridade P1–P4, prazo (cor de urgência), responsável (sócio). Criar tarefa pré-vinculada; clicar abre a edição da tarefa.
3. **Casos** — casos do cliente: título, tipo **consultivo | litígio**, status, responsável, soma de honorários. Clicar abre o **modal de Caso** (seção 5).
4. **Contratos** — honorários do cliente: descrição, vencimento, valor, status **lançado | recebido**, tipo **recorrente | parcelado | êxito | à vista**. Clicar abre o **modal de Contrato** (seção 7).
5. **Eventos** — eventos da agenda vinculados ao cliente (próximos e passados): título, tipo, data/hora, caso vinculado, responsável. Criar evento pré-vinculado.
6. **Documentos** — documentos gerados para o cliente: nome, modelo (ex.: Contrato de Honorários), formato (PDF/DOCX), data, status **rascunho | finalizado**; ações: baixar, abrir no editor, gerar novo (leva ao fluxo de geração existente).

## 4. Página de Casos (lista)

Campos: título, cliente, tipo **consultivo | litígio**, status, responsável, total de honorários (R$), nº de honorários, e o **rateio entre sócios** atual (ex.: "50/50", "70/30"). Funcional: busca; filtros (Todos / Com honorário / Sem rateio definido); paginação (~50/página). Clicar abre o modal.

## 5. Modal individual do Caso

Seções funcionais:
- **Dados do processo**: nº do processo, tribunal, vara, instância, tipo de ação, valor da causa, data de distribuição, última movimentação, status. Editáveis.
- **Financeiro do caso**: honorários vinculados (com status) + lançamentos do caso; totais recebido vs. em aberto.
- **Rateio entre sócios** (oculto para staff): exatamente 2 sócios (Leandro e Leonardo); percentuais que somam 100. Interação: **slider que balanceia os dois lados com pontos de atração ("snap") em 0, 50 e 100**, mostrando os dois percentuais e o reflexo em R$ sobre os honorários do caso; presets rápidos (100/0, 50/50, 0/100); salvar explícito.
- **Tarefas e eventos do caso** (listas compactas, criar pré-vinculado).

## 6. Página de Contratos (lista)

Cada "contrato" é um honorário. Campos: descrição, cliente, caso, vencimento, valor, status **lançado | recebido**, tipo **recorrente | parcelado | êxito | à vista**, conta de recebimento, data de pagamento. KPIs no topo: total contratado, recebido, em aberto (lançado), ticket médio. Busca + filtros (Todos / Recebidos / Lançados). Clicar abre o modal.

## 7. Modal individual do Contrato

- Detalhe completo: descrição, cliente (link p/ página do cliente), caso (link p/ modal do caso), valor bruto e líquido, tipo, vencimento, conta, responsável.
- Ações: **Marcar como recebido** (escolhendo conta e data de pagamento) e **Desfazer recebimento** — já existem no backend; editar campos; link para o lançamento financeiro gerado.
- Se parcelado/recorrente: mostrar a série de parcelas vinculadas com o status de cada uma.

## 8. Página de Agenda (nova)

Calendário do escritório. Itens de dois tipos, visualmente distintos:
- **Eventos** (novo): título, tipo **audiência | prazo | reunião | outro**, data/hora início–fim ou dia inteiro, local ou link de vídeo, descrição, vínculo opcional a cliente e/ou caso, responsável (sócio), status (confirmado/cancelado).
- **Tarefas com data/hora** (do módulo de tarefas existente): aparecem no calendário como itens secundários; clicar abre a tarefa.

Visualizações em **tabs: Mês / Semana / Dia / Lista** (lista = próximos compromissos agrupados por dia). Funcional: criar evento por clique em slot vazio e por botão "Novo evento"; editar via modal; arrastar para remarcar nas visões semana/dia; filtro por responsável e por tipo; indicador de "hoje". Tipos com cor semântica consistente (audiência e prazo são os críticos do dia a dia jurídico).

## 9. App shell — popup da LexIA (AI-first)

Botão flutuante **dourado** no canto inferior direito, sempre visível em todas as páginas, com animação de presença (idle sutil, micro-interação ao abrir). Abre um **popup de chat moderno** (não página): 
- Thread de conversa com a LexIA (avatar/identidade dourada já usada no app), composer com textarea, estado "pensando"/streaming animado.
- **Chips de sugestão contextuais à página atual** (ex.: em /financeiro: "Quem está devendo há mais de 60 dias?"; na página de um cliente: "Resuma a situação deste cliente").
- Respostas podem conter **cards de ação** (ex.: link para um lançamento, botão "Criar tarefa"), não só texto.
- Histórico de conversas (lista de conversas anteriores, nova conversa).
- O backend será ligado depois — desenhe os estados completos (vazio/boas-vindas, digitando, resposta com ações, erro).

## 10. App shell — Buscar (estilo Spotlight)

O campo "Buscar… ⌘K" da sidebar e o atalho **⌘K / Ctrl+K** abrem um **modal central estilo Spotlight da Apple**: um campo único grande, resultados ao vivo abaixo, agrupados por tipo — **Clientes, Casos, Contratos, Tarefas, Lançamentos, Páginas/Ações** (navegação: "Ir para Financeiro", ações rápidas: "Nova tarefa", "Novo lançamento", "Novo evento"). Navegação 100% por teclado (↑↓ percorre, Enter abre, Esc fecha, Tab alterna grupos). Estados: vazio (sugestões recentes + ações rápidas), digitando, sem resultados. Cada resultado mostra metadados úteis (ex.: cliente → cidade e nº de casos; contrato → valor e status).

## 11. Modal de Configurações (novo) — com UAC

Abre pelo botão "Configurações" da sidebar. Layout com navegação interna por seções; **as seções visíveis dependem do papel** (admin vê todas):

| Seção | Quem vê | Conteúdo funcional |
|---|---|---|
| **Perfil** | todos | nome, e-mail, alterar senha |
| **Aparência** | todos | tema claro / escuro / sistema |
| **Usuários &amp; permissões** | admin | lista de usuários (nome, e-mail, papel admin/sócio/staff, ativo); criar usuário, editar papel, ativar/desativar, redefinir senha |
| **Financeiro** | admin + sócio | **Custos fixos &amp; pró-labore**: CRUD (nome, valor, categoria pró-labore/operacional, dia de vencimento, conta, ativo) — alimenta DRE e ponto de equilíbrio; gestão de contas (renomear, ativar/desativar) |
| **Escritório &amp; documentos** | admin | dados do escritório usados nos documentos gerados (razão social, endereço, dados bancários, timbrado/logotipo) |
| **Importação &amp; integrações** | admin | reimportação do backup Astrea e importação de leads (CSV Genions), com status/data da última importação |
| **LGPD &amp; Auditoria** | admin | atalho para anonimização de cliente; trilha de auditoria (quem, quando, ação, entidade — lista somente leitura, filtrável) |

## 12. Observações transversais

- Status sempre com os vocabulários exatos citados (ex.: honorário é **lançado | recebido**, nunca "pendente/pago").
- Toda lista grande precisa de estado vazio desenhado (com CTA) e estado de busca sem resultados.
- Vínculos são navegáveis em ambas as direções (do caso para o cliente, do contrato para o caso, da tarefa para o cliente…).
- Mutações dão feedback via toast (sistema de toast já existe no app).
- Tema claro/escuro: ambos os modos para todas as telas novas.

---

## Verificação

1. Usuário lê o prompt salvo em `docs/design/PROMPT-claude-design-clientes-casos-agenda.md` e confere se a divisão de permissões e os comportamentos batem com a intenção.
2. Usuário cola o prompt no Claude Design (que já tem os prints e as respostas de estilo).
3. Nada roda no app — sem código, sem migração (o role `admin`, o modelo `Evento` e a persistência de `Documento` só serão implementados quando o design voltar).
</pasted_text>

## Assistant

_[tool: read_file]_

The user has handed me the full functional specification. I have everything I need: structure, behaviors, vocabularies, UAC roles, and the earlier style answers. Let me check the finance store for reusable formatting helpers, then start building.

_[tool: update_todos]_

This is a comprehensive build. Let me lay out the plan.

_[tool: write_file]_

Starting with the data store — the foundation everything else reads from.

_[tool: write_file]_

Now the shared UI primitives and derived selectors.

_[tool: write_file]_

Now the interactive shell — clickable sidebar, topbar, role switcher, and the floating LexIA button.

_[tool: write_file]_

Now the Spotlight-style search modal with full keyboard navigation.

_[tool: write_file]_

Now the LexIA chat popup — the AI-first centerpiece with animated states and contextual suggestions.

_[tool: write_file]_

Now the Settings modal with role-gated sections.

_[tool: write_file]_

List pages now. Clientes first.

_[tool: write_file]_

Now the client detail page with header and all six tabs.

_[tool: write_file]_

Now Casos list plus the Caso modal with the rateio slider (snap at 0/50/100).

_[tool: write_file]_

Now Contratos list and the Contrato modal.

_[tool: write_file]_

Now the Agenda — the most involved page, with Mês/Semana/Dia/Lista views, filters, and drag-to-reschedule.

_[tool: write_file]_

Now the app root that wires state, navigation, mutators, and all overlays.

_[tool: write_file]_

Now the HTML entry with animations and styling.Let me render it and check for errors.

_[tool: show_html]_

_[tool: show_html]_

The Clientes page renders cleanly and matches the design language. Let me check console logs, then quickly verify the other key views.

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

No errors. Let me verify the key interactive surfaces — case modal, agenda, LexIA popup, and dark theme.

_[tool: save_screenshot]_

_[tool: eval_js]_

The case list looks excellent. The second frame shows the backdrop but no modal card — let me check whether the modal errored.

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: save_screenshot]_

The modal is rendering fine (720×784) — the earlier capture was mid-animation. Let me screenshot it now.

_[tool: eval_js]_

_[tool: screenshot_user_view]_

The card is fully painted in the live DOM (opacity 1, on-screen) — the capture tool just drops subtrees under `backdrop-filter`. Let me confirm via the user-view pixel capture.

_[tool: eval_js]_

That's the user's other tab (the old Financeiro file) — my new file is separate. The modal works in live DOM. Let me capture the Agenda (no backdrop-filter, so it'll render) and exercise LexIA/Spotlight to check for errors.

_[tool: save_screenshot]_

_[tool: eval_js]_

Agenda looks great. But the sidebar shows "Casos" highlighted while we're on Agenda — let me check the active-state logic.

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

Confirmed — that was just capture timing; the active state is correct. Let me verify the LexIA popup and Spotlight render cleanly.

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

Found a real robustness issue: in a backgrounded/throttled preview, the entrance animations freeze at frame 0 (`opacity:0`), leaving the LexIA panel and modals invisible. The fix is to animate transform only and keep opacity at 1 — motion stays, but content is never stuck invisible.The Spotlight also uses `crm-pop-in` so it's covered. Let me reload and verify the LexIA panel now renders.

_[tool: show_html]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

LexIA popup is gorgeous — contextual chips, gold identity, composer. Let me confirm the chat flow (thinking → reply → action card) and Spotlight.

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: update_todos]_

Everything works — chat thread, contextual chips, animations, navigation, modals. Let me mark the work complete and hand off.

_[tool: done]_

_[tool: fork_verifier_agent]_

Pronto. Construí um app único navegável seguindo a identidade visual do LexIA (navy + dourado, primitivos `Fx*`, temas claro/escuro).

**`LexIA - Clientes, Casos & Agenda.html`** — tudo numa peça interativa:

- **Clientes** — lista com KPIs, busca, filtros (Todos/PF/PJ/Leads); clique abre a **página do cliente** com header editável e 6 tabs: Financeiro, Tarefas, Casos, Contratos, Eventos, Documentos (com estados vazios e ações pré-vinculadas).
- **Casos** — lista com rateio inline; o **modal do caso** traz dados do processo, financeiro do caso e o **slider de rateio com pontos de atração em 0/50/100** + presets, refletindo os valores em R$ ao vivo.
- **Contratos** — lista de honorários (KPIs total/recebido/lançado/ticket) e **modal do contrato** com parcelas, marcar/desfazer recebimento e links para cliente/caso.
- **Agenda** — tabs **Mês / Semana / Dia / Lista**, eventos por cor (audiência, prazo, reunião, outro) + tarefas como itens secundários, filtros por responsável/tipo, criar por clique no slot e **arrastar para remarcar** em Semana/Dia.
- **Shell AI-first** — orb dourado flutuante que abre o **popup da LexIA** (boas-vindas, chips contextuais à página, estado "pensando" animado, cards de ação, histórico) e a **busca estilo Spotlight** (⌘K, navegação por teclado, resultados agrupados).
- **Configurações** com seções que aparecem conforme o **papel** (admin/sócio/staff) — há um seletor de papel na topbar para você testar as permissões; também respeitam o rateio oculto para staff e a anonimização LGPD com confirmação por digitação.

Notas: os dados são um seed realista (persistido em localStorage); criar cliente/tarefa/lançamento são formulários funcionais que confirmam via toast (sem persistir, à espera do backend). Um agente de verificação está rodando em segundo plano e me avisa se achar algo.

Quer que eu detalhe a **Semana/Dia** da agenda com mais densidade, ou ajuste algum vocabulário/campo antes de seguir?

