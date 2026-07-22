# CLAUDE.md — Lexia (concise, token-efficient)

## 1. Purpose
Lexia is the office's own management system (Next.js 16 / React 19 / TypeScript).
Modules: document generation (DOCX/PDF "Contrato de Honorários"), Financeiro
(seeded from the Astrea backup), Comercial/Marketing, Clientes, Contratos,
Casos & Processos (prazos/andamentos), Agenda, Tarefas, the Início dashboard, the
LexIA AI assistant, and a real-time Notifications system.

## 2. Language policy
- English for tool prompts, reasoning, and code comments.
- Legal/user-facing text in PT-BR unless asked otherwise.

## 3. Stack & data layer
- Prisma + SQLite (`prisma/schema.prisma`, `src/lib/db`). Money = integer
  centavos; enums = string unions; `astreaId @unique` for idempotent re-import.
- Setup: `npm install` → `npm run db:migrate` → `npm run db:generate` →
  `npm run db:seed` (reads `ASTREA_BACKUP_DIR`). Extra seeds: `db:seed:{socios,
  rateio,comercial,feriados}`, `db:import:genions`. Boot env validated in
  `src/lib/env.ts` (`.env.example` documents every var).
- Windows: `next dev` LOCKS the Prisma engine DLL — STOP it before
  `db:migrate`/`db:generate` (memory `reference_prisma_dev_lock`).

## 4. Auth, RBAC & the mutation choke point
- Auth.js v5 credentials; `/login`; `src/proxy.ts` gate. Dev user
  `thiago@lexia.local` / `lexia-dev-2026` — REPLACE before deploy.
- Roles `admin|socio|advogado|estagiario|financeiro|staff` (admin implicit-passes);
  `requireUser`/`requireRole`/`assertRole`/`guardRequest` in `lib/auth/session.ts`.
- EVERY write goes through `runMutation` (`lib/finance/api.ts`): session → role
  gate → rate-limit → mutation → audit (`AuditLog`) → `{ok,result}`. Client calls
  via `apiSend` (`lib/client/api.ts`: in-flight lock, retry-once, 401→/login,
  `requestId` idempotency). Memory `project_production_hardening`.

## 5. Shell & styling
- ONE shell for every route: `app/layout.tsx` → `components/shell/UnifiedShell.tsx`
  (sidebar `unified-nav.ts` + topbar route-tabs + history arrows + bell + global
  LexIA bar + Settings). Renders bare on `/login`. App wrapped in `.crm-scope`
  (bridge vars == app tokens). Memory `project_redesign_backend`.
- Visuals: Radix + vanilla-extract; follow `src/styles/{tokens,theme}.css.ts`
  (3 navy surfaces, weights 400/500, radii 6/8/10/14, accent vs accentStrong,
  acrylic `--lex-acrylic*`/`--lex-blur`). Memories `project_design_system`,
  `project_acrylic_surfaces`. Shell + notification atoms use inline styles bound
  to the same tokens (consistent with the bell/toast family).

## 6. Modules (read lib/ + components/ for detail)
- **Documents**: AST builder `lib/documents/generators/contrato-honorarios/content.ts`
  + docx/html/pdf renderers; editor = form + A4 preview + AI dotted-path patch;
  lifecycle rascunho→finalizado→enviado→fechado; `fecharContrato` fans honorários
  into a-receber Lançamentos + a Honorário (memory `project_documents_module`).
- **Financeiro**: `/financeiro` 7 tabs; the `Lancamento` ledger is the source of
  truth (centavos; `isAnomalia` excluded); rateio/acerto entre sócios
  (`CasoResponsavel`, 50/50 default). Memories `project_financeiro_*`.
- **Comercial**: `/comercial` 5 tabs; `Campanha`+`Lead`; ad-spend→Lançamento;
  convert lead→Honorário; Genions CSV import.
- **Clientes / Contratos / Casos & Processos / Agenda**: CRM routes via
  `components/crm/CrmRoutes.tsx`; cliente detail = `/clientes/[id]`. Processos =
  first-class (1 caso→N), pure tested prazo engine (CPC dias úteis), CNJ capture
  (Comunica/DJEN + DataJud). Memories `project_processos_module`, `project_captura_cnj`.
- **Tarefas**: DB-backed, 5 views + modal; assignee + (new) creator. Memory
  `project_tarefas_module`.
- **Início**: greeting + AI BriefingCard + OfficeDashboard. Memory
  `project_inicio_dashboard`.
- **LexIA**: agentic assistant over the Anthropic API (`lib/lexia/agent/*`:
  loop+registry+router Haiku/Sonnet/Opus); mutations confirmation-gated. **3 acrylic
  surfaces** (`components/lexia/*`): orbe lançador → Chat IA flutuante
  (flutuante/lateral/tela-cheia), Spotlight ⌘K (busca + iniciar conversa), e menu de
  Configurações + modal de Personalização. Prefs por usuário (`User.lexiaPrefs`):
  persona + instruções + modo (agente/pergunta/plano) + modelo (auto/rápido/avançado)
  + auto-mode. Degrades without `ANTHROPIC_API_KEY`. Memories `project_lexia_agent`,
  `project_lexia_bar`.
- Collection memory per client + accent-insensitive search: memories
  `project_cobranca_memoria`, `reference_search_accent_insensitive`.

## 7. Notifications (real-time) — NEWEST
- **Model** `Notificacao` (per `userEmail`): `tipo/modulo/prioridade/refTipo/refId/
  mensagem/link/actorEmail/grupoKey/contador/lida`, `dedupeKey String? @unique`
  (cron idempotency; event-driven inserts pass null). `Tarefa.criadoPorId`
  (delegation FK); `User.notifPrefs` (JSON: per-module app/email channels +
  navegador + emailMinPrioridade). Migration `20260615120000_notificacoes_realtime`.
- **Transport = SSE** via an in-process EventEmitter bus pinned on `globalThis`
  (`lib/notificacoes/bus.ts`); route `GET /api/notificacoes/stream` (runtime
  nodejs, heartbeat, abort cleanup, 401-probe→/login). Client
  `components/shell/NotificacoesStream.tsx` (EventSource + backoff + re-hydrate)
  → shared zustand `lib/notificacoes/store.ts` (badge anchored by the SSE `init`
  count, kept by deltas) → bell + acrylic toast + native browser notif +
  `/notificacoes` history page. WebSocket rejected (one-directional, single server).
- **Single write path** `lib/notificacoes/service.ts` `criarNotificacao`
  (dedupe / grupoKey-coalesce / create + per-recipient prefs + best-effort email),
  used by the cron `lib/processos/notificacoes.ts` (now pushes live + a Lembretes
  pass) AND by the typed fire-and-forget `triggers.ts` (a notif failure NEVER
  breaks the business mutation). Helpers: `recipients.ts`, `preferencias{,-core}.ts`,
  `links.ts`, `map.ts`, `queries.ts`, `email/{mailer,render,enviar}.ts`.
- **Events** wired into module mutations (actor threaded from routes + LexIA tools):
  Tarefas (create/assign→executor, conclusão→criador), Agenda (responsável),
  Processos (prazo confirmado/cumprido), Comercial (lead→ganho→gestores),
  Documentos (enviado/fechado→criadoPor+gestores), Sistema (falha de captura).
- **E-mail**: pluggable `Mailer` (Microsoft Graph / nodemailer SMTP / noop —
  degrades without config); `getMailer()` escolhe por `MAIL_PROVIDER`
  (auto→graph se `GRAPH_*` setado, senão smtp, senão noop). Graph = client
  credentials (`lib/graph/token.ts`, cache) + `POST /users/{GRAPH_MAIL_SENDER}/
  sendMail` (permissão de app Mail.Send). Opt-in per module; goes only to the
  recipient's `User.email`; env `GRAPH_*`/`SMTP_*` + `APP_BASE_URL` (`.env.example`).
- **UI**: Configurações → **Notificações** (per-module app/email toggles + browser
  permission + severity) and **Debug & simulação** (admin-only) which fires a real
  notification through the entire path. Routes: `/api/notificacoes/{stream,history,
  marcar-todas,preferencias,simular,[id]/lida}`.
- **Method**: direct build + 1 adversarial review workflow (4 dims, per-finding
  verify) → **10 confirmed findings fixed** (badge anchor vs loaded slice; coalesce
  anti-spam under muted app; cron dedupeKey per-recipient; Zod `partialRecord`;
  doc-enviar transition guard; coalesce TOCTOU lock; replace double-count; SSE 401
  loop→login; cross-tab read sync; generic prazo PATCH now notifies). **198 tests
  green** (16 new: links/prefs+schema/email/bus).
- **Redesign (Apple-style, from Claude Design "Clientes, Casos & Agenda")**: shared
  visual layer `components/shell/{notif-ui.ts,NotifTile.tsx,NotifRow.tsx}` (tom→cor,
  ícone, tempoRelativo, bucketTempo; gold reserved for IA). Toasts + bell dropdown +
  `/notificacoes` page rewritten to tile cards; **acrylic kept** on dropdown+toasts
  (`--lex-acrylic-strong`/`--lex-blur`); smooth EXIT via `motion` AnimatePresence
  (entrance stays transform-only). New **`ia` (LexIA) module** added across
  types/schemas/links/notif-ui (modulo is `String?` → NO migration). Toast store now
  **coalesces by notif.id** (atualizada reuses the visible card). Memory
  `project_notifications`.
- **LexIA-done (background completion)**: when a LexIA turn finishes with the bar
  CLOSED, `LexiaBar`→`useLexiaStream.onComplete` POSTs `/api/lexia/notificar-conclusao`
  → `notificarLexiaConcluiu` → `criarNotificacao(modulo:"ia")` → toast+bell. Gated by
  `watchingRef` (open||embedded) + skips when `pendente` (paused for confirmation);
  resumo = user prompt (or confirm card resumo on decide-resume). Link reopens the
  conversa.

## 8. Mandatory rules
- Confidence ≥95% before implementing; else ask targeted questions.
- Never invent legal requirements or clauses.
- Follow the design tokens; every AI surface must degrade without `ANTHROPIC_API_KEY`.
- The USER does visual verification — don't run dev/build (memory `feedback_verification`).
- Soft-delete (`excluidoEm`) must cascade + reads must filter `parent.excluidoEm`.

## 9. Token-economy & architecture
- Short, actionable messages; read files in focused batches; reference code instead
  of copying large blocks; ask ONE clarifying question when unclear.
- Respect folders `app/ components/ lib/ styles/`; keep content-gen / renderers / UI
  separate; small testable functions; tests in `tests/` (vitest, `npm test`).

## 10. Next.js caution
This Next (16.2.6) has breaking changes vs. training data — consult
`node_modules/next/dist/docs/` (and `AGENTS.md`) before any framework-level change
(streaming route handlers, caching, runtime).

## 11. Latest state & user action
- **Comercial v2 — redesign COMPLETO das abas Follow-up + Leads + Campanhas a partir do handoff do Claude
  Design "LexIA - Comercial v2" (lexia2.zip → src/com2/cx-*.jsx, 11 arquivos) (this session, VERIFIED tsc 0,
  633/633 testes, eslint sem achados novos — só o warning pré-existente `big` do cm-kit —, build de produção
  limpo, servidor parado→buildado→religado, health 200; NO migration)** (memory `project_comercial_crm`).
  Pedido: o usuário achou a tela de Follow-up (build da sessão anterior) "muitíssimo feia" → gerei um prompt
  de inventário funcional p/ o Claude Design (sem orientação visual) cobrindo Follow-up+Leads+Campanhas → o
  design voltou como "Comercial v2" e foi portado com fidelidade absoluta, preservando TODA a fiação real
  (REST/optimistic/scores derivados do score.ts). **Arquivos novos:** [cx-kit.tsx](src/components/comercial/cx-kit.tsx)
  (primitivos v2 tipados: CxModal centrado com ícone, CxMenu/MenuItem, CxSegmented, CxQualBadge — Estado A/B/C/D
  → Quente/Morno/Frio/Desqualificado com ícones flame/sunrise/wifiOff/minusCircle —, CxMeter Fit dourado/Eng
  azul, CxAvatar com cor determinística por id, CxPhone com copiar, CxStagePill via usePipelineStore,
  CxPeriodBar com botão "Atual", CxRadioList, CxTh/CxNum/CxEmpty/CxField/CxInput/CxSelect/CxMoneyInput,
  helpers cxRelDay/cxDaysTo/cxCopy, metas CX_CANAIS/CX_RESULTADOS/CX_ATIV_TIPOS/CX_TEMPERATURAS) e
  [cx-leads-model.ts](src/components/comercial/cx-leads-model.ts) (núcleo PURO do grid v2: CX_COLS 16 colunas
  c/ vis default, operadores por tipo, cxEvalRule/cxApplyRules E/OU, cxColValue — money em REAIS p/ filtro —,
  cxEnumValues dinâmico, CSV ; da visão). **Reescritos:** [CmFollowUp.tsx](src/components/comercial/tabs/CmFollowUp.tsx)
  (cards ricos rankeados #n + prioridade dourada, barra lateral 4px na cor da etapa — vermelha se vencido —,
  chips Reunião marcada/Contrato enviado, medidores Fit/Eng, faixa "Próximo toque" com dia relativo + canais +
  selo VENCIDO, **quick actions CONTEXTUAIS** — Compareceu/No-show só com reunião marcada; Respondeu proposta
  só em etapa proposta/contrato enviado —, toggle de contrato, seção recolhível "Perdidos automaticamente",
  filtros responsável+`Sem responsável`/qualificação/só-vencidos com contagem); [CmLeads.tsx](src/components/comercial/tabs/CmLeads.tsx)
  (grid v2 SOB MEDIDA no lugar do DataGrid genérico: FilterBuilder popover multi-regra E/OU, Agrupar,
  seletor de Colunas c/ fixas, seleção tri-state + CxBulkBar dourada — etapa/responsável/temperatura/área/
  exportar —, sort por cabeçalho, grupos com contagem+soma estimada, skeleton 650ms, menu Importar com 2
  fluxos descritos, **persistência da view em localStorage `lexia-cx-leadsview-v1`** como no design — o
  useCrmSavedView/DataGrid saem desta tela; injectFilter vira ajuste-durante-render, sem efeito);
  [CmKanban.tsx](src/components/comercial/CmKanban.tsx) (colunas sticky com pill colorida+contagem+soma,
  cards com temp chip + qual badge + telefone copiável + campanha + avatar/valor, placeholders tracejados,
  drop em Ganho/Perdido abre os fluxos); [CmModals.tsx](src/components/comercial/CmModals.tsx) (TODOS os
  modais no CxModal v2: **CmLeadModal 720px** com abas "Dados & Perfil"/"Histórico · n" no editar, perfil de
  qualificação em LINHAS de botões por critério (config real do scoring), preview de Fit no rodapé E na
  seção, WhatsApp wa.me/55 quando ≥10 dígitos, aviso warn ao escolher etapa Ganho; **CxHistoryPanel** com
  quick-add tipo+resultado+texto e timeline com badges toque/resultado/sinais + excluir; **CmToqueModal**
  com canal em chips, nº sugerido, resultado OBRIGATÓRIO em 3 cartões com estado de erro, sinais em pílulas
  da config, nota, box explicativo; Converter/Mesclar (busca+Trocar)/Perdido (CxRadioList crit)/Campanha
  (cards de plataforma com check)/Gasto/Importar Genions/Importar Meta com tiles de resumo CxImportSummary);
  [CmImportMap.tsx](src/components/comercial/CmImportMap.tsx) (grade de mapeamento 3 colunas Coluna/Exemplo/
  Campo + validação "Mapeie a coluna do nome" no rodapé + tiles de resumo);
  [CmCampanhas.tsx](src/components/comercial/tabs/CmCampanhas.tsx) (cabeçalho com h1+subtítulo com
  investido/ROAS p/ verFin, CxPeriodBar DENTRO da tela, filtros segmented status/plataforma + área, tabela
  com CxPlatformMark/CxStatusChip pulse, rodapé de totais agora também com ROI agregado, nota "valores
  ocultos p/ seu perfil" quando !verFin); [ComercialApp.tsx](src/components/comercial/ComercialApp.tsx)
  (ordem de abas do design: Visão·Funil·**Follow-up**·Leads·Campanhas·Exportar com badges vencidos/abertos
  via cmLeadScores; CmPeriodBar só em Visão/Funil/Exportar; banner da aba Leads removido; quick actions
  do follow-up com semântica do design — compareceu=positiva+sinal, noshow=sem_resposta+no_show,
  proposta=positiva+respondeu_proposta; LastImport ganhou fonte+campanhas). [cm-icons.tsx](src/components/comercial/cm-icons.tsx)
  +23 ícones lucide (calendarClock/fileCheck/thumbs/sunrise/wifiOff/kanban/sliders/layoutGrid/send/repeat/
  building/eye/trash2/circleDot/link2/list/minus/minusCircle/flame/zap/scale/alertCircle/filter);
  [cm-theme.css](src/components/comercial/cm-theme.css) ganhou o bloco v2 (.cx-row/.cx-follow-card/
  .cx-linkname/.cx-kcard/.cx-hist-item/.cx-menu-item/.cx-stagebtn/.cx-copybtn/.cx-pop/.skeleton/.btn-danger);
  CmTabs alinhado ao v2 (padding 32/altura 46/ativo 600). **Não tocados:** Visão geral/Funil/Exportar (v1),
  DataGrid genérico (Contatos segue usando), rotas/schemas/score.ts (zero mudança de backend). **Achado a
  registrar:** a view salva do grid de Leads saiu do server view-prefs (gridId "oportunidades" fica dormente)
  → localStorage, fiel ao design. **User action:** só visual — `/comercial`: aba Follow-up (cards rankeados,
  registrar toque, quick actions contextuais, perdidos automáticos), Leads (Tabela: filtros E/OU, agrupar,
  colunas, lote, CSV; Quadro: arrastar; editor com Perfil+Histórico), Campanhas (período no cabeçalho,
  totais com ROI). Credenciais dev do §4 seguem obsoletas — logar com o usuário real.
  **Polish pós-visual (mesma sessão, VERIFIED tsc 0 + eslint limpo + build limpo + servidor religado):**
  (1) **scrollbars v2** — bloco novo no [cm-theme.css](src/components/comercial/cm-theme.css) escopado ao
  `.cm-scope`: 6px/8px, trilho transparente, polegar VERTICAL invisível até o hover do contêiner
  (`*:hover::-webkit-scrollbar-thumb:vertical`), HORIZONTAL sempre visível (tabela/kanban precisam da pista);
  **WebKit apenas — NUNCA setar `scrollbar-width`/`scrollbar-color` junto: no Chrome ≥121 as props padrão
  DESLIGAM os pseudo-elementos `::-webkit-scrollbar`** (Firefox recebe fallback fino sempre-visível via
  `@supports (-moz-appearance:none)`). (2) **glassmorphism padrão do app** nos popups v2: `CxModal` virou
  `lexGlass` + `glassElevation("0 40px 100px …")` com overlay TRANSPARENTE (padrão do CrmModal/CmModal;
  saiu o `--overlay`+blur próprio do protótipo) + `useModalGuard()`; dropdowns `CxMenu` viraram
  `card lexGlassStrong` + `glassElevation("0 12px 28px …")` (padrão dos row-menus do app).
  **(3) checkbox da tabela de Leads redesenhada** (mesma sessão): `CxCheckbox` ([cx-kit.tsx](src/components/comercial/cx-kit.tsx))
  deixou de ser `<input>` nativo (`accentColor`) e virou `<button role="checkbox">` nos tokens do app — vazio/
  transparente por padrão, preenchimento `var(--accent-strong)` + glifo `check`/traço (indeterminate) quando
  marcada, anel `focus-visible` dourado; **some por padrão e só aparece no hover da linha/cabeçalho OU quando
  qualquer seleção está ativa na tabela** — classe `.cx-check` nova em [cm-theme.css](src/components/comercial/cm-theme.css)
  (`opacity:0` → 1 em `.cx-row:hover .cx-check`/`thead th:hover .cx-check`/`.cx-check.on`/`:focus-within`; o
  `on` é setado pela própria linha/cabeçalho quando `selected || anySel`/`sel.size>0`). Sem mudança de dado —
  só o control visual (checked/indeterminate/onChange idênticos ao antigo).
  **(4) Performance: carga e render do módulo Comercial (Leads/Kanban/Follow-up) — plano de 2 fases aplicado
  integralmente (mesma sessão, VERIFIED tsc 0, 633/633 testes, eslint sem achados novos, build de produção
  limpo, NO migration).** Sintoma: abrir a aba Leads carregava TODOS os leads (420 no dev.db real) de uma vez
  e renderizava todas as linhas sem cap, travando o clique. **Fase 1 — render (client, sem tocar servidor/API):**
  removido o skeleton FALSO de 650ms (`setTimeout`) herdado do protótipo — os dados já estão em memória, pinta
  instantâneo; busca da tabela de Leads em `useDeferredValue`; **render incremental** nas 3 superfícies — tabela
  de Leads `PAGE=100` (modo agrupado gasta um **orçamento corrente** entre os grupos em ordem: cabeçalho de
  grupo sempre mostra contagem/soma CHEIAS, linhas param quando o orçamento acaba; "Mostrar mais (N restantes)"
  com N derivado de `rows.length − renderizadas`, nunca de `shown` isolado — evita off-by-one no agrupado),
  Kanban `COL_CAP=30`/coluna (+ "Mostrar mais" por coluna, cabeçalho sempre com a contagem/soma cheia da
  coluna), Follow-up `FOLLOW_CAP=30` (+ "Mostrar mais"); **invariantes de conjunto cheio preservados**:
  `filtered`/`sorted` nunca são cortados — só o que é PINTADO tem cap; CSV exporta o conjunto filtrado inteiro;
  select-all/lote continuam operando sobre TODAS as linhas filtradas (não só as renderizadas). **Memoização** —
  `CxLeadRow`/`CxKanbanCard`/`CxFollowCard` viraram `React.memo`; callbacks estabilizados com `useCallback`
  em cascata até [ComercialApp.tsx](src/components/comercial/ComercialApp.tsx) (`openLeadEdit`/`openConverter`/
  `openPerdido`/`openMesclar`/`openToque`/`onQuick`/`onToggleContrato`/`onReabrir`, + `submitQuick`/
  `submitContrato`/`submitReabrir`/`refresh` estabilizados — `refresh` depende só de `revalidate`, que é a
  função module-level estável `revalidateShared` de [useComercialData.ts](src/lib/client/useComercialData.ts));
  `useOptimisticRows`'s `getId` também virou estável (`getLeadId` com `useCallback([])`) para que `applyLocal`
  (e por consequência `moveEtapa`/`reopen`) parem de mudar de referência a cada render; `CxKanbanCard` trocou
  `usuarios.find(...)` por card por um `userMap: Map` construído 1× no `CmKanban`; `CxFollowCard` perdeu as
  **2 assinaturas zustand POR CARD** (`usePipelineStore`/`useAreasStore`) — hoisted para 1 assinatura no
  `CmFollowUp`, que resolve `stageColor`/`areaLabel` por linha e passa como string já pronta. **`cmLeadScores`
  único** — antes computado 3× independentes (ComercialApp p/ badges, CmLeads, CmFollowUp, mesmas deps); agora
  só o `ComercialApp` computa e passa `scores`+`hoje` como PROPS p/ `CmLeads`/`CmFollowUp` (que perderam suas
  próprias `useScoringStore`/`cxToday()` locais). **Reset do cap sem `useEffect`** — o eslint `react-hooks/
  set-state-in-effect` do repo rejeitou `useEffect(() => setShown(PAGE), [deps])`; resolvido com o mesmo padrão
  já usado no `injectFilter`/`lastNonce` desta tela: comparação de um "último sinal" DURANTE o render (`if
  (sig.some((v,i) => v !== lastSig[i])) { setLastSig(sig); setShown(PAGE) }`), sem efeito. **Fase 2 — payload
  do servidor** ([queries.ts](src/lib/comercial/queries.ts) `getComercialDataset`): **(2.1) split da query de
  leads** — a consulta principal (420 leads) perdeu o join pesado `caso.honorarios[]+lancamentos[]` e o
  `honorario`; uma 2ª consulta nova busca SÓ `etapa:"ganho"` (~5 leads reais) com esse join, e `valorLeadMap`
  passou a vir dela — os ~98% dos leads que nunca precisaram da receita do caso não pagam mais o custo do
  join. **(2.2) `clientes`/`casos` saíram do `CmDataset`** — eram 668 clientes + 138 casos inteiros no payload
  p/ alimentar só o picker do `CmMergeModal` (`dataset.casos` não tinha NENHUM consumidor — payload morto) e a
  busca por nome ao mesclar lead↔cliente; `CmMergeModal` agora busca **lazy no mount** via
  `GET /api/clientes?options=1` (branch novo na [rota existente](src/app/api/clientes/route.ts), devolve
  `getClienteOptions()` — `{id,nome}[]`, não o `getClientes()` completo com cpfCnpj/_count) com estado de
  carregando/erro+"Tentar novamente" (o retry fica no onClick, não no efeito — mesma razão do reset-sem-efeito
  acima). `CmClienteOption` continua existindo em types.ts (só as 2 chaves do dataset saíram). **(2.3) horizonte
  de 24 meses nas atividades** — `oportunidadeAtividade.findMany` não tinha `where` nenhum (crescimento sem
  teto); agora traz histórico COMPLETO p/ leads ainda ABERTOS (scores exatos) + só os últimos 24 meses p/ leads
  fechados há mais tempo (o relatório da Visão já só cobre 24 meses). **(2.4) instrumentação dev opcional** —
  `performance.now()` em volta do `Promise.all`, `console.log` só fora de produção (contagem de leads/
  atividades + duração). **Verificado: `npx tsc --noEmit` 0; `npm test` 633/633; eslint sem achados novos nos
  8 arquivos tocados (incl. os 2 casos de `set-state-in-effect` corrigidos); `npm run build` limpo.** **Sem
  migração — nenhuma mudança de schema, só shape de query/payload/render. User action:** só visual —
  `/comercial` → aba Leads: abre instantâneo (sem flash de skeleton), digitar na busca não trava, tabela mostra
  100 linhas + "Mostrar mais (N restantes)" (agrupar por Etapa/Responsável e conferir que os cabeçalhos mostram
  a contagem CHEIA do grupo mesmo com linhas escondidas); checkbox das linhas só aparece no hover ou com alguma
  linha já selecionada; Quadro (Kanban) com 30 cards/coluna + "Mostrar mais"; Follow-up com 30 cards +
  "Mostrar mais"; menu "⋯" de um lead → "Mesclar com cliente" → modal mostra "Carregando clientes…" e então a
  busca (não trava mais a tela ao abrir por causa de 668 clientes no payload inicial).
- **Fix CRÍTICO: app inteiro quebrado ("Algo deu errado" em TODA página, incl. /login) + melhoria das telas
  de erro (this session, VERIFIED tsc 0, 633/633 testes, eslint sem achados novos, build de produção limpo,
  verificado no navegador real via `npm start`)** (memory `project_client_server_boundary`). Sintoma
  reportado pelo usuário logo após a sessão anterior (Score de Leads/Follow-up): tela genérica "Algo deu
  errado" em toda página, incl. `/login` (bare, sem auth). **Causa raiz:** `src/lib/comercial/scoring/store.ts`
  ("use client", `useScoringStore`) importava `DEFAULT_SCORING_CONFIG`/`DEFAULT_FOLLOWUP_CONFIG` como **VALOR**
  de `@/lib/settings` — um módulo SERVER ONLY que importa `@/lib/db` (Prisma) → `env.ts`. Isso arrastava
  Prisma+validação de env para o bundle do NAVEGADOR (via `UnifiedShell.tsx`, renderizado em toda rota), onde
  `DATABASE_URL`/`AUTH_SECRET` não existem → `env.ts` lança `"Variáveis de ambiente inválidas ou ausentes"` na
  avaliação do módulo, no cliente, derrubando a página inteira (confirmado no console do navegador + por um
  agente Explore independente, que pegou o mesmo diagnóstico). O precedente `usePipelineStore` evitava isso
  de propósito (só `import type` de settings.ts, sem os DEFAULT_* como valor — fallback inicial `[]`). **Fix:**
  `DEFAULT_SCORING_CONFIG`/`DEFAULT_FOLLOWUP_CONFIG` MOVIDOS para [score.ts](src/lib/comercial/score.ts) (núcleo
  puro, zero prisma — já seguro pro cliente); `settings.ts` agora importa+reexporta essas 2 constantes de
  score.ts (mantém `getScoringConfig`/`getFollowupConfig`/os chamadores de teste que importam de
  "@/lib/settings" funcionando sem mudança); `scoring/store.ts` passou a importar os valores de
  `@/lib/comercial/score` (client-safe) e só `import type` de settings.ts. **Regra geral daqui pra frente:**
  NENHUM módulo alcançável por um componente "use client" pode importar um VALOR (não-tipo) de um arquivo
  SERVER ONLY (que importe prisma/`@/lib/db`/env.ts) — só `import type`; constantes/defaults que um store
  client precisa como fallback devem morar num núcleo puro (sem prisma), nunca em settings.ts/queries.ts/etc.
  **Telas de erro melhoradas** (2º pedido do usuário — deixar o erro claro): [error.tsx](src/app/error.tsx)
  e [global-error.tsx](src/app/global-error.tsx) ganharam um `<details>` "Detalhes técnicos" (mensagem +
  digest + stack, monospace, scrollável) + botão "Copiar detalhes" (clipboard) — mantém o texto amigável
  "Algo deu errado" para o usuário comum, mas quem precisa diagnosticar (admin/dev) não depende mais de achar
  o terminal certo. Nota: Next.js já redige erros de Server Component em produção para mensagem genérica+digest
  — isto não muda esse comportamento nem vaza mais do que o runtime já expõe ao cliente; só deixa de ESCONDER
  o que já estava disponível (`error.message`/`error.stack` de erros client-side, como o que causou este bug,
  já chegavam completos no boundary mas eram descartados). Corrigido de quebra um `<a href="/">`→`<Link>`
  pré-existente no error.tsx (achado de lint ao tocar o arquivo). **Verificado:** reproduzido no navegador real
  (login mostrava só "Algo deu errado"; console tinha o erro de env completo) → corrigido → rebuild → restart
  → `/login` renderiza normal, console limpo. `npx tsc --noEmit` 0; `npm test` 633/633; eslint limpo;
  `npm run build` compilou. **Sem migração. User action:** nenhuma — já verificado ponta-a-ponta nesta sessão
  (servidor de produção reiniciado com o fix, respondendo normalmente). Se uma tela de erro aparecer de novo,
  abrir "Detalhes técnicos" já mostra a causa sem precisar do terminal do servidor.
- **Comercial → CRM maduro — Score de Leads configurável (Fit + Engajamento) + Painel de Follow-up (this
  session, VERIFIED tsc 0, 663/663 testes — 30 novos —, eslint sem achados novos, build de produção limpo,
  1 migração aditiva JÁ APLICADA + client gerado; servidor de produção parado→migrado→buildado nesta sessão)**
  (memory to add: `project_comercial_score_followup`). Pedido do usuário: score de leads em 2 dimensões
  independentes (Fit/Perfil 0-100 configurável define qualificação; Engajamento 0-100 acumulado por evento)
  + painel de Follow-up inteligente (auto-ordenado por prioridade, cadência progressiva de toques sugerida,
  checkpoints manuais + "reunião marcada" automático via Agenda, regras automáticas de Perdido). Planejado com
  3 agentes Explore em paralelo (Agenda/leadId ausente, Lead+atividades+cron existente, padrões reusáveis:
  DataGrid/AppSetting-config/store zustand/cron dedupeKey) + 1 agente Plan; usuário confirmou 4 decisões antes
  de codar (aba própria "Follow-up" em vez de 3º modo na grade de Leads; toque registrado SEMPRE sobrescreve
  `proximaAcaoEm`/`proximaAcaoNota`; resultado do toque OBRIGATÓRIO no modal dedicado — notas avulsas seguem
  livres; colunas Fit/Eng/Estado também na grade de Leads). **Decisões de arquitetura:** scores são DERIVADOS
  (nunca persistidos) por um núcleo puro novo [score.ts](src/lib/comercial/score.ts) (sem prisma/React — igual
  ao padrão de `analytics.ts`) que recalcula a partir do perfil do lead + timeline de atividades a cada leitura,
  então recalibrar a config repontua tudo retroativamente; "sinais" de engajamento são um mecanismo único
  (JSON `sinais: string[]` na atividade + os 3 valores reservados `sem_resposta/fria/positiva` derivados do
  `resultado` classificado do toque); a sugestão de cadência é gravada em `proximaAcaoEm`/`proximaAcaoNota` a
  cada toque (o cron de follow-up já existente funciona sem mudança); 2 chaves de AppSetting separadas
  (`comercial.scoring` e `comercial.followup`, espelhando o precedente pipeline/motivos — 2 Salvar
  independentes); `Evento.leadId` FK aditiva (picker de oportunidade no modal da Agenda) — "reunião marcada?"
  é derivado (evento confirmado tipo reunião com leadId, futuro), comparecimento é registrado do lado do LEAD
  (atividade com sinal `compareceu_reuniao`/`no_show`), `Evento.status` intocado; auto-perdido roda SÍNCRONO
  dentro de `criarAtividade` (imediato) + uma varredura catch-up idempotente no cron `gerarNotificacoes` (cobre
  mudança de limiar na config), ambos delegando à mesma função `avaliarEAplicarPerdaAutomatica` (nova, em
  [atividades.ts](src/lib/comercial/atividades.ts)) — chama `marcarPerdido(...,{automatico:true})` + grava uma
  nota-sistema na timeline + dispara o trigger novo `notificarLeadPerdido` (perda automática nunca notificava
  antes). **Modelo (migração `20260721195037_comercial_scoring_followup`, ADITIVA):** `Lead` += 5 campos de
  perfil (`potencialFinanceiro/urgenciaNivel/poderDecisao/jurisdicao/viabilidade`, chaves configuráveis, null=0
  pontos — não é "pior opção"), `contratoEnviadoEm`(checkbox timestamp), `perdidoAutomatico`(bool);
  `OportunidadeAtividade` += `toqueNumero`(nº do toque na cadência), `sinais`(JSON string[]); `Evento` +=
  `leadId`. **Config** ([settings.ts](src/lib/settings.ts)): `scoringSchema`/`DEFAULT_SCORING_CONFIG` (área
  jurídica principal/secundária/fora + origem + os 5 critérios genéricos do pedido do usuário, cada um com
  suas opções/pontos exatos da tabela do spec; sinais de engajamento incl. os 3 reservados; limiares
  fitQualificado=60/engajamentoQuente=50) e `followupSchema`/`DEFAULT_FOLLOWUP_CONFIG` (cadência 7 toques
  dias 0/1/3/6/10/15/21 com os canais do spec; pesos de prioridade 40/30/30 Fit/Eng/Urgência — `setFollowupConfig`
  valida soma=100; horizonte de urgência temporal 7 dias; regras de perda 3 sem-resposta consecutivas / 5 frias
  acumuladas); motivo `desinteresse` acrescentado a `DEFAULT_MOTIVOS_PERDA`. Rotas GET/PUT
  `/api/comercial/{scoring,followup}` (`runMutation roles:["socio"]`, admin implicit-passes). **Núcleo puro**
  [score.ts](src/lib/comercial/score.ts): `fitScore`/`engajamentoScore`(clamp 0-100 a cada evento, cronológico)/
  `estadoLead`(matriz A/B/C/D)/`urgenciaTemporal`(rampa linear até vencido=100)/`prioridadeLead`(média
  ponderada)/`proximoToque`(sugestão data+canal, adianta p/ hoje se no passado, null se cadência esgotada)/
  `contarToques`(resiliente a lacunas)/`avaliarRegrasPerda`(streak de sem_resposta quebra com
  positiva/fria; frias acumulam sempre; resultado texto-livre legado = não classificado)/`parseSinais`.
  Testes novos [comercial-score.test.ts](tests/comercial-score.test.ts) (30 casos: fit por critério+null+clamp,
  engajamento acumulado+clamp+legado, fronteiras da matriz, rampa/vencido da urgência, pesos, cadência
  incl. esgotada, regras de perda incl. reset de streak e limiar exato). **Store** zustand
  [scoring/store.ts](src/lib/comercial/scoring/store.ts) (`useScoringStore`, espelha `usePipelineStore`,
  carregado 1× no `UnifiedShell`). **Dataset**: `CmDatasetLead` += os 5 campos de perfil +
  `contratoEnviadoEm`/`perdidoAutomatico`; `CmDatasetAtividade` += `leadId`/`resultado`/`sinais`/`toqueNumero`
  (chaves/enum — sem PII, postura LGPD mantida); novo `CmDatasetEvento`+`eventos` no `CmDataset` (reuniões
  vinculadas, sem título/local). Wrapper cliente `cmLeadScores` em [cm-meta.ts](src/components/comercial/cm-meta.ts)
  (agrupa atividades/eventos por lead, delega tudo ao score.ts — zero round-trip extra). **UI**: 3 colunas
  novas (Fit/Eng/Estado, somente-leitura) na grade de Leads
  ([CmLeads.tsx](src/components/comercial/tabs/CmLeads.tsx)); nova seção **"Score de leads"** em
  [CrmSettings.tsx](src/components/crm/overlays/CrmSettings.tsx) (padrão `PipelineSection`: estado local +
  botão Salvar explícito, 2 cards Fit/Follow-up, preview do Fit máximo, preview da soma de pesos); fieldset
  **"Perfil (score)"** no `CmLeadModal` (preview do Fit ao vivo) + `CmAtividades` ganhou chips de
  resultado/toque e um select de resultado opcional no quick-add
  ([CmModals.tsx](src/components/comercial/CmModals.tsx)); nova aba **"Follow-up"** no `ComercialApp.tsx`
  ([CmFollowUp.tsx](src/components/comercial/tabs/CmFollowUp.tsx), painel SOB MEDIDA — não o DataGrid genérico,
  já que a ordenação automática por prioridade e as ações densas por linha são o produto: tabela ordenada por
  prioridade desc, filtros responsável/estado/só-vencidos, checkpoints inline (Compareceu/No-show/Respondeu
  proposta/Contrato enviado), faixa recolhível "Perdidos automáticos" com Reabrir) + `CmToqueModal` novo
  (registra um toque: canal, toque nº, **resultado OBRIGATÓRIO**, sinais adicionais opcionais, nota livre).
  Agenda: `CrmEventoModal` ganhou picker "Oportunidade (opcional)" (leads abertos). **Verificado nesta sessão:
  `npx tsc --noEmit` 0 erros; `npm test` 663/663 (30 novos); `npx eslint` nos arquivos tocados sem achados
  novos** (só os avisos pré-existentes documentados `_realRole`/`_dataset` em CrmSettings + os
  set-state-in-effect/refs pré-existentes em UnifiedShell/CrmAgendaPage — confirmados como não relacionados);
  **`npm run build` compilou com sucesso** (rotas novas `/api/comercial/{scoring,followup}` confirmadas na
  tabela de rotas). Migração `20260721195037_comercial_scoring_followup` já aplicada + `prisma generate`
  rodado nesta sessão (servidor de produção parado→migrado→buildado→religado com sucesso nesta sessão, com
  autorização do usuário — houve uma interrupção transitória da ferramenta de shell no meio do caminho, sem
  relação com o código; recuperou sozinha e `npm start` + health-check 200 fecharam o ciclo). **User action:**
  conferir visualmente — `/comercial` → nova aba **Follow-up**
  (tabela ordenada por prioridade; "Registrar toque" → escolher resultado obrigatório → conferir que a
  Próxima ação do lead atualiza; registrar 3 toques "Sem resposta" seguidos no mesmo lead → vira Perdido
  automaticamente, com nota na timeline + notificação ao responsável; "Reabrir" na faixa de perdidos
  automáticos reverte); Configurações → **"Score de leads"** (edite pontos/limiares/cadência/pesos → salvar
  → a aba Follow-up repontua na hora); no editor de um lead → fieldset "Perfil (score)" preenche e o Fit muda
  ao vivo; grade de Leads mostra as colunas Fit/Eng/Estado; na Agenda, criar uma reunião vinculada a uma
  oportunidade → o painel de Follow-up acende "Reunião marcada" sozinho.
- **Comercial → CRM maduro — FASE 4: análise + tools da LexIA + config de probabilidade (this session, VERIFIED
  tsc 0, 603/603 testes, eslint sem achados novos, NO migration)** (memory `project_comercial_crm`). Última fase
  do plano. **(A) Camada de análise** — núcleo PURO novo [analytics.ts](src/lib/comercial/analytics.ts)
  (sem prisma/React, centavos): `desempenhoPorDono(leads, nomePorId)` (agrega leads/abertos/conversões/valor
  contratado/ticket/taxa por responsável, ordena por valor), `forecastPonderado(leadsAbertos, stages)` (valor
  estimado × probabilidade da etapa; só leads ABERTOS; ganho/perdido liquidados ficam de fora; etapa removida do
  config vira "Outras etapas" prob 0), `relatorioAtividades(atividades, nomePorId)` (conta por tipo — só os
  presentes — e por autor desc; **só metadados tipo/autorId, zero PII**). É a fonte única consumida pelo SERVIDOR
  e pelo CLIENTE. Server: `getDesempenhoDonos`/`getForecast`/`getRelatorioAtividades` em
  [queries.ts](src/lib/comercial/queries.ts) (desempenho usa o mesmo `valorContratadoPorLead` deduped por caso do
  resto do módulo; forecast é snapshot do funil aberto atual, NÃO escopado por período; atividades escopadas por
  `ocorreuEm`). `getComercialDataset` ganhou `atividades: {tipo, autorId, ocorreuEm}[]` (metadados LGPD-safe —
  descrição/título ficam no detalhe da oportunidade) + `CmDatasetAtividade`/`CmDataset.atividades` em
  [types.ts](src/lib/comercial/types.ts). Cliente: `cmOwnerStats`/`cmForecast`/`cmAtividadeReport` em
  [cm-meta.ts](src/components/comercial/cm-meta.ts) (thin wrappers sobre analytics.ts) renderizados na aba **Visão
  geral** ([CmVisao.tsx](src/components/comercial/tabs/CmVisao.tsx): tabela "Por responsável", card "Forecast do
  funil" com total ponderado, e 2 cards de atividades por tipo/responsável — espelham a tabela "Por área"
  existente; instantâneo, sem novo fetch). **(B) Probabilidade por etapa** — `pipelineStageSchema` em
  [settings.ts](src/lib/settings.ts) ganhou `probabilidade` (int 0–100, opcional/aditivo — **sem migração**, é
  JSON em AppSetting) + defaults (novo 10/contato 25/qualificado 50/proposta 75); input `%` por etapa no editor
  **Pipeline comercial** de [CrmSettings.tsx](src/components/crm/overlays/CrmSettings.tsx) (persistido pelo PUT já
  validado por `pipelineSchema`); o `usePipelineStore` já carrega o campo (tipo vem de settings). **(C) Tools da
  LexIA** ([tools/comercial.ts](src/lib/lexia/agent/tools/comercial.ts)) — 5 mutações confirmação-gated
  (`resumo`+`montarConfirmacao` com nomes/datas/$ pt-BR): `criar_campanha` (createCampanha), `registrar_gasto`
  (`gastoSchema.extend({campanhaId})` → registrarGasto → saída no Financeiro), `converter_lead`
  (`converterLeadSchema.extend({id})` → marca ganho + honorário), `registrar_atividade`
  (`atividadeCreateSchema.extend({leadId})` → criarAtividade), `definir_follow_up` (id+proximaAcaoEm+nota →
  updateLead); + 1 tool de LEITURA `analise_comercial` (desempenho por dono + forecast + atividades, aceita mes/
  periodo). **Sem role gate** (deliberado — igual a TODAS as tools/rotas de comercial, que são abertas; a rota de
  gasto/converter/leads não tem `roles`). Prompt: bullet COMERCIAL/MARKETING novo em
  [prompt.ts](src/lib/lexia/agent/prompt.ts) (CORE cacheado — invalida 1×). **Fix estrutural necessário:** importar
  `criarAtividade` de [atividades.ts](src/lib/comercial/atividades.ts) puxava `@/lib/auth/session` (→ next-auth)
  para o grafo do registry, quebrando a test-safety do [lexia-agent.test.ts](tests/lexia-agent.test.ts). Movido
  `ForbiddenError` de `auth/session.ts` → [errors.ts](src/lib/errors.ts) (junto de `UserError`; re-exportado por
  `session.ts` p/ compat — os outros importadores seguem intactos), atividades.ts agora importa de `@/lib/errors`
  → registry volta a ser next-auth-free. **WhatsApp** segue click-to-chat (atividade `tipo:'whatsapp'` manual, sem
  API). **Índices de Lancamento da Fase 1** (`campanhaId`/`clienteId`/`casoId`) exercitados por registrar_gasto
  (escrita campanhaId) + getCampanhas/getComercialDataset (leitura campanhaId) — confirmado, sem trabalho novo.
  Testes novos: [comercial-analytics.test.ts](tests/comercial-analytics.test.ts) (14: cores puros — agregação/
  ordem/ticket, ponderação/exclusão de terminais/bucket "Outras", contagem por tipo/autor) + bloco em
  lexia-agent.test.ts (tools Fase 4 presentes, kind mutation + resumo, sem role gate/staff enxerga, `analise_
  comercial` sobrevive ao modo 'pergunta'). **Verificado: tsc 0; 603/603 testes; eslint sem achados novos** (só os
  2 warnings pré-existentes `_realRole`/`_dataset` do CrmSettings). **Sem migração.** **User action (REQUIRED —
  tool/prompt novos vivem em memória):** reiniciar o `next dev` → visual: `/comercial` → **Visão geral** mostra
  "Por responsável", "Forecast do funil" e atividades; Configurações → **Pipeline comercial** → setar a % de cada
  etapa → salvar → o forecast repondera; na **LexIA** (modo agente) pedir "crie uma campanha de Google Ads",
  "registre R$ 500 de gasto na campanha X", "ganhamos o lead Y por R$ 5.000", "anote que liguei para o lead Z",
  "me lembre de ligar para o lead W na sexta" → cada uma gera cartão de confirmação; "qual o forecast do funil?"/
  "quem converteu mais este mês?"/"quantas ligações fizemos?" → responde via `analise_comercial`. **PLANO
  COMPLETO — Fases 1-4 entregues.**
- **Comercial → CRM maduro — FASE 3: Kanban arrastável + import CSV mapeado (this session, VERIFIED tsc 0,
  595/595 testes, eslint sem achados novos, NO migration)** (memory `project_comercial_crm`). Duas entregas da
  Fase 3 do plano (Kanban por etapa + import CSV com mapeamento de colunas); analytics/forecast e tools novas da
  LexIA ficam para a Fase 4. **(A) Kanban** — novo [CmKanban.tsx](src/components/comercial/CmKanban.tsx): board
  puro/stateless sobre `optimistic.rows`, colunas = etapas abertas do `usePipelineStore` (via as `stages` já
  derivadas no `CmLeads`) **+ terminais fixos Ganho/Perdido**; drag nativo HTML5 (`dataTransfer "text/plain"`,
  forkado do `SecoesBoard`/`QuadroView` — `dragId`/`over` state, `getData ?? dragId` fallback). Arrastar card p/
  etapa aberta → `moveEtapa` (otimista `applyLocal` + `POST /leads/[id]/etapa`, mesmíssimo caminho do `StageMenu`
  da grade); soltar em **Ganho** → abre `CmConverterModal`; em **Perdido** → `CmPerdidoModal` (coletam
  valorContratado/motivo — nunca move direto). Card compacto: nome, telefone, campanha, dot de temperatura,
  avatar do responsável (`CrmAvatar`), valor estimado (`formatBRL`); clique abre o modal de edição. Leads com
  etapa fora das colunas (etapa removida do pipeline) somem do board mas seguem na grade. **Toggle Grade/Quadro**
  no [CmLeads.tsx](src/components/comercial/tabs/CmLeads.tsx) (`view` state; `injectFilter` **força Grade** —
  navegação cruzada "ver leads desta etapa" só faz sentido na grade filtrável); o toggle vive no `toolbarExtra`
  na grade e numa barra própria no board. **(B) Import CSV mapeado** — o botão "Importar" virou **Menu** com
  "Do Genions" (fluxo cru existente, intacto) e "Outro CSV (mapear colunas)". Núcleo PURO
  [import/mapeado-core.ts](src/lib/comercial/import/mapeado-core.ts): `suggestMapping(headers)` (heurística
  accent-insensitive, first-wins por campo), `parseOrigemMapeada`/`resolveEtapaMapeada`(terminais→exato→contains→
  1ª etapa)/`parseTemperaturaMapeada`/`parseValorCents`(BR e intl)/`parseDataMapeada`(ISO+BR)/`rowToMappedLead`/
  `invertMapping` — 10 campos-alvo (`MAP_FIELDS`, só `nome` obrigatório). Importer server
  [import/leads-mapeado.ts](src/lib/comercial/import/leads-mapeado.ts) `importLeadsMapeadoFromText`: reusa
  `resolverOuCriarCliente` (create-or-link Contato, agora passando **email**) + resolve campanha idêntico ao
  Genions; idempotência por `genionsId` sintético namespace **`csv:<nome>:<telefone>:<dia>`** (nunca colide com
  `genions-*`) → re-import do mesmo arquivo atualiza. Fluxo 2-passos server-parsed: `POST
  /api/comercial/leads/import/preview` (text/csv → `{headers, sample, suggested, count}`, sem escrita) → UI de
  mapeamento → `POST /api/comercial/leads/import/mapeado` (JSON `{csv, mapping}`, lê `getPipelineConfig().stages`
  p/ resolver etapa, rate-limit 5/min + auditoria `comercial.leads.importar-mapeado`). Modal
  [CmImportMap.tsx](src/components/comercial/CmImportMap.tsx) (3 telas: arquivo → mapear cada coluna via
  `CmSelect` com exemplo da 1ª linha + aviso se `nome` não mapeado → summary; wired no `ComercialApp` como
  variante `importarMapeado`). **NÃO** há parse de CSV no cliente (tudo server via `parseCsvText`); sem migração
  (Lead já tem todas as colunas). Teste puro novo
  [tests/comercial-import-mapeado.test.ts](tests/comercial-import-mapeado.test.ts) (14). **Verificado: tsc 0;
  595/595 testes; eslint sem achados novos nos 8 arquivos tocados. Sem migração. User action:** só visual —
  `/comercial` → Leads → toggle **Quadro**: arrastar um card entre etapas (persiste), soltar em Ganho/Perdido
  abre o modal certo, clicar no card edita; **Grade** → menu **Importar** → "Outro CSV (mapear colunas)" → subir
  uma planilha qualquer → conferir o mapeamento sugerido, ajustar, importar → leads entram no funil (Contatos
  criados/ligados por telefone/email; re-importar o mesmo arquivo atualiza sem duplicar). **Escopo FORA da Fase 3
  (Fase 4):** analytics (performance por dono, forecast ponderado por etapa), tools novas da LexIA
  (`criar_campanha`/`registrar_gasto`/`converter_lead`/`registrar_atividade`/`definir_follow_up`).
- **Comercial → CRM maduro — FASE 2: grid genérico estilo Notion (Oportunidades + Contatos)
  (this session, VERIFIED tsc 0, 581/581 testes, eslint sem achados novos, build de produção limpo,
  migração aditiva JÁ RODADA, servidor parado→migrado→rebuildado→religado com sucesso)** (memory
  `project_comercial_crm`). Sequência do plano de Fase 2: 3 agentes Explore/Plan em paralelo (mapear
  a lista de Contatos + escala de dados; extrair as APIs exatas de `Menu`/`MenuItem`
  ([tf-kit.tsx](src/components/tarefas/tf-kit.tsx)), o padrão otimista `applyLocal`/`commit`/`liveEdit`
  de [ProjetosWorkspace.tsx](src/components/projetos/ProjetosWorkspace.tsx), o `BulkBar` de
  [pj-kit.tsx](src/components/projetos/pj-kit.tsx), e todo o table-shell de
  [interativo.css.ts](src/components/financeiro/interativo/interativo.css.ts)) → 1 agente Plan
  desenhando a arquitetura → plano escrito e aprovado. **Decisão de local:** componente novo,
  module-neutro, em **`src/components/ui/datagrid/`** (não `comercial/grid/` — Contatos também
  consome) + hook em `src/lib/client/useOptimisticRows.ts`; `datagrid.css.ts` é um **fork** deliberado
  das peças neutras do `interativo.css.ts` (não reuso por referência — aquele arquivo tem exports
  genuinamente financeiros interpolados + o grid precisa de uma variante nova, `th` com `sortable`).
  **Contrato genérico** ([types.ts](src/components/ui/datagrid/types.ts)): `GridColumn<T>`
  (key/label/type/accessor/render?/editable?/sortable?/filterable?/groupable?/options?) +
  `DataGridProps<T>` — o grid é dono de sort/filtro/agrupamento/seleção/edição-em-popover; o chamador é
  dono da rede (`onCellCommit`/`onBulkApply`/`onBulkDelete` nunca tocam `apiSend` diretamente dentro do
  grid). **Filtro por coluna** ([filter-logic.ts](src/components/ui/datagrid/filter-logic.ts)
  `evalFilters`, PURO): 1 combinador AND/OR no topo p/ N regras (sem grupos aninhados — cobre "E/OU" sem
  editor de expressão booleana); operadores por tipo (`OPERATORS_BY_TYPE`); UI em
  [FilterBuilder.tsx](src/components/ui/datagrid/FilterBuilder.tsx) reaproveitando `Menu`/`MenuItem` +
  as classes `facet*`. **Ordenar** ([sort-logic.ts](src/components/ui/datagrid/sort-logic.ts)
  `compareByColumn`/`sortRows`, PURO): 1 coluna por vez, nulls sempre por último, clicar alterna
  asc/desc, trocar de coluna reseta p/ desc (mesma convenção do `Hd`/`toggleSort` já existente em
  `CrmContratosPage.tsx` — única prior art de sort no app, generalizada aqui). **Agrupar**
  ([group-logic.ts](src/components/ui/datagrid/group-logic.ts) `groupRows`, PURO): generaliza o shape
  `Group[]`/`GroupHeader` de `ListaView` (tarefas); ordem **filtra→agrupa→ordena-dentro-do-grupo**;
  segue a ordem de `column.options` quando existe (ex.: etapa segue a ordem configurada do pipeline);
  grupo "Sem valor" sempre por último; grupos colapsados são estado efêmero (não entram na view salva).
  **Edição inline** ([CellEditors.tsx](src/components/ui/datagrid/CellEditors.tsx)): texto/número/
  money/data via troca por `<input>` (commit no blur/Enter, Escape cancela — sem debounce por tecla,
  já que só comita no blur, então `commit` (imediato) basta, `liveEdit` do hook fica pronto p/ uso
  futuro mas não é chamado hoje); select/user/relation via `OptionCellEditor` — a célula JÁ é o gatilho
  do `Menu` (1 clique abre a lista, escolher comita na hora), sem um "modo de edição" intermediário.
  **CSV** ([csv.ts](src/components/ui/datagrid/csv.ts) `rowsToCsv`/`downloadCsv`, PURO): exporta a
  visão ATUAL (pós filtro/ordenação/agrupamento); generaliza `cmLeadsCSV`/`cmDownload`; **corrige um
  bug de segurança real que o `cmLeadsCSV` atual tem** — o `esc()` de lá só dobra aspas, não neutraliza
  `=`/`+`/`-`/`@` líder (injeção de fórmula no Excel/Sheets); `rowsToCsv` prefixa `'` nesses casos
  (o `cmLeadsCSV`/`cmExportCSV` antigos da aba Exportar NÃO foram tocados — ficou registrado como
  drive-by pendente). **`useOptimisticRows`**
  ([useOptimisticRows.ts](src/lib/client/useOptimisticRows.ts)): extração genérica (parametrizada por
  entidade) do padrão do ProjetosWorkspace — `applyLocal`/`commit`/`liveEdit`(debounce 600ms
  compartilhado)/`flushPending`; **decisão nova**: edição de 1 célula segue só-toast em erro (como o
  original — o erro fica visível na própria célula), mas **`bulkApply`/`bulkDelete` ganharam rollback**
  (snapshot de `rows` antes do apply otimista, restaura no catch) — 30 linhas erradas silenciosamente é
  um risco maior que 1 errada e visível. Erro cai no **toast global** `@/lib/client/toast` (já usado
  pelo `apiSend` app-wide — achado durante a implementação, evita precisar de um `CrmToastHost`
  Provider no Comercial). **BulkBar genérica**
  ([BulkBar.tsx](src/components/ui/datagrid/BulkBar.tsx)): fork do `pj-kit.tsx` (não altera o de
  Tarefas/Projetos, que já tem campos fixos), dirigida por `BulkFieldConfig[]` — cada grid declara os
  próprios campos, nunca assume que um campo é seguro em lote (a fonte da verdade continua sendo o
  allowlist server-side). **Views salvas:** migração aditiva `User.crmViewPrefs String?` (mesmo padrão
  de `notifPrefs`/`lexiaPrefs`) + [view-prefs-core.ts](src/lib/crm/view-prefs-core.ts) (puro, JSON
  keyed por `gridId`) + [view-prefs.ts](src/lib/crm/view-prefs.ts) (`getViewPrefs`/`setViewPrefs`,
  substituição do objeto inteiro) + `GET/PATCH /api/crm/view-prefs` + hook client
  [useCrmSavedView.ts](src/lib/client/useCrmSavedView.ts) (GET no mount + PATCH debounced 600ms no
  change, guarda o objeto CHEIO num ref p/ editar a view de um grid nunca apagar a do outro). **Fix
  achado na auto-revisão desta sessão (2, sem workflow multi-agente — ultracode estava desligado):** (1)
  uma regra de filtro `in` recém-criada, sem opção escolhida, zerava a tabela inteira (`[].includes`
  sempre falso) — corrigido p/ regra sem valor = não filtra nada, em vez de filtrar tudo; (2)
  `injectFilter` (navegação cruzada de aba "ver leads desta etapa") disparava o `onChange` do grid e,
  600ms depois, **sobrescrevia a view salva de verdade do usuário** com o filtro transitório de
  navegação — corrigido: `onChange` vira no-op quando `injectFilter` está ativo. **1.1 Oportunidades**
  ([CmLeads.tsx](src/components/comercial/tabs/CmLeads.tsx), reescrito): 14 colunas (nome/contato/
  origem/campanha/etapa/área/responsável/temperatura/estimado/contratado/entrada/próxima ação/
  conversão/cliente); etapa é coluna só-leitura (filtrável/agrupável, mas a edição continua no
  `StageMenu` portado p/ `rowActions`, preservando o guard ganho/perdido); `onCellCommit` traduz
  `contato`→`telefone` e `campanhaId`/`responsavelUserId` p/ número antes de mandar pro PATCH;
  `ComercialApp.tsx` perdeu `moveStage`/`bulkMove`/`reopenLead` (agora internos ao grid via
  `useOptimisticRows` + chamada direta a `/etapa`). **1.2 Contatos**
  ([CrmClientesPage.tsx](src/components/crm/pages/CrmClientesPage.tsx), reescrito): `ClienteRow` ganhou
  `origem` ([finance/types.ts](src/lib/finance/types.ts) + `getClientes()` em
  [finance/queries.ts](src/lib/finance/queries.ts) — 1 campo, já editável via `updateCliente`, sem
  tocar em emails/telefones/endereço, que ficam só no `ClienteDetail`); `ClienteRow` re-exportado por
  [crm-types.ts](src/components/crm/crm-types.ts) (faltava). **Backend novo p/ Contatos** ([mutations.ts](src/lib/clientes/mutations.ts)
  `bulkUpdateClientes`, [schemas.ts](src/lib/clientes/schemas.ts) `clientesLoteSchema`,
  `PATCH /api/clientes/lote`): **deliberadamente só tipo/classificacao/origem** — sem nome/cpfCnpj/
  endereço (sem caso de uso em lote) e **sem excluir** (Cliente não tem hard-delete nem no
  single-record hoje; inventar bulk-delete seria uma capacidade nova e mais perigosa que qualquer coisa
  que já existe). **Verificado: tsc 0; 581/581 testes** (novos: `datagrid-{filter,sort,group,csv}`,
  `crm-view-prefs` — só lógica pura, sem teste de componente React/DB, mesmo padrão do repo); **eslint
  sem achados novos** (só os 3 avisos pré-existentes já documentados: `cm-kit.tsx` `big`,
  `CmCampanhas.tsx` `CmCardTitle`, `finance/queries.ts` `AcertoSocioLado`); `npm run build` limpo,
  rotas novas confirmadas (`/api/clientes/lote`, `/api/crm/view-prefs`); servidor parado→migrado
  (`crmViewPrefs`, aditiva)→rebuildado→religado. **Escopo deliberadamente FORA desta Fase** (Fase 3+,
  já roteirizado no plano): Kanban arrastável sobre o pipeline configurável; import CSV com mapeamento
  de colunas; analytics (performance por dono, forecast ponderado); tools novas da LexIA. **User
  action:** já verificado ponta-a-ponta pelo agente — falta só a conferência VISUAL: `/comercial` → aba
  Leads → clicar num cabeçalho pra ordenar; abrir "Filtros" → adicionar 2 regras (uma coluna
  texto, uma seleção) → alternar E/OU; "Agrupar" por Etapa e por Responsável (colapsar/expandir);
  clicar numa célula de texto/valor pra editar inline, clicar numa célula de seleção (Origem/
  Responsável/Temperatura) → abre popover; selecionar 3 linhas → barra de lote flutuante (Etapa/
  Responsável/Temperatura/Área) → some ao aplicar; "Exportar CSV" com um lead chamado `=1+1` → conferir
  que abre sem virar fórmula; recarregar a página → a última visão (filtro/ordenação/agrupamento) volta
  (view salva); em `/contatos` → mesmo grid, coluna Origem nova, barra de lote só com Tipo/
  Classificação/Origem (sem excluir); "ver leads desta etapa" a partir da aba Funil → volta a "Leads"
  já filtrado, e essa navegação NÃO deve sobrescrever a view salva de antes.
- **Comercial → CRM maduro — FASE 1: modelo + integração com Contatos (this session, VERIFIED tsc 0,
  553/553 testes, eslint sem achados novos, build de produção limpo, migração + backfill JÁ RODADOS
  contra o `dev.db` real)** (memory to add: `project_comercial_crm`). Pedido: o usuário achou o módulo
  Comercial "protótipo" e quer evoluí-lo para um CRM genuinamente maduro, com uma tabela de
  oportunidades no estilo Notion (filtro/edição poderosos). Depois de 3 agentes Explore mapeando o
  módulo + integrações + padrões de UI reaproveitáveis, e 1 agente Plan desenhando o refactor,
  **decisões travadas com o usuário**: faseado (**modelo primeiro**, tabela Notion fica p/ Fase 2+);
  **Contato + Oportunidade** — a pessoa é o Contato (`Cliente`), a venda é uma Oportunidade (`Lead`
  reaproveitado, **sem** rename de model Prisma — só rótulo de domínio) referenciando um Contato, **1
  contato → N oportunidades**; **etapas configuráveis** num funil único (`ganho`/`perdido` seguem
  terminais fixos); lead ganha **dono/responsável, atividades+follow-up, tarefas vinculadas,
  temperatura+motivo de perda estruturado**; **WhatsApp = click-to-chat** (link `wa.me`, sem API);
  grid Notion **nas Oportunidades E nos Contatos** (Fase 2+), **sem** campos personalizados.
  **1.1 Unificação Contato+Oportunidade:** `Lead.clienteId` segue anulável no schema mas **sempre
  resolvido/criado pela camada de escrita** — novo [contato.ts](src/lib/comercial/contato.ts) PURO
  (`acharClienteExistente` cpfCnpj→email→telefone, `planejarCriarCliente` classificacao='lead' +
  `astreaId` sintético) + wrapper server `resolverOuCriarCliente` (dedup, nunca sobrescreve — reusa
  `planejarBackfillCliente` de `merge.ts` p/ preencher lacunas), ligado em `createLead`/`converterLead`
  (fallback ao `clienteId` já existente do lead)/[import/leads.ts](src/lib/comercial/import/leads.ts)
  (Genions — só resolve quando o lead importado AINDA não tem `clienteId`, preservando um link já
  feito por conversão). Campos de contato (`nome/email/telefone/origem`) **continuam denormalizados**
  no Lead como cache de captação (evita reescrever ~28 leituras). **Backfill**
  [scripts/backfill-oportunidade-contatos.ts](scripts/backfill-oportunidade-contatos.ts)
  (`db:backfill:oportunidades`, idempotente, `--dry`) **RODADO**: 415 oportunidades órfãs → 19 ligadas
  a Contato existente + 396 Contatos novos criados, 0 órfãs restantes. **1.2 Pipeline configurável:**
  `comercial.pipeline`/`comercial.motivosPerda` em [settings.ts](src/lib/settings.ts) (AppSetting JSON
  + Zod, padrão de `getNotificacoesConfig`; `ganho`/`perdido` são chaves reservadas, `setPipelineConfig`
  rejeita reuso/duplicata); store zustand novo
  [pipeline/store.ts](src/lib/comercial/pipeline/store.ts) (`usePipelineStore`, espelha `useAreasStore`,
  carregado 1× no `UnifiedShell`) com `resolveEtapaLabel/Color`+`toStageOptions`; `getFunil`
  ([queries.ts](src/lib/comercial/queries.ts)) deriva as etapas abertas do config em vez do
  `FUNIL_ETAPAS` fixo; `LeadEtapa` alargou p/ `string` (era union fechada) — `asEtapa` (mutations.ts)
  virou permissivo (só exige string não-vazia). UI: `StageMenu`/bulk-bar/filtro de etapa em
  [CmLeads.tsx](src/components/comercial/tabs/CmLeads.tsx), o seletor de Etapa do
  [CmLeadModal](src/components/comercial/CmModals.tsx) e o `CmPerdidoModal` (motivos) leem o store,
  caindo pro `CM_STAGES`/`MOTIVOS` estáticos de `cm-meta.ts` como fallback — **decisão de escopo**: os
  displays só-leitura (funil/campanhas/visão geral) continuam no `CM_STAGE_MAP` estático por ora (Fase
  2/3). Painel novo **Configurações → Pipeline comercial** (admin/sócio) em
  [CrmSettings.tsx](src/components/crm/overlays/CrmSettings.tsx): editor de etapas
  (add/renomear/reordenar/cor/remover) + motivos de perda, salvamento explícito (botão "Salvar", não
  otimista — evita PUT por tecla). **1.3 Colunas/models novos** (schema.prisma, migração ÚNICA
  `20260721155601_comercial_crm_fase1`, aditiva): `Lead` += `responsavelUserId`(FK User,
  `"LeadResponsavelUser"`)/`proximaAcaoEm`/`proximaAcaoNota`/`temperatura`/`motivoPerdaCategoria` +
  índices; novo model **`OportunidadeAtividade`** (timeline manual — ligação/e-mail/reunião/
  WhatsApp/nota, `onDelete:Cascade`, espelha `ClienteAnotacao`); `Tarefa.leadId` (FK, p/ ligar tarefas a
  oportunidades); índices novos em `Lancamento` (`campanhaId`/`clienteId`/`casoId`, lacuna de perf
  identificada na análise). SQLite reconstruiu as tabelas `Lead`/`Tarefa` (FK novas) — **dados 100%
  preservados** (INSERT...SELECT, conferido no `migration.sql` gerado). **1.4 Atividades + follow-up +
  notificações:** [atividades.ts](src/lib/comercial/atividades.ts) (CRUD, IDOR-escopado ao `leadId`,
  autor-ou-gestor exclui — espelha `tarefas/comentarios.ts`) + rotas
  `/api/comercial/leads/[id]/atividades[/[aid]]`; `notificarOportunidadeAtribuida` novo em
  [triggers.ts](src/lib/notificacoes/triggers.ts) (dispara em `createLead`/`updateLead` quando o dono
  muda p/ alguém novo); cron `gerarNotificacoes`
  ([processos/notificacoes.ts](src/lib/processos/notificacoes.ts)) ganhou bloco de follow-up
  vencido/do-dia (mesmo `upsert`+`dedupeKey` idempotente dos prazos). **1.5 Zod/rotas:** fix do bug
  `area` ausente em `leadCreateSchema`/`campanhaCreateSchema` (o modal já coletava, a API descartava);
  campos novos no schema; rota bulk **`PATCH /api/comercial/leads/lote`** (`bulkUpdateLeads`, espelha
  `/api/tarefas/lote`) substitui o loop client-side de `onBulkMove`; rotas de config
  `/api/comercial/{pipeline,motivos}` (GET aberto, PUT sócio+). **1.6 UI do lead:** `CmLeadModal` ganhou
  Responsável/Temperatura/Próxima ação+nota/**botão WhatsApp** (`wa.me`, click-to-chat) + painel
  **Atividades** (lista+quick-add) só no editar; `dataset.usuarios` novo (via `getUsuariosAtivos`).
  **1.7 LGPD:** `proximaAcaoNota` (PII em texto livre) redigida em `redactBundle`/`cmRedactLeads`
  ([lgpd.ts](src/lib/comercial/lgpd.ts)). **Método:** exploração com 3 Explore + 1 Plan em paralelo →
  implementação direta → **1 workflow de revisão adversarial (4 dimensões × verify)** → **8 achados
  confirmados (0 refutados) e TODOS corrigidos**: (1) dedup de telefone sem normalizar código-país/
  8-vs-9-dígitos → duplicava Contato (fix: `chaveTelefone` em `contato.ts`, strip `55`+canonicaliza
  celular legado); (2) corrida check-then-act em `resolverOuCriarCliente` sem lock (fix: mutex em
  processo, app roda 1 processo Node só); (3+4, mesmo bug achado 2×) `bulkUpdateLeads` não notificava
  troca de responsável (fix: notifica cada dono novo, comparando o responsável ANTES); (5) guard de
  `bulkUpdateLeads` contra etapa='ganho'/'perdido' comparava o valor CRU enquanto `asEtapa()` aparava —
  `" ganho"` (com espaço) burlava o guard e ainda gravava `"ganho"` sem `dataConversao`/notificação/
  honorário (fix: guard compara o valor já aparado); (6) `motivoPerdaCategoria` não era limpo ao
  reabrir um lead perdido (`bulkUpdateLeads` E `moverEtapa`) (fix: limpa nos dois); (7+8, mesmo bug
  achado 2×) `getFunil` usava `Map.get(etapa) ?? 0` — uma etapa removida do pipeline pelo admin fazia o
  lead subcontar silenciosamente em todas as barras do funil, mesmo a UI prometendo "mantém a chave"
  (fix: chave desconhecida vira "alcançou todas as etapas abertas", nunca "ganho"). **Checado à mão no
  dev.db real, pós-fix:** 0 Contatos duplicados por telefone entre os 396 criados pelo backfill (a
  falha de normalização não chegou a duplicar ninguém nesta base). **Verificado: tsc 0; 553/553 testes
  (novos: `comercial-contato` — dedup+`chaveTelefone`); eslint sem achados novos (confirmados via diff
  linha-a-linha que os `set-state-in-effect`/refs de `CmLeads.tsx`/`UnifiedShell.tsx` são
  PRÉ-EXISTENTES); `npm run build` limpo, servidor de produção parado→migrado→rebuildado→religado com
  sucesso.** **Escopo deliberadamente FORA da Fase 1** (fica p/ Fase 2/3, já roteirizado): a tabela
  Notion de verdade (ordenar por coluna, filtro por coluna E/OU, agrupar, edição inline otimista, views
  salvas) tanto em Oportunidades quanto em Contatos; Kanban arrastável sobre o pipeline configurável;
  import CSV com mapeamento de colunas; análises (performance por dono, forecast ponderado); tools
  novas da LexIA (`criar_campanha`/`registrar_gasto`/`converter_lead`/`registrar_atividade`/
  `definir_follow_up`). **User action:** já verificado ponta-a-ponta pelo agente (migração+backfill
  rodados, build+restart do servidor feitos) — falta só a conferência VISUAL: `/comercial` → aba Leads
  → editar um lead → ver campos Responsável/Temperatura/Próxima ação + botão WhatsApp (ícone verde ao
  lado do telefone) + seção Atividades (registrar uma ligação/nota); Configurações → "Pipeline
  comercial" (visível p/ sócio/admin) → renomear/reordenar uma etapa → conferir que a lista "Mover
  para" e o filtro de Etapa na tabela de Leads refletem o nome novo; marcar um lead como perdido → ver
  o motivo vir da lista configurável; abrir uma tarefa e conferir que dá pra vincular a uma oportunidade
  (campo `leadId` novo, sem UI dedicada ainda — só backend). Fases 2+ (grid Notion completo, Kanban,
  import mapeado, analytics, tools LexIA) ficam para quando o usuário quiser seguir.
- **LexIA · OTIMIZAÇÃO DE TOKENS na CRUD em massa (this session, VERIFIED tsc 0, 540/540 testes, eslint limpo,
  NO migration)** (memory `project_lexia_token_economia`, `project_lexia_agent`). O usuário relatou que a última
  conversa "torrou tokens" numa criação em massa. **Diagnóstico direto no `prisma/dev.db`** (tabelas
  `LexiaConversa`/`LexiaMensagem`, que guardam `inputTokens`/`outputTokens` por mensagem): a **conversa #66**
  ("Crie esses projetos, tarefas e subtarefas") gastou **3.511.280 tokens de input** em 48 mensagens para criar
  5 projetos + 17 seções + 50 tarefas (turnos únicos chegaram a **240k tokens**). **Causas-raiz:** (1)
  **re-verificação compulsiva de estado** — a cada "Continue" o modelo rodava `listar_projetos`+`listar_tarefas`+
  5×`detalhe_projeto` ("Vou verificar o estado atual antes de continuar" **9×**), e esses JSONs pesados se
  acumulavam no array de mensagens e eram **reenviados a cada iteração** → O(n²); (2) **uma tool-call por item**
  (72 round-trips de mutação, cada um reenviando todo o contexto); (3) cartão de confirmação por item + snapshots
  de retomada reproduzindo tudo; (4) **`MAX_ITER=8`** baixo demais forçou "Continue" ping-pong (cada reinício
  re-disparava a verificação). **4 alavancas (o usuário escolheu o núcleo 1+2+3+4):** **(1) Tools de LOTE** —
  `criar_tarefas_lote` ([tools/tarefas.ts](src/lib/lexia/agent/tools/tarefas.ts), sem gate de papel como
  criar_tarefa, cada tarefa no mesmo `tarefaChatSchema` obrigatório via helper `chatParaTarefa`) e
  `criar_secoes_lote` ([tools/projetos.ts](src/lib/lexia/agent/tools/projetos.ts), `ROLES_PROJETO_ESCRITA`,
  **devolve os ids** das seções criadas p/ a IA colocar tarefas sem re-detalhar); backend
  `createTarefas` ([tarefas/mutations.ts](src/lib/tarefas/mutations.ts), createMany numa transação, seção
  pré-resolvida numa consulta, **SEM notif por-tarefa** — convenção do instanciarTemplateProjeto) +
  `createSecoes` ([projetos/mutations.ts](src/lib/projetos/mutations.ts)). Colapsa ~72 round-trips → ~5.
  **(2) Compactação de contexto** — `compactarHistorico` puro em [cache.ts](src/lib/lexia/agent/cache.ts):
  substitui o conteúdo de tool_results de LEITURA antigos (`listar_*`/`detalhe_*`/`buscar`) por um placeholder,
  preservando estrutura (mesmo tool_use_id), as últimas 6 mensagens intactas, e mutações/erros/curtos intactos;
  aplicado no ÚNICO ponto de envio `comCacheBreakpoints(compactarHistorico(messages))` em
  [loop.ts](src/lib/lexia/agent/loop.ts) → vale p/ turno vivo E snapshot de retomada; não muta o array real (o
  snapshot de pending fica fiel). **(3) Disciplina no prompt** ([prompt.ts](src/lib/lexia/agent/prompt.ts),
  CORE cacheado — invalida o cache 1× só): novo bullet "CRIAÇÃO EM MASSA & EFICIÊNCIA" (use LOTE; CONFIE nos ids
  retornados; NÃO re-liste/re-detalhe entre criações) + menção às lote tools em TAREFAS/PROJETOS; "UMA ação por
  vez" virou "só UM cartão por vez, mas p/ muitos itens use LOTE". **(4) Orçamento de iteração dinâmico** —
  `MAX_ITER_AUTO=20` em auto-mode (loop.ts), acaba com o ping-pong de "Continue". **Estimativa:** a mesma tarefa
  cairia de ~3,5M para <100k tokens. **(1b, follow-up após o usuário apontar que a conv seguinte #67 ainda
  torrou 149k tokens SEM criar nada — só re-verificando):** o gargalo RAIZ é o SHAPE agêntico — para criar uma
  tarefa numa seção a IA precisa do id da seção, que precisa do id do projeto → o loop é forçado a fases com
  ida-e-volta (cria projeto → lê id → cria seção → lê id → cria tarefa → re-verifica). Fix decisivo: nova tool
  **`criar_estrutura_projetos`** ([tools/projetos.ts](src/lib/lexia/agent/tools/projetos.ts)) recebe a ÁRVORE
  aninhada INTEIRA (projetos → seções → tarefas) numa ÚNICA chamada; backend `montarEstruturaProjetos`
  ([projetos/mutations.ts](src/lib/projetos/mutations.ts)) cria tudo numa transação conectando os ids sozinho —
  a IA emite UM JSON, zero descoberta de id, zero re-verificação. DoR/DoD OPCIONAIS aqui (bulk). Prompt agora
  manda usar `criar_estrutura_projetos` SEMPRE p/ "projeto com seções e tarefas" (uma chamada; um projeto por
  vez se forem muitas, p/ não estourar o max_tokens=8192 do turno). NOTA (limite intrínseco, não é bug): a IA
  gera o conteúdo dos itens como OUTPUT — 123 tarefas com descrição/DoR/DoD são ~dezenas de milhares de tokens
  de saída inevitáveis, e o teto de 8192 tokens/turno obriga alguns turnos; o desperdício que matamos era o
  INPUT (re-envio de estado). **CRÍTICO:** as mudanças SÓ valem após **reiniciar o `next dev`** — a conv #67
  rodou contra o código antigo em memória (não usou as lote tools, repetiu "vou verificar o estado atual").
  Testes novos ([lexia-agent.test.ts](tests/lexia-agent.test.ts), +5):
  gating das lote tools + `compactarHistorico` (compacta leitura antiga, preserva mutação/recente/erro/curto,
  não muta o original). **Verificado: tsc 0; 540/540; eslint limpo. Sem migração. User action:** só visual —
  ligar o modo automático (⚙ na barra) e pedir "crie o projeto X com as seções A/B/C e estas N tarefas…" → a IA
  usa `criar_secoes_lote` e `criar_tarefas_lote` (poucas chamadas, sem re-verificar o estado a cada passo); em
  modo manual, o LOTE gera UM cartão de confirmação para os N itens (antes era um por item). NOTA: as lote tools
  não disparam notificação individual por tarefa (evita spam). Diagnóstico futuro: as colunas
  `LexiaMensagem.inputTokens/outputTokens` no dev.db permitem inspecionar o custo por conversa via SQL.
- **LexIA · fix: modo AUTOMÁTICO pedia confirmação de cada criação (projeto com várias tarefas/seções)
  (this session, VERIFIED tsc 0, 535/535 testes, eslint limpo, NO migration)** (memory `project_lexia_agent`,
  `project_lexia_bar`). Sintoma: mesmo com o modo automático ligado, criar um projeto com várias seções/tarefas
  exigia confirmar CADA criação. **2 causas (achadas por 1 Explore agent + leitura do loop):** (1) **a rota de
  RETOMADA** [/api/lexia/acoes/[id]](src/app/api/lexia/acoes/[id]/route.ts) remontava o `AgentCtx` **sem
  `autoMode` nem `mode`** — então, assim que UM cartão era confirmado, a continuação do turno rodava com
  `autoMode` indefinido (=false) e voltava a propor cartão para cada mutação seguinte (o body do resume só traz
  `{decisao}`; UI→body→/chat→loop já threadava certo — a quebra era só no resume). **Fix:** o resume agora lê
  `getLexiaPrefsRaw` e seta `mode: prefs.agentMode`, `autoMode: prefs.autoMode` (o toggle do composer SEMPRE
  persiste em prefs, então prefs é a fonte fiel). (2) **o loop** ([loop.ts](src/lib/lexia/agent/loop.ts))
  executava só **UMA** mutação por mensagem do assistente em auto-mode (guard `didAutoMutation`) — as demais da
  mesma mensagem viravam erro "Proponha uma ação por vez", gastando iterações (MAX_ITER=8) e podendo travar um
  projeto grande. **Fix:** removido o guard → todas as mutações NÃO-destrutivas da mesma mensagem executam em
  sequência (o modelo emite as N criações em paralelo depois que o container existe; bucket de rate-limit
  "write" é 60/min, folga de sobra). A exclusividade do cartão de confirmação (1 proposta por turno) e o
  caminho destrutivo (excluir/anonimizar sempre confirmam) seguem intactos. **Refactor testável:** a política
  pura virou [agent/auto.ts](src/lib/lexia/agent/auto.ts) `deveAutoExecutar(autoMode,mode,name)` +
  `ehDestrutiva` (loop.ts importava next-auth → não dava p/ testar de lá); 4 casos novos em
  [lexia-agent.test.ts](tests/lexia-agent.test.ts) (auto+agente executa tudo; auto off/plano/destrutiva
  confirmam). **Verificado: tsc 0; 535/535; eslint limpo. Sem migração. User action:** visual — ligar o modo
  automático (⚙ na barra) e pedir "crie um projeto X com as seções A/B/C e as tarefas 1..N" → cria tudo sem
  cartão; confirmar 1 ação num fluxo e ver as seguintes seguirem sozinhas; em modo Plano ou numa exclusão,
  ainda pede confirmação.
- **LexIA · analisar/receber ARQUIVOS .xlsx (Excel) no chat (this session, VERIFIED tsc 0, 531/531 testes,
  eslint limpo, NO migration; +dep `exceljs`)** (memory `project_lexia_bar`, `project_documents_module`).
  Pedido: a LexIA passar a receber e analisar planilhas Excel no chat. A Anthropic NÃO lê `.xlsx` nativamente
  (só imagem/PDF via visão) — então, **diferente do `.docx`** (que é interceptado e importado para o editor,
  0 tokens), o `.xlsx` é **convertido em TEXTO (CSV por aba) no servidor e injetado como bloco de texto** para
  o modelo ANALISAR no loop normal (somar valores, extrair dados, cruzar com clientes/casos etc.). **Decisão:**
  reusar o caminho de texto (como o `.txt`), não importar para lugar nenhum. **Conversor** novo SERVER-ONLY
  [xlsx.ts](src/lib/lexia/anexos/xlsx.ts) `xlsxParaTexto(buffer)` via **`exceljs`** (JS puro, sem binário nativo
  → sem lock do Prisma no Windows): cada aba vira `### Planilha: <nome>` + linhas CSV (escapa aspas/vírgula/
  quebra; normaliza fórmula→resultado, rich text, hyperlink, data→ISO); teto de 40k chars com aviso de
  truncamento. **Escolha da lib:** `exceljs` em vez do SheetJS (`xlsx`) porque o pacote npm do SheetJS trava
  em 0.18.5 com CVEs de parse; o único achado do `npm audit` p/ exceljs é um `uuid` transitivo usado só na
  ESCRITA de planilha — **nós só lemos**, fora do code path. **Pipeline:** `MIME_XLSX`/`ehXlsx` +
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` no allow-list `MIME_PERMITIDOS` (o
  `anexoSchema` Zod deriva daí automaticamente) + `.xlsx` no `ACCEPT_ATTR` + mensagens de formato atualizadas
  em [validacao.ts](src/lib/lexia/anexos/validacao.ts). O builder [agent/anexos.ts](src/lib/lexia/agent/anexos.ts)
  virou **assíncrono** (`anexoParaBloco`/`construirConteudo` → `Promise`) e ganhou o ramo `ehXlsx` → converte
  e devolve `{type:"text"}` (falha degrada com aviso, sem quebrar o turno); os 2 call-sites já eram async
  ([chat/route.ts](src/app/api/lexia/chat/route.ts) `await construirConteudo`, [mutations.ts]
  (src/lib/lexia/mutations.ts) `await anexoParaBloco` na re-hidratação do histórico — mesma conversão vale p/
  turno vivo e histórico). Cliente [components/lexia/anexos.ts](src/components/lexia/anexos.ts): `EXT_MIME`
  ganhou fallback docx/xlsx/txt + mensagem de erro corrigida. **Prompt** ([prompt.ts](src/lib/lexia/agent/prompt.ts))
  bloco ANEXOS cita planilhas (.xlsx já em CSV). **Nada** em schema/migração (MIME no allow-list já basta;
  `temAnexos` roteia p/ Sonnet, ótimo p/ análise). Testes ([lexia-anexos.test.ts](tests/lexia-anexos.test.ts),
  +3): gera um `.xlsx` real com exceljs → `xlsxParaTexto` produz o CSV certo (aspas na célula com vírgula);
  `anexoParaBloco(MIME_XLSX)` vira bloco de texto; `.xlsx` corrompido degrada com aviso (não lança); tudo
  awaited. **Verificado: tsc 0; 531/531; eslint limpo. Sem migração.** **User action (REQUIRED — dep nova):**
  **reiniciar o dev server** (`exceljs` novo no node_modules) → na LexIA, anexar um `.xlsx` pelo clipe e pedir
  "analise esta planilha / some os honorários / quanto gastei com X" → a IA lê os dados e responde; anexar um
  arquivo inválido renomeado p/ .xlsx → a IA avisa que não conseguiu ler.
- **LexIA · CRUD completo de Projetos + gestão de SEÇÕES (this session, VERIFIED tsc 0, 528/528 testes, eslint
  limpo, NO migration)** (memory `project_lexia_agent`, `project_projetos_module`). Pedido: verificar se a LexIA
  tinha CRUD de projetos + organizar as seções deles; se não, implementar. **Diagnóstico:** a IA só tinha
  `listar_/detalhe_/listar_templates_projeto` (readonly) + `criar_projeto`/`instanciar_template_projeto`
  (mutation) — **faltavam editar/excluir projeto, TODA a CRUD de seção, e o `secaoId` nos tools de tarefa**. O
  **backend já estava 100% pronto** ([projetos/mutations.ts](src/lib/projetos/mutations.ts) `updateProjeto`/
  `deleteProjeto`(soft)/`createSecao`/`updateSecao`/`deleteSecao`/`reordenarSecoes`; [tarefas/mutations.ts]
  (src/lib/tarefas/mutations.ts) `createTarefa`/`updateTarefa` já aceitam `secaoId` validado por `resolverSecao`)
  — só a camada de ferramentas da IA precisava. **Decisões travadas:** todas as escritas novas gateadas a
  sócio/advogado (`ROLES_PROJETO_ESCRITA`, igual ao atual); e sim, expor `secaoId` nos tools de tarefa. **Feito
  em [tools/projetos.ts](src/lib/lexia/agent/tools/projetos.ts):** 6 tools novos — `editar_projeto` (card com
  diff via `diffRow`; status arquivado/pausado/concluido), `excluir_projeto` (soft, reversível), `criar_secao`/
  `editar_secao`/`excluir_secao`/`reordenar_secoes`; + `detalhe_projeto` enriquecido para retornar as `secoes`
  (id/nome/cor/ordem) — a IA descobre os ids de seção aí. Deletes nomeados `excluir_*` → o guard `ehDestrutiva`
  do loop força confirmação mesmo em auto-mode. **[tools/tarefas.ts](src/lib/lexia/agent/tools/tarefas.ts):**
  `criar_tarefa` ganhou `secaoId`; `editar_tarefa` ganhou `projetoId`+`secaoId` (mover tarefa entre projetos/
  seções; backend trata `projetoEfetivo`). **Prompt** ([prompt.ts](src/lib/lexia/agent/prompt.ts)) bloco
  PROJETOS estendido. **Nada** em registry.ts (projetosTools já no spread), cards.ts (projeto não gera card),
  schema/migração. Teste de gating estendido ([lexia-agent.test.ts](tests/lexia-agent.test.ts)) com os 6 novos
  tools de escrita. **Verificado: tsc 0; 528/528; eslint limpo. Sem migração. User action:** só visual — na
  LexIA como **sócio**: "renomeie/arquive o projeto X" (card com diff), "crie as seções Contratos/Andamento/
  Concluído no projeto Z", "detalhe o projeto Z" (traz as seções com ids), "mova a tarefa W para a seção
  Contratos", "exclua a seção Andamento" (as tarefas viram "sem seção", não somem). Como estagiário/staff a IA
  recusa (as ferramentas nem aparecem para o papel).
- **Tarefas · sistema de COMENTÁRIOS (menções @colega/@todos + notificação in-app/e-mail) (prev session,
  VERIFIED tsc 0, 528/528 testes, eslint limpo nos arquivos autorais, migração `20260720144438` já APLICADA
  nesta sessão)** (memories `project_tarefas_module`, `project_notifications`). Seção **Comentários** no fim da
  coluna esquerda do [TaskDetailModal.tsx](src/components/tarefas/TaskDetailModal.tsx): qualquer usuário ativo
  comenta; menção `@colega`/`@todos` com autocomplete; os ENVOLVIDOS (responsável + criador + quem já comentou)
  + mencionados são avisados **no app e por e-mail com o corpo do comentário** — nunca o autor; participante que
  também foi mencionado recebe 1× (dedup por Set). **Decisões travadas:** autor edita+exclui os próprios /
  admin+sócio excluem qualquer; `@todos` = só os envolvidos (não o escritório inteiro); **SEM anexos no v1**
  (fase 2, modelo pronto p/ um `ComentarioAnexo` depois). **Modelo** novo `TarefaComentario`
  ([schema.prisma](prisma/schema.prisma), espelha `Anotacao`; autor = **FK `autorId`** p/ reusar `AssigneeAvatar`;
  **`onDelete: Cascade` OBRIGATÓRIO** pois `deleteTarefa` é hard-delete; menções = tokens `@[id]`/`@[todos]`
  inline no `conteudo`, sem cache; `editadoEm` distinto de `updatedAt`). **Núcleo PURO**
  [comentario-core.ts](src/lib/tarefas/comentario-core.ts) (`parseMencoes`/`segmentosComentario`/
  `serializeMencoes`/`destinatariosComentario`) + [comentario-msg.ts](src/lib/notificacoes/comentario-msg.ts)
  (`msgComentarioTarefa`/`comentarioEmailHtml`, escapa HTML). **lib**
  [comentarios.ts](src/lib/tarefas/comentarios.ts) (list/criar/editar/excluir; IDOR escopado ao `tarefaId`;
  autor-only edita, autor|admin|sócio exclui — via novo `usuarioPorEmail` em
  [recipients.ts](src/lib/notificacoes/recipients.ts)) + Zod em [schemas.ts](src/lib/tarefas/schemas.ts).
  **Rotas** `/api/tarefas/[id]/comentarios` (GET/POST) + `[comentarioId]` (PATCH/DELETE) via `runMutation`; POST
  em `withRequestOrigin` (URL absoluta do e-mail). **Notificação** trigger `notificarComentarioTarefa`
  ([triggers.ts](src/lib/notificacoes/triggers.ts)); e-mail com corpo real pelo ÚNICO caminho existente (campos
  OPCIONAIS `emailCorpoHtml`/`emailCtaLabel` em service/enviar/render — callers/tests antigos intactos, sem envio
  duplo); **sem migração na `Notificacao`/prefs** (usa `modulo:"tarefas"`, herda os toggles existentes). **UI**
  [Comentarios.tsx](src/components/tarefas/Comentarios.tsx) (thread + composer com popover de menção acessível por
  teclado, filtra o `TeamMember[]` em memória — sem endpoint novo; updates otimistas; menções realçadas por nós
  React — anti-XSS, sem `dangerouslySetInnerHTML`); ícones `messageSquare`/`atSign` em
  [tf-icons.tsx](src/components/tarefas/tf-icons.tsx). **Comportamentos notáveis:** `@todos` hoje NÃO adiciona
  destinatários (os envolvidos já são todos avisados — é ênfase no corpo, expansão pronta se a regra mudar);
  menção só dispara quando **escolhida no autocomplete** (digitar "@x" solto não gera token). Testes puros novos:
  [tarefas-comentario-core.test.ts](tests/tarefas-comentario-core.test.ts) +
  [notificacoes-comentario-msg.test.ts](tests/notificacoes-comentario-msg.test.ts) (22). **Verificado: tsc 0;
  528/528; eslint limpo; migração já aplicada + client gerado nesta sessão. User action:** só **visual** —
  abrir uma tarefa (`/tarefas?tarefa=<id>`) → seção Comentários; comentar como A, `@mencionar` um colega →
  o mencionado + envolvidos recebem toast/sino (e e-mail se Graph/SMTP configurado, com o corpo + "Abrir
  tarefa"); o autor não recebe; editar o próprio (tag "editado"); excluir o próprio, e como admin/sócio excluir
  o de outro; como usuário comum, o botão de excluir não aparece nos comentários alheios.
- **Tarefas & Projetos · SEÇÕES personalizadas dentro de projetos (estilo Todoist) (this session, VERIFIED
  tsc 0, 506/506 testes, arquivos autorais eslint limpos, 1 migração ÚNICA)** (memories `project_tarefas_module`,
  `project_projetos_module`). Pedido: dentro de um projeto, criar **seções personalizadas** no lugar do kanban
  por status fixo. Não existia conceito de seção/coluna por projeto — feature greenfield. **Decisões travadas
  com o usuário:** (1) **seções viram as COLUNAS do quadro** do projeto (o status vira só o check de concluído);
  (2) a **Lista** do projeto também agrupa por seção (cabeçalhos recolhíveis + adicionar tarefa por seção); (3)
  **seções fazem parte dos templates** (instanciar cria as seções e distribui as tarefas). **Fora de escopo v1:**
  reordenar tarefas manualmente DENTRO da seção (card segue ordenado por data), tools de seção na LexIA, bulk
  "mover p/ seção". **Modelo (migração `20260721000000_projeto_secoes`, ADITIVA — 2 tabelas + 2 colunas
  nullable):** `ProjetoSecao {projetoId(FK cascade), nome, cor?, ordem}`; `Tarefa.secaoId Int?`
  (`onDelete: SetNull` → excluir a seção manda as tarefas p/ "Sem seção", nunca apaga); templates ganham
  `ProjetoTemplateSecao` + `ProjetoTemplateTarefa.secaoOrdem Int?` (o item referencia a seção-modelo pelo
  ÍNDICE `ordem`, evitando malabarismo de FK id no replace-all do editor). **Backend:** `SecaoView` +
  `ProjetosDataset.secoes` (chapado, todas as seções dos projetos vivos) em [projetos/types.ts](src/lib/projetos/types.ts);
  `TaskRow.secaoId` ([tarefas/types.ts](src/lib/tarefas/types.ts)); mutations `createSecao/updateSecao/deleteSecao/
  reordenarSecoes` + `createTarefa/updateTarefa` aceitam `secaoId` (helper `resolverSecao` valida que a seção
  pertence ao projeto da tarefa; trocar de projeto zera a seção) em [projetos/mutations.ts](src/lib/projetos/mutations.ts)/
  [tarefas/mutations.ts](src/lib/tarefas/mutations.ts); template create/update replace-all das seções + `secaoOrdem`;
  `instanciarTemplateProjeto` cria as `ProjetoSecao` reais e mapeia `secaoOrdem→secaoId` (padrão do `respMap`);
  leituras `getProjetosDataset`/`getTarefasDataset`/`getTemplates` incluem seções; `workspace.ts` carrega `secoes`.
  Rotas novas [POST /api/projetos/[id]/secoes](src/app/api/projetos/[id]/secoes/route.ts),
  [PATCH|DELETE .../[secaoId]](src/app/api/projetos/[id]/secoes/[secaoId]/route.ts),
  [PUT .../reordenar](src/app/api/projetos/[id]/secoes/reordenar/route.ts) (runMutation, roles `ROLES_PROJETO_ESCRITA`).
  **Frontend:** `TarefasContext` ganhou `secoes` + `secoesDoProjeto(projetoId)`; novo componente
  [SecoesBoard.tsx](src/components/projetos/SecoesBoard.tsx) (colunas = seções + "Sem seção" + "+ Adicionar seção";
  arrastar card → `onAssign` grava `secaoId`; header renomeia inline/cor/excluir/mover ‹›; reusa o `KanbanCard`
  exportado de views.tsx) — é NOVO (não o `QuadroView` compartilhado, que a aba cross-project "Todas" mantém por
  status); `ListaView` ganhou `groupBy:"secao"` (recolhível + `InlineAdd` por seção; opção só aparece dentro do
  projeto); `ProjectCanvas` troca o quadro por `SecoesBoard` e injeta a opção "Seção" no Agrupar;
  `TaskDetailModal` ganhou seletor de Seção (quando a tarefa tem projeto+seções); `ProjetosWorkspace` guarda o
  estado `secoes` + handlers otimistas (add/rename/recolor/delete espelhando o SetNull local/reorder/assign/
  newTaskInSection); editor de template ([TemplatesTab.tsx](src/components/projetos/TemplatesTab.tsx)) ganhou
  faixa de Seções (add/nome/cor/reordenar) + seletor de seção por item (ref estável `secaoKey`↔`secaoOrdem`).
  Ícone `chevronUp` adicionado a [tf-icons.tsx](src/components/tarefas/tf-icons.tsx). Teste novo
  [tests/projetos-secoes.test.ts](tests/projetos-secoes.test.ts) (8: propagação de `secaoOrdem` na instanciação +
  parse dos schemas). **Verificado: tsc 0; 506/506 testes; arquivos autorais eslint limpos** (as achados
  set-state-in-effect/`prev=due`/`setName` nos 3 grandes componentes são PRÉ-EXISTENTES; +1 instância do MESMO
  padrão pré-existente: o seed `setSecoes(dataset.secoes)`, espelho fiel dos `setTasks`/`setProjetos` adjacentes,
  necessário p/ re-hidratação). **NOTA Prisma (Windows):** rodei `prisma generate` p/ checar tsc — os TIPOS foram
  regenerados mas o **engine DLL ficou travado** pelo `next dev` (EPERM), deixando o client meio-gerado. **User
  action (OBRIGATÓRIO):** parar `next dev` → `npm run db:migrate` (aplica a migração) → `npm run db:generate`
  (reconcilia o engine) → `npm run dev`. Visual em `/tarefas` → aba Projetos → um projeto: **Quadro** mostra "Sem
  seção" + "+ Adicionar seção" (criar/arrastar entre seções/renomear/cor/reordenar/excluir → tarefas voltam p/
  "Sem seção"); **Lista** → Agrupar por **Seção** (recolhível + adicionar por seção); abrir tarefa → seletor de
  Seção; **Templates** (sócio) → editar → criar seções + atribuir itens → **Usar template** cria o projeto com as
  seções e as tarefas distribuídas.
- **Notificações · sócios avisados de toda tarefa concluída (this session, VERIFIED tsc 0, 483/483 testes,
  eslint sem achados novos, NO migration)** (memory `project_notifications`). Pedido do admin: os sócios
  precisam saber sempre que **alguém que não eles** conclui uma tarefa, **independente de quem criou**, no app
  e no e-mail. Antes, [notificarTarefaConcluida](src/lib/notificacoes/triggers.ts) avisava **só o criador**
  (`criadoPorId`) — sócio que não criou nunca ficava sabendo. **Decisões travadas:** regra **ligada por
  padrão** (admin desliga); o sócio tem **opt-out aninhado** — desliga só as conclusões da equipe (segue
  recebendo as demais notificações de tarefa) ou desliga o módulo Tarefas inteiro e não recebe nada.
  **Regra global (admin)** em [settings.ts](src/lib/settings.ts): `notificacoesSchema`/`NotificacoesConfig`/
  key `notificacoes` + `getNotificacoesConfig`/`setNotificacoesConfig` + predicado puro
  `avisarGestoresConclusao(cfg) => cfg.tarefaConcluidaGestores !== false` (cópia do padrão de `modulos`, k/v
  `AppSetting` → **sem migração**); rota nova [/api/settings/notificacoes](src/app/api/settings/notificacoes/route.ts)
  (GET qualquer autenticado — a tela de prefs lê p/ decidir o que mostrar; PUT `runMutation` `roles:["admin"]`,
  action `settings.notificacoes`). **Pref pessoal** `tarefasConclusaoEquipe` (opt-out) em
  [preferencias-core.ts](src/lib/notificacoes/preferencias-core.ts) + helper puro `querConclusoesEquipe`
  (re-exportado por `preferencias.ts`) + Zod em [schemas.ts](src/lib/notificacoes/schemas.ts) (o schema é
  `.strict()` e `setPrefs` substitui o blob inteiro → campo novo exige schema + UI). **Fan-out** (único ponto
  de política, no trigger): monta um `Set` de destinatários = criador (regra de hoje intacta, pula o ator) +
  gestores via `gestorEmails()` quando a regra global está ligada, pulando o ator, quem já está no Set (sócio
  criador não recebe 2×) e quem tem `querConclusoesEquipe === false`; mesma mensagem de `msgTarefaConcluida`
  (já nomeia quem+quando), prioridade `normal` (`baixa` nunca envia e-mail), sem grupoKey/dedupeKey. Os
  toggles App/E-mail do módulo `tarefas` seguem mandando em tudo (via `criarNotificacao`). `tarefas/mutations.ts`
  NÃO mudou. **UI** ([CrmSettings.tsx](src/components/crm/overlays/CrmSettings.tsx) `NotificacoesSection`):
  linha aninhada e indentada sob a tabela de módulos ("Conclusões de tarefas da equipe", só p/ admin/sócio e só
  quando a regra global está ligada — senão seria inerte), salva no botão de prefs que já existe; + card
  "Regra do escritório" (só admin) com salvamento **otimista sem botão** espelhando `ModulosSection`
  (`get/putNotificacoesConfig` novos em [crm-api.ts](src/components/crm/crm-api.ts)). Testes puros novos em
  [notificacoes-prefs.test.ts](tests/notificacoes-prefs.test.ts) (3). **Verificado: tsc 0; 483/483 testes;
  eslint sem achados novos** (`_realRole`/`_dataset` em CrmSettings são PRÉ-EXISTENTES). **Sem migração.
  User action:** visual — concluir uma tarefa como usuário A → um sócio B que não criou recebe toast/sino +
  e-mail nomeando quem concluiu e quando; quem concluiu não recebe; criador recebe uma vez só. Configurações →
  Notificações → desligar "Conclusões de tarefas da equipe" (sócio) → para essa cópia mas segue recebendo
  tarefa delegada; como admin, "Regra do escritório" → desligar → volta ao comportamento antigo (só o criador).
  E-mail exige Graph/SMTP (sem backend o mailer é noop, só loga).
- **Honorário = recebimento financeiro — Fase 1 do cutover `Honorario`→`Lancamento` (this session, VERIFIED
  tsc 0, 495/495 testes, eslint sem achado novo; migração + backfill = passos do USUÁRIO).** O usuário
  apontou que `Honorario` não deveria ser entidade separada — honorários são recebíveis (lançamentos entrada).
  Confirmado: o `Lancamento` já é a fonte única de todo o dinheiro; `Honorario` era uma **camada paralela**
  (o import da Astrea já cria o `Lancamento` entrada e liga `Honorario.lancamentoId`). **Decisões travadas:**
  por fases (Fase 1 = cutover funcional, tabela `Honorario` fica **dormente**; Fase 2 = derrubar tabela +
  código morto); **Contrato = visão derivada** (sem entidade nova). **Passo 0 (drift):** removidos os órfãos do
  "Contrato entity" abandonado (`src/lib/finance/contrato.ts`, `scripts/backfill-contratos.ts`,
  `scripts/diagnostico-contratos.ts`, `tests/finance-contrato.test.ts`) — some com os 5 erros de tsc
  pré-existentes; a migração da Fase 1 reconcilia o schema↔DB (o `prisma migrate dev` gera o drop das tabelas
  `Contrato`/`ContratoResponsavel` vazias + as colunas novas). **Schema:** `Lancamento` += `tipoHonorario`
  (recorrente/parcelado/exito/avista), `valorLiquidoCents`, `metodoPagamento`, `@@index([subTipo])`; `Lead` +=
  `lancamentoId` (relação `LeadLancamento`; `honorarioId` fica dormente). **Núcleo:** const `FEE =
  {tipo:'entrada',subTipo:'honorario',isAnomalia:false}` + mapper PURO `lancamentoToHonorarioRow` e
  `aggFeeTotals` em [honorario-map.ts](src/lib/finance/honorario-map.ts). **Leituras cortadas p/ FEE:**
  `getHonorarios`/`getComposition`(group by tipoHonorario)/`getHonorarioTotals`/`getHonorarioDetail`(id agora é
  de LANÇAMENTO; série+parcelas vêm do grupo de recorrência)/`getContratos`/`getCasosSemFee`/`getImportSummary`
  em [finance/queries.ts](src/lib/finance/queries.ts); `getClienteDetail` ([clientes/queries.ts](src/lib/clientes/queries.ts));
  `getCasoDetail` ([casos/queries.ts](src/lib/casos/queries.ts)); `search.ts` (contratos); `briefing.ts`
  (ticket médio + casos-sem-honorário); comercial `receitaRecebidaCents` ([comercial/queries.ts](src/lib/comercial/queries.ts)).
  **Escritas:** wrapper `createHonorarioLancamento` (permite valor 0) em [finance/mutations.ts](src/lib/finance/mutations.ts);
  a rota `POST /api/financeiro/honorarios` (usada pelo botão "Lançar honorário") **repurposada** p/ criar
  fee-lançamento; `converterLead` ([comercial/mutations.ts](src/lib/comercial/mutations.ts)) cria fee-lançamento
  + seta `Lead.lancamentoId`; `pagarLancamento` aceita `contaId`; `novoLancamentoSchema`/`pagarLancamentoSchema`
  estendidos. **Risco do id (honorário→lançamento) resolvido:** nova rota
  [GET /api/financeiro/lancamentos/[id]/contrato](src/app/api/financeiro/lancamentos/[id]/contrato/route.ts) +
  `crm-api` repontado (detalhe + pagar→`/pagar`, desmarcar→`/reabrir`); Spotlight/search já usam ids de
  lançamento. **LexIA:** `listar_/detalhe_honorario` agora leem lançamentos; **removidas** `editar_honorario`/
  `excluir_honorario` (redundantes) e `vincular_honorario_processo` (fee-lançamento já tem processoId). Backfill
  NÃO destrutivo [scripts/backfill-honorarios-lancamentos.ts](scripts/backfill-honorarios-lancamentos.ts)
  (`db:backfill:honorarios`): **só CARIMBA** o lançamento já ligado (metadado — verificado 288/288 já eram
  subTipo='honorario', valores 1:1, ZERO duplicidade) + reponta `Lead.honorarioId`→`lancamentoId`. Os 13
  honorários SEM lançamento (10 parcelas Lucilene R$10k, 2 avulsos sem cliente/caso R$25k, 1 stub R$0) foram
  **DESCARTADOS por decisão do usuário** — o backfill NÃO cria lançamento p/ eles (somem das telas; a tabela
  Honorario dormente é derrubada na Fase 2). Teste puro novo [tests/honorario-map.test.ts](tests/honorario-map.test.ts).
  **DEFERIDO (Fase 2 / follow-up):** derrubar a tabela `Honorario` + rotas/mutations/schemas dormentes +
  `Lead.honorarioId`; cortar as leituras de honorário do módulo **Processos** (`processos/{queries,associacao,
  saude}.ts` — ainda leem `Honorario`; o módulo está desativado no ambiente do usuário) e o importer Astrea
  (ainda cria `Honorario`; após re-import, rodar o backfill). **Verificado: tsc 0; 495/495; eslint só o aviso
  pré-existente `AcertoSocioLado`. User action (REQUIRED — lock do Prisma no Windows):** parar `next dev` →
  `npm run db:migrate` (gera/aplica: drop das tabelas Contrato vazias + colunas novas de Lancamento/Lead) →
  `npm run db:generate` → **`npm run db:backfill:honorarios`** (1×) → `npm run dev`. Conferir: `/contratos` e a
  aba Contratos do cliente listam os honorários (agora lançamentos); "Lançar honorário" num caso sem fee →
  some da lista + aparece em Contratos; ganhar um lead com valor → cria fee-lançamento; LexIA (sócio) "liste os
  honorários" vem dos lançamentos; abrir um contrato → modal com parcelas + "Marcar recebido".
- **LexIA · Financeiro — tools de EDITAR/EXCLUIR faltando (não conseguia reagrupar parcelas/registrar
  adiantamento) (this session, VERIFIED tsc 0, 497/497 testes, eslint limpo, NO migration)** (memory
  `project_lexia_agent`). Sintoma do usuário: pediu p/ a LexIA registrar um adiantamento de honorários (10
  parcelas de R$1k viram 3×R$3k + 1×R$1k) e ela "ficou buscando" e não conseguiu **editar** nem **excluir**
  as parcelas excedentes. **Causa:** as tools financeiras da LexIA só tinham `criar_lancamento`/`pagar_lancamento`/
  `excluir_lancamento` (single) — **sem editar_lancamento** e **sem NENHUMA tool de mutação de honorário** (só
  os readonly `listar_honorarios`/`detalhe_honorario`), embora o backend já tivesse `updateLancamento`/
  `bulkLancamentos`/`updateHonorario`/`deleteHonorario`. A enumeração já existia (`detalhe_cliente` devolve
  TODOS os lançamentos+honorários do cliente com ids, em qualquer data — melhor que `listar_lancamentos`, que é
  por período). **Fix ([tools/financeiro.ts](src/lib/lexia/agent/tools/financeiro.ts)):** 4 tools novas
  (confirmation-gated) — **`editar_lancamento`** (patch parcial via `updateLancamento`: descrição/valor/
  vencimento/status; reassina o valor pelo tipo) e **`editar_honorario`** (via `updateHonorario`, reusa
  `honorarioPatchSchema`) sob `ROLES_FINANCEIRO`; **`excluir_lancamentos`** (LOTE, por lista de ids, via
  `bulkLancamentos(ids,"excluir")`) e **`excluir_honorario`** (single) sob `["socio"]` (sensível, como
  `excluir_lancamento`/`acerto_socios`). Descrições apontam p/ `detalhe_cliente` como fonte dos ids e citam o
  caso de uso "reagrupar/adiantar honorários". A `recorrenteParent` self-relation é opcional (default SetNull →
  excluir parcelas soltas é seguro; a UI interativa já faz isso). Registry auto-registra+gateia por `roles`
  (sem name-set fixo p/ financeiro). Testes: `tests/lexia-agent.test.ts` estendido (editar_* p/ finance/sócio/
  admin e ocultos p/ Equipe; excluir_lancamentos/excluir_honorario só sócio; financeiro pode editar mas não
  excluir). **Verificado: tsc 0; 497/497; eslint limpo. Sem migração. User action:** pedir à LexIA (como
  Sócio) "registre o adiantamento da cliente X: as 10 parcelas de 1k viraram 3 de 3k e 1 de 1k" → ela usa
  `detalhe_cliente` p/ pegar os ids, `editar_lancamento` p/ ajustar valores e `excluir_lancamentos` p/ remover
  as excedentes (cada mutação pede confirmação; exclusão em lote numa confirmação só).
- **CRM · Cliente/Contato — CRUD completo de lançamentos (tabela do Financeiro reusada, travada no cliente) +
  edição em lote (this session, VERIFIED tsc 0 nos arquivos tocados, 497/497 testes, eslint sem achados novos,
  NO migration).** A aba Financeiro do detalhe do cliente tinha só uma lista somente-leitura (`CrmLancRow`) +
  modal de criação enxuto. Agora, para **Sócio/Financeiro/Admin** (`verFinanceiro(role)`), renderiza a MESMA
  `LancamentosTable` do Financeiro geral (CRUD + bulk pagar/reabrir/excluir + filtros Tipo/Status/Categoria/
  Atraso + busca + CSV + totais), **travada no cliente atual**. Equipe (advogado/estagiário/staff) continua
  somente-leitura (política `project_financeiro_visibilidade` preservada). Decisões do usuário: manter leitura
  p/ Equipe; ambos os tipos (a receber E a pagar), idêntico ao Financeiro. **Reuso, não recriação:**
  [LancamentosTable.tsx](src/components/financeiro/interativo/LancamentosTable.tsx) ganhou 3 props opcionais —
  `lockCliente {id,nome}` (repassa ao modal, novo+edição), `onRefresh` (a tela do cliente recarrega via
  `fetchClienteDetail`, não `router.refresh()`), e `embedded` (altura natural + sem padding lateral de 40px +
  pula `useReportBottomBar`, pois a aba do CRM é fluxo normal com `maxWidth:1240`; overrides inline nas recipes
  `lancRoot`/`filterBar`/`tableScroll`/`totalsBar`). [NovoLancamentoModal.tsx](src/components/financeiro/interativo/NovoLancamentoModal.tsx)
  ganhou `lockCliente`: trava o campo "Contato" (dir "in") e SEMPRE anexa `clienteId` ao payload. **Robustez
  (backend):** `criarLancamentos`/`editarLancamento` resolviam o cliente **por nome** (`resolveRefs`) — frágil
  (nome não bate → `clienteId` nulo → o lançamento novo sumia da lista filtrada). Novo campo `clienteId` em
  [schemas.ts](src/lib/finance/schemas.ts) `novoLancamentoSchema` (idOpt) + `NovoLancamentoInput`
  ([mutations.ts](src/lib/finance/mutations.ts)); ambas as mutations usam `input.clienteId ?? refs.clienteId`
  (Financeiro geral não envia → comportamento inalterado). **Dados:** `getClienteDetail`
  ([clientes/queries.ts](src/lib/clientes/queries.ts)) agora roda `Promise.all` das 4 lookups
  (`getCategoriaOptions/getClienteOptions/getFornecedorOptions/getContaOptions`) e devolve `lancOptions`
  (`LancOptions`) no `ClienteDetail` ([clientes/types.ts](src/lib/clientes/types.ts); `crm-types.ts` re-exporta
  automaticamente); rota `/api/clientes/[id]` herda. **Limpeza:** removido o `CrmLancamentoModal` órfão de
  [CrmClienteModals.tsx](src/components/crm/pages/CrmClienteModals.tsx) + o union `{type:"lancamento"}` +
  imports mortos (createLancamento/FxSegmented/parseBRLToCents). Teste novo
  [tests/lancamento-cliente-scoped.test.ts](tests/lancamento-cliente-scoped.test.ts) (4 casos: `clienteId`
  sobrevive ao parse do schema — guard contra a regressão que quebraria o vínculo). **Verificado: tsc 0 nos
  arquivos tocados** (5 erros pré-existentes em `finance-contrato.ts/.test.ts` — WIP da entidade Contrato,
  fora do escopo); **497/497 testes; eslint sem achados novos** (set-state-in-effect em LancamentosTable/
  CrmClienteDetail são PRÉ-EXISTENTES, confirmado via baseline `git stash`). **Sem migração** (`clienteId` já
  existe em `Lancamento`). **User action:** visual em `/contatos/[id]` → aba Financeiro como Sócio: tabela
  idêntica à do Financeiro, só os lançamentos deste cliente; "Novo lançamento" com Contato travado → criar
  aparece na lista sem recarregar a página; clicar numa linha → editar; menu ⋮ → excluir/reabrir; selecionar
  várias → dar baixa/reabrir/excluir em lote. Logar como Equipe (ex.: `staff`) → segue somente-leitura.
- **Comercial · fix: valor contratado de lead ganho = receita real do caso → honorário do lead → estimativa
  (this session, VERIFIED tsc 0, 473/473 testes, eslint limpo, NO migration).** Investigando o dev.db do
  usuário (caso Thiago) descobri o motivo real do "valor contratado R$ 0": o escritório fecha o contrato
  **lançando a RECEITA no Financeiro** (`Lancamento` `tipo=entrada, subTipo=honorario`, ligado ao caso), NÃO
  criando registro `Honorario`. O Thiago: Lead #37 entrou 08/06, ganho, cliente #512, **estimativa 2.400**,
  mas casoId/honorarioId nulos; o caso#137 tem 0 `Honorario`; os R$2.400 estão em 2 entradas (lanc#456 R$2.200
  subTipo honorário casoId=137 + lanc#465 R$200 "Consulta"). O `valorContratado` só lia `Honorario` → 0.
  **Decisão do usuário: "Ambos"** — valor de um lead ganho segue, nesta ordem: (1) **receita REAL do caso** =
  `Honorario`s do caso + entradas de honorário do caso NÃO espelhadas por um `Honorario` (novo `casoRevenueCents`
  em [queries.ts](src/lib/comercial/queries.ts) filtra `lancamento.honorarios.length===0` p/ não contar em
  dobro a entrada Astrea que espelha um Honorário importado); (2) **honorário ligado ao lead**; (3) **estimativa
  do lead** (`valorEstimado` — o valor de fechamento digitado no fluxo rápido de "ganho"). Reverte a regra
  anterior "só honorário real, sem estimativa" (que zerava leads recém-fechados). [valor.ts](src/lib/comercial/valor.ts)
  `LeadValorInput` trocou `casoHonorariosCents`→`casoRevenueCents` +`estimadoCents`; dedup por caso mantida.
  `casoRevenueInclude` (select compartilhado: honorarios + lancamentos entrada/honorario) alimenta
  `getComercialKpis` (servidor: Início/LexIA) e `getComercialDataset` (cliente). **Verificado END-TO-END no
  dev.db:** Thiago passou a valer **R$ 2.400** (via estimativa, pois o lead não está ligado ao caso; se vincular
  o caso passa a ler os R$2.200 de receita real) e junho mostra Conversões 1 · Investimento R$ 9.192,28 · Valor
  contratado R$ 2.400 · ROI −74% (cliente == servidor). Testes: [tests/comercial-valor.test.ts](tests/comercial-valor.test.ts)
  reescrito p/ o novo shape + precedência (receita>honorário>estimativa, dedup, fallback do Thiago). Diagnóstico
  [scripts/diagnostico-comercial.ts](scripts/diagnostico-comercial.ts) atualizado (mostra receita do caso +
  estimativa + de onde o valor veio). **tsc 0; 473/473; eslint limpo; sem migração. User action:** deploy →
  junho mostra R$ 2.400. Opcional: vincular o Lead #37 ao caso#137 (ou usar "Converter") p/ ler a receita real
  lançada em vez da estimativa. Restam os 5 gastos de campanha #471–475 (venc nulo, lanç. julho) fora de junho.
- **Comercial · fix: gastos de junho não apareciam + atribuição de conversão UNIFICADA por ENTRADA + default
  de data + diagnóstico (this session, VERIFIED tsc 0, 472/472 testes, eslint limpo, NO migration).** Sintoma:
  contrato ganho + gastos de anúncios lançados, mas junho mostrava Investimento R$ 0 E Valor contratado R$ 0.
  Os dois fixes anteriores (categoria por nome; valor pelo caso) já estavam commitados+pushados → era DADOS/
  semântica (confirmado no dev.db). **(A) Ad spend por COMPETÊNCIA** — novo `spendPeriodo` em
  [comercial/queries.ts](src/lib/comercial/queries.ts): o gasto pertence ao mês de `dataVencimento ??
  dataLancamento` (OR em SQL — Prisma não tem COALESCE-in-range); aplicado em `spendWhere`
  (getComercialKpis/getOrigemBreakdown), `getCampanhas`, e no `getComercialDataset` (select ganhou
  `dataVencimento`; `CmDatasetGasto.data` agora é a competência). Corrige o Investimento: o gasto lançado em
  julho com venc-junho passa a contar em junho. **(B) Atribuição de conversão por mês de ENTRADA/CONTATO
  (regra do usuário: um lead de junho é resultado de junho mesmo fechando meses depois — foi a verba/estratégia
  de junho que o trouxe).** *Nota:* numa 1ª tentativa desta sessão eu troquei para mês da CONVERSÃO e o usuário
  CORRIGIU — revertido. O CLIENTE ([cm-meta.ts](src/components/comercial/cm-meta.ts)) já era por entrada (helper
  `ganhosDoPeriodo` = `etapa==="ganho" && sc.test(dataEntrada)`, usado em cmKpis/cmChannels/cmCampaignStats/
  cmTrend; cmFunnel idem). O SERVIDOR estava INCONSISTENTE (usava `dataConversao`) — **alinhado**:
  `getComercialKpis`, `getCampanhas` e `getOrigemBreakdown` agora filtram ganhos por `dataEntrada`. Agora
  cliente (tela Comercial) e servidor (Início/LexIA/export) contam igual. **CONSEQUÊNCIA:** o valor de um lead
  ganho aparece no mês em que o lead ENTROU; se ele entrou antes, conta no mês anterior (não no de fechamento).
  **(C) Default de data** — `cmDefaultDateFor(ref,period)` (hoje se o período em visão inclui hoje, senão o
  ÚLTIMO dia do período); `CmGastoModal` ganhou prop `defaultData` (ligado no
  [ComercialApp.tsx](src/components/comercial/ComercialApp.tsx)); e o `venc` HARDCODED `"2026-06-15"` do
  [NovoLancamentoModal.tsx](src/components/financeiro/interativo/NovoLancamentoModal.tsx) virou `todayISO()`.
  **Diagnóstico reutilizável** (read-only) [scripts/diagnostico-comercial.ts](scripts/diagnostico-comercial.ts):
  `npx tsx scripts/diagnostico-comercial.ts 2026-06` explica linha-a-linha por que cada número zera + aponta os
  gastos fora do mês e os leads ganhos sem caso/honorário (roda contra o DATABASE_URL de prod; NÃO grava).
  **Verificado END-TO-END no dev.db** (reproduz o print): junho → Investimento **R$ 9.192,28** (via competência;
  cliente == servidor). **Valor contratado segue R$ 0 em junho** porque o ÚNICO lead ganho que ENTROU em junho
  (Thiago #37) não tem caso/honorário vinculado — atribuição por entrada está certa; falta LINKAR o honorário
  (Converter / vincular caso). Testes: 5 novos em [tests/cm-meta.test.ts](tests/cm-meta.test.ts) (atribuição por
  entrada + `cmDefaultDateFor`). **tsc 0; 472/472; eslint limpo; sem migração. User action:** deploy → junho
  mostra o investimento; para o VALOR aparecer, vincular o honorário ao lead ganho de junho (Converter/caso).
  Restam 5 gastos de campanha (#471–475, venc=null lançamento=julho) que caem em julho — re-datar se forem de
  junho; o diagnóstico aponta quais.
- **Notificações de tarefas — mensagens específicas (quem/quando) + relatório diário por e-mail (this
  session, VERIFIED tsc 0, 480/480 testes, eslint limpo, NO migration)** (memory `project_notifications`).
  Pedido: as notificações de tarefa eram genéricas ("Nova tarefa para você", "Tarefa concluída") e não diziam
  **quem delegou / quem concluiu / quando**; e faltava um **relatório diário por e-mail** das tarefas
  atrasadas/do dia, com **horário + opt-in configuráveis**. **Decisões travadas:** relatório cobre minhas
  tarefas + (sócio/admin) resumo das atrasadas da EQUIPE; "do dia" = por `prazo` (atrasadas + prazo hoje);
  dia vazio → envia "tudo em dia"; opt-in **ligado por padrão** (opt-out), hora padrão **08:00**. Sem migração
  (reusa `User.notifPrefs` JSON + k/v `AppSetting`). **Parte 1 (evento, app+e-mail juntos — o e-mail de evento
  reusa `Notificacao.mensagem`):** novo módulo PURO [tarefa-msg.ts](src/lib/notificacoes/tarefa-msg.ts)
  (`msgTarefaAtribuida` → "{Ator} delegou uma tarefa para você: … · vence DD/MM"; `msgTarefaConcluida` →
  "{Ator} concluiu a tarefa: … · hoje às HH:MM" / "DD/MM às HH:MM"; fallback genérico sem nome do ator; datas
  em SP). `nomePorEmail` novo em [recipients.ts](src/lib/notificacoes/recipients.ts); os 2 triggers em
  [triggers.ts](src/lib/notificacoes/triggers.ts) resolvem o nome do ator e ganharam `prazo?`/`concluidoEm?`
  (threaded de [tarefas/mutations.ts](src/lib/tarefas/mutations.ts) `create`/`updateTarefa` — `tarefa.prazo`/
  `tarefa.concluidoEm`); skip rules e recipients INALTERADOS. **Parte 2 (relatório):** prefs `relatorioDiario`
  (opt-out) + `relatorioHora` ("HH:MM") em [preferencias-core.ts](src/lib/notificacoes/preferencias-core.ts)
  (+ helpers `querRelatorioDiario`/`horaRelatorio`/`deveEnviarRelatorio`, re-exportados por `preferencias.ts`)
  + Zod em [schemas.ts](src/lib/notificacoes/schemas.ts). Orquestrador+e-mail PURO/testável em
  [tarefas/relatorio.ts](src/lib/tarefas/relatorio.ts) (`enviarRelatoriosDiarios` — filtra por opt-in+hora+
  marcador; `agruparPorPrazo`; `montarEmailRelatorio` via `renderEmail`/`emailCard`/`emailRow`/`emailButton`;
  seção "Equipe — atrasadas" só p/ gestor; `horaAtualSP`). **Idempotência sem migração:** marcador `AppSetting`
  key `relatorio-diario-enviado` = `{email:"YYYY-MM-DD"}`. Cron externo **de hora em hora** →
  [/api/jobs/relatorio-diario](src/app/api/jobs/relatorio-diario/route.ts) (guard `X-Job-Token`, cópia do
  padrão de `jobs/notificacoes`; só envia a quem casou a hora). Botão de teste →
  [/api/notificacoes/relatorio-teste](src/app/api/notificacoes/relatorio-teste/route.ts) (envia AGORA só ao
  usuário da sessão, ignora hora/opt-in/marcador). **Parte 3 (UI):** bloco novo em
  [CrmSettings.tsx](src/components/crm/overlays/CrmSettings.tsx) `NotificacoesSection` — toggle "Relatório
  diário de tarefas por e-mail" + `<input type=time>` "Enviar às" + botão "Enviar agora (teste)". **Deploy:**
  linha `0 * * * *` documentada em [DEPLOY.md](DEPLOY.md) §6c. Testes puros novos:
  [notificacoes-tarefa-msg.test.ts](tests/notificacoes-tarefa-msg.test.ts) +
  [tarefas-relatorio.test.ts](tests/tarefas-relatorio.test.ts) (13). **Verificado: tsc 0; 480/480 testes;
  eslint limpo. Sem migração. User action:** (1) adicionar o cron horário no VPS (DEPLOY.md §6c); (2) visual —
  delegar/concluir uma tarefa de outro usuário → notificação nomeia quem+quando (toast/sino/e-mail);
  Configurações → Notificações → "Relatório diário" (ligado por padrão) + horário + **"Enviar agora (teste)"**
  → conferir o e-mail (Atrasadas/Para hoje; como sócio, seção da equipe; sem pendências → "tudo em dia").
  Precisa de e-mail configurado (Graph/SMTP) p/ chegar de fato; sem backend, o mailer é noop (só loga).
- **Comercial · fix: retorno (ROAS/ROI) não contava honorários lançados no caso (this session, VERIFIED
  tsc 0, 467/467 testes, eslint limpo, NO migration).** Sintoma: contrato ganho (Thiago José, mídia paga
  jun/26) com R$ 2.400 já recebidos NÃO aparecia como retorno no Comercial. **Causa raiz:** o valor de um
  lead ganho vinha só do honorário **ligado diretamente ao lead** (`CmDatasetLead.valorContratadoCents =
  l.honorario?.valorCents`, e [cm-meta.ts](src/components/comercial/cm-meta.ts) `cmKpis` soma
  `g.valorContratadoCents || 0`, sem fallback a estimativa). Marcar "Ganho" pelo menu rápido NÃO liga
  honorário (só o botão "Converter" faz); o usuário lançou os honorários no CASO, então o lead valia 0 →
  ROI/ROAS/ticket zerados. **Fix:** novo módulo PURO [lib/comercial/valor.ts](src/lib/comercial/valor.ts)
  `valorContratadoPorLead`/`somaValorContratado` — o valor de um lead ganho segue os **honorários REAIS do
  caso vinculado** (`lead.casoId` → `caso.honorarios`), creditado **UMA vez por caso** (ao lead de conversão
  mais recente; proteção contra dupla contagem quando 2 leads → 1 caso); fallback ao honorário ligado ao
  lead; SEM fallback a estimativa (só receita real). Aplicado no [queries.ts](src/lib/comercial/queries.ts):
  `getComercialDataset` (dataset que alimenta TODA a tela do Comercial via cm-meta) passa a computar
  `valorContratadoCents` por lead com o helper (select do lead ganhou `casoId` + `caso.honorarios`); e
  `getComercialKpis` (Início + LexIA) idem, alinhando os números. **REQUISITO p/ o valor aparecer:** o lead
  ganho precisa estar **vinculado ao caso** onde os honorários foram lançados. Se foi marcado ganho pelo menu
  rápido sem vincular (sem casoId), continua 0 — usar "Converter" (liga caso+honorário) ou vincular o caso.
  **Suspeita adicional (não resolvida — precisa de dados de PROD):** a página de Contratos mostra R$ 0 nesse
  caso mesmo com honorário "vinculado a um caso de despejo" → provável **caso DUPLICADO** (a linha é um caso
  vazio; os honorários estão em outro registro). Módulo Casos & Processos está DESATIVADO no ambiente do
  usuário, então ele não consegue inspecionar/mesclar casos. Possível próximo passo: caso-merge (como o de
  clientes) ou reativar Casos. Teste puro [tests/comercial-valor.test.ts](tests/comercial-valor.test.ts).
  **Verificado: tsc 0; 467/467 testes; eslint limpo. Sem migração. User action:** deploy → conferir ROI de
  junho; garantir que o lead do Thiago esteja vinculado ao caso com os honorários (senão continua 0).
- **Comercial · fix: gastos de anúncios não contavam (duas categorias "Marketing") (this session, VERIFIED
  tsc 0, 461/461 testes, eslint limpo, NO migration).** Sintoma: usuário lançou os gastos de Google/Meta de
  junho (via Financeiro, categoria **"Marketing/Anúncios"**) e o módulo Comercial mostrava investimento zero.
  **Causa raiz (diagnosticada consultando o dev.db):** existem DUAS categorias de marketing — a do app
  **"Marketing"** (`astreaId app-cat-marketing`) e a importada do Astrea **"Marketing/Anúncios"** (astreaId
  numérico, ids diferentes por ambiente). A query de ad-spend do Comercial só reconhecia gastos com
  `campanhaId != null` OU `categoriaId == app-cat-marketing`, então TUDO lançado à mão sob "Marketing/Anúncios"
  ficava invisível (não só junho — todo o histórico manual). **Fix ([lib/comercial/queries.ts](src/lib/comercial/queries.ts)):**
  `marketingCategoriaId()` (singular, por astreaId) virou **`marketingCategoriaIds()`** (plural) — reconhece
  QUALQUER categoria cujo nome, normalizado (accent-insensitive via `normalizar`), contenha "marketing"/
  "anuncio" (novo helper `ehCategoriaMarketing`), além da app-cat-marketing; **casa por NOME, nunca por id
  fixo** (ids diferem entre dev/prod). `spendWhere(ids[], …)` e o `spendOr` do dataset passaram a usar
  `categoriaId: { in: ids }`. Sem migração — puro código de leitura. **Efeito colateral esperado (desejado):**
  o histórico antigo sob "Marketing/Anúncios" também passa a contar → investimento/ROAS/ROI de meses
  passados recalculam. **CAVEATS informados ao usuário:** (1) o Comercial filtra o gasto pela DATA do
  lançamento (`dataLancamento`); se junho ainda aparecer zerado, conferir se a data do lançamento (não só o
  vencimento) está em junho; (2) gasto lançado sem campanha vinculada conta no TOTAL/ROAS mas não na quebra
  por-campanha — para atribuir a uma campanha, usar Comercial → "Registrar gasto" ou o import CSV da Meta.
  **Usuário está em PRODUÇÃO** (o dev.db que li é separado) → o fix é código; ao subir, junho passa a contar.
  **User action:** deploy do código → conferir `/comercial` em junho. Opcional: unificar as duas categorias
  em produção p/ consistência futura.
- **CRM · Mesclar 2 clientes (dedup) + rename "Clientes"→"Contatos" (rótulos + ROTA) (this session, VERIFIED
  tsc 0, 461/461 testes, eslint sem achados novos, NO migration).** Dois pedidos. **Decisões travadas:**
  (A-merge) o cliente duplicado é EXCLUÍDO de vez após migrar tudo; conflito de contato = mantém o cliente
  escolhido, preenche só vazios. (B-rename) troca rótulos E a rota para `/contatos` (com redirect de
  `/clientes`). **A — mesclar clientes:** função pura `planejarMesclagemCliente`
  ([clientes/merge.ts](src/lib/clientes/merge.ts), backfill campo-a-campo só onde o alvo está vazio) +
  `mesclarClientes(alvoId, duplicadoId)` ([clientes/mutations.ts](src/lib/clientes/mutations.ts)): numa
  transação, repointa TODAS as FKs do duplicado→alvo (honorarios/lancamentos/leads/tarefas/eventos/
  documentos/partes/projetos/clienteAnotacao via `clienteId`; casos via `clientePrincipalId`), faz o backfill
  e HARD-DELETE do duplicado (nada fica órfão). Schema `mesclarClientesSchema` + rota
  `POST /api/clientes/[id]/mesclar` (id = sobrevivente, body `{duplicadoId}`, `runMutation` action
  "cliente.mesclar", roles admin/socio). UI: `CrmMesclarClientes` ([CrmQuickModals.tsx](src/components/crm/pages/CrmQuickModals.tsx),
  escolhe o duplicado + confirma digitando o nome, espelha o `CrmAnonimizar`) + botão "Mesclar" (ícone
  `gitMerge`, novo em [crm-icons.tsx](src/components/crm/crm-icons.tsx)) no cabeçalho do cliente
  ([CrmClienteDetail.tsx](src/components/crm/pages/CrmClienteDetail.tsx) `onMesclar` prop) ligado no
  [CrmRoutes.tsx](src/components/crm/CrmRoutes.tsx) (estado `mergeId`). Teste puro
  [tests/clientes-merge.test.ts](tests/clientes-merge.test.ts). **B — Clientes→Contatos:** rota nova
  `app/contatos/{page,[id]/page}.tsx` (cópia das de clientes) e `app/clientes/{page,[id]/page}.tsx` viraram
  **redirects** (preservam ?query/?tab — deep links antigos de notificação/LexIA/bookmark seguem funcionando).
  Rótulos "Cliente(s)"→"Contato(s)": sidebar/nav ([unified-nav.ts](src/components/shell/unified-nav.ts) href
  `/contatos` + ROUTE_META + regex de detalhe; [shell-data.ts](src/components/shell/shell-data.ts)),
  `CrmClientesPage` (título/botões/coluna/empty), modal Novo contato, **tela de lançamento do financeiro**
  ([NovoLancamentoModal.tsx](src/components/financeiro/interativo/NovoLancamentoModal.tsx): "Cliente"→"Contato"
  em entrada), OfficeDashboard, briefing, Spotlight/MentionPopover/LexiaChat PAGE_CTX/Suggestions (chave
  `page` agora "contatos"). Pushes internos `/clientes/${id}`→`/contatos/${id}` em UnifiedShell/CrmRoutes/
  ProcessosApp/ProcFichaRoute; `navPage` mapeia clientes→/contatos; LexIA links.ts/cards.ts→/contatos;
  navegacao.ts whitelist ganhou `/contatos(/<id>)` (mantém `/clientes` legado p/ o redirect). **`/api/clientes`
  e o modelo `Cliente` NÃO mudaram** (só rota de página + rótulos). Testes de card da LexIA atualizados p/
  `/contatos`. **Verificado: tsc 0; 461/461 testes (4 novos de merge); eslint sem achados novos** (erros
  set-state-in-effect/refs em UnifiedShell + CrmClienteDetail são PRÉ-EXISTENTES, confirmado via baseline).
  **Sem migração. User action:** visual — o menu agora diz "Contatos" e abre `/contatos`; abrir um contato →
  botão "Mesclar" (admin/sócio) → escolher duplicado → confirma → tudo migra e o duplicado some; a tela de
  novo lançamento (entrada) diz "Contato"; deep links antigos `/clientes/...` redirecionam.
- **CRM · Cliente — campo `origem` editável + integração com a mesclagem de lead (this session, VERIFIED
  tsc 0, 457/457 testes, eslint sem achados novos, migração 20260706120000_cliente_origem APLICADA).**
  `origem` só existia no `Lead`; o usuário precisava editar a origem do CLIENTE e que a mesclagem
  preenchesse. **Decisões travadas:** (1) mesclagem preenche a origem do cliente só se estiver vazia (mesma
  regra do backfill de e-mail/telefone — nunca sobrescreve); (2) a tabela de Contratos passa a mostrar a
  origem do cliente, com fallback à origem do lead vinculado ao caso. **Backend:** `Cliente.origem String?`
  ([schema.prisma](prisma/schema.prisma), migração ADD COLUMN — a ÚNICA desta feature); reusa o vocabulário
  do Lead (`ORIGEM_LABEL`/`LeadOrigem` de [comercial/types.ts](src/lib/comercial/types.ts)) — helper
  `validOrigem` (aceita só chaves conhecidas, senão null) em [clientes/mutations.ts](src/lib/clientes/mutations.ts)
  (create+update); campo propagado em [schemas.ts](src/lib/clientes/schemas.ts)/[types.ts](src/lib/clientes/types.ts)
  (`ClienteHeader.origem`)/[queries.ts](src/lib/clientes/queries.ts) (select+header). Rotas `/api/clientes`
  herdam automático. **Mesclagem:** [merge.ts](src/lib/comercial/merge.ts) `planejarBackfillCliente` ganhou
  `origem` (backfill se vazia); [mesclarLeadComCliente](src/lib/comercial/mutations.ts) seleciona `origem` de
  lead+cliente e aplica o patch. **Contratos:** [getContratos](src/lib/finance/queries.ts) agora resolve
  `origem = clientePrincipal.origem ?? origemLead ?? null`. **UI:** seletor de Origem no modal Novo cliente
  ([CrmQuickModals.tsx](src/components/crm/pages/CrmQuickModals.tsx), novo export `ORIGEM_OPTS`) e no form de
  edição do cliente ([CrmClienteDetail.tsx](src/components/crm/pages/CrmClienteDetail.tsx): estado+seed+
  payload) + linha de origem no cabeçalho do cliente (ícone target). **Verificado: tsc 0; 457/457 testes
  (1 novo caso de backfill de origem); eslint sem achados novos** (2 erros set-state-in-effect + warnings
  CrmLink/AcertoSocioLado são PRÉ-EXISTENTES, confirmado via baseline com git stash). **User action:** a
  migração já foi aplicada nesta sessão (o usuário pausou o `next dev`); reiniciar o dev e conferir visual —
  Novo cliente e Editar cliente têm o campo Origem; mesclar um lead num cliente sem origem preenche a origem
  do lead; a tabela `/contratos` mostra a origem editada do cliente.
- **CRM · Contratos — página refeita como LENTE COMERCIAL de Casos (this session, VERIFIED tsc 0, 456/456
  testes, eslint limpo, NO migration).** A página `/contratos` mostrava honorários lançados (fee ledger);
  o usuário queria uma tabela de contratos fechados com valor, área, origem etc. **Decisão travada com o
  usuário:** *contrato = caso* (um contrato reúne vários honorários) — Casos = controle operacional,
  Contratos = controle comercial (mesma entidade `Caso`, lente diferente). Datas: "data de fechamento" =
  `Caso.dataCriacao` (Caso não tem `createdAt @default`; dataCriacao é o análogo de abertura do caso).
  Mantido status de pagamento como coluna+filtro + KPIs financeiros. **Backend:** novo `ContratoRow`
  ([finance/types.ts](src/lib/finance/types.ts)) + `getContratos()` ([finance/queries.ts](src/lib/finance/queries.ts))
  — agrega `Σ honorários.valorCents` (contratado) e o subconjunto `status='recebido'` por caso, origem vem
  do lead vinculado ao caso (`Lead.casoId`, mais recente por `dataConversao`; casos diretos/importados sem
  lead → "Direto"). **`dataset.contratos` REPROPÓSITO** de `HonorarioRow[]`→`ContratoRow[]` — seguro: a
  LISTA só era lida pela própria página; o modal de honorário (`openContrato`/`CrmContratoModal`), a aba
  Contratos do cliente (`detail.honorarios`), Spotlight e notificações buscam por id/independente e seguem
  intactos. `getHonorarios()` continua existindo (usado pela tool LexIA). CrmDataset atualizado nos DOIS
  lugares ([lib/crm/dataset.ts](src/lib/crm/dataset.ts) + [crm-types.ts](src/components/crm/crm-types.ts)).
  **UI** ([CrmContratosPage.tsx](src/components/crm/pages/CrmContratosPage.tsx), reescrita): colunas
  Contrato·Área·Origem·Valor contratado·Pagamento·Fechado em; filtros busca + área (só as presentes, cor+label
  via `useAreasStore`/`resolveAreaLabel`/`resolveAreaColor`) + origem (`ORIGEM_LABEL` de comercial) + tipo
  (consultivo/litígio) + segmented de pagamento (Todos/Recebido/Parcial/Em aberto); ordenação clicável nas
  colunas Valor e Fechado em (default: fechado em desc); KPIs Total contratado/Recebido/Em aberto/Ticket
  médio; clique na linha → `nav.openCaso` (o `CrmCasoModal` já é renderizado pelo `ContratosRoute`). Novos
  ícones `chevronUp`/`chevronsUpDown` em [crm-icons.tsx](src/components/crm/crm-icons.tsx). **Verificado:
  tsc 0; 456/456 testes; eslint limpo** (1 aviso pré-existente `AcertoSocioLado` não relacionado). **Sem
  migração. User action:** visual em `/contratos` — tabela de contratos (casos) com área/origem/valor/
  pagamento; filtrar e ordenar; clicar abre o caso; o deep-link `/contratos?contrato=<honorarioId>` das
  notificações ainda abre o modal de honorário.
- **Comercial · Leads — "Mesclar com cliente existente" (this session, VERIFIED tsc 0, 456/456 testes,
  eslint limpo, NO migration)** (memory to add: `project_comercial_leads`). Problem: a client already
  registered as `Cliente` sometimes reappears as a `Lead` on a later Genions import (no dedup exists in
  the importer), creating a duplicate record instead of recognizing the relationship. Added an explicit
  manual merge action rather than automatic dedup. **Decisions locked with the user:** merging marks the
  lead `etapa: "ganho"` (no `Honorário` is created — the client relationship already exists, unlike
  `converterLead`); Cliente contact fields (`emails`/`telefones`) are backfilled ONLY when empty on the
  Cliente (never overwrite curated data); any authenticated user can merge (same as the rest of Leads
  CRUD today — no role gate). **Pure logic**: `src/lib/comercial/merge.ts` `planejarBackfillCliente`
  (lead contact → Cliente patch, gap-filling only), tested in `tests/comercial-merge.test.ts` (5 cases).
  **Mutation**: `mesclarLeadComCliente` in `src/lib/comercial/mutations.ts` (transaction: backfill Cliente
  contact fields + `Lead.update({etapa:"ganho", dataConversao, clienteId, motivoPerda:null})`; reuses the
  existing `notificarLeadConvertido` trigger on first transition into "ganho", same as `converterLead`).
  **Route**: `POST /api/comercial/leads/[id]/mesclar` (`mesclarLeadSchema` in `schemas.ts`, `runMutation`
  action `"lead.mesclar"`, no `roles` — matches every other Leads route). **Client picker**: `CmDataset.
  clientes` was an unused `string[]` (dead field, no UI ever read it) — upgraded to `CmClienteOption[]`
  (`{id,nome}`, already fetched via the existing `getClienteOptions()` call in `getComercialDataset`) so
  the merge modal's searchable list needs **zero extra network round-trip** (client-side filter, same
  pattern as the leads/campaigns tables already in the dataset). **UI**: new `CmMergeModal` in
  `CmModals.tsx` (search input + filtered list, `cm-menu-item` rows, "Trocar" to reselect) wired as a new
  `"Mesclar com cliente"` action (`gitMerge` icon, added to `cm-icons.tsx`) in the lead row's "⋯" menu
  (`CmLeads.tsx`) → `ComercialApp.tsx` new `Modal` variant `"mesclar"` + `submitMesclar`. **Verified:
  `npx tsc --noEmit` 0 errors; `npm test` 456/456 (5 new); `npx eslint` on all touched Comercial files
  clean.** **User action:** visual in `/comercial` → Leads tab → a lead's "⋯" menu → "Mesclar com cliente"
  → search + pick an existing client → Mesclar; confirm the lead now shows the linked cliente name and
  etapa "Ganho" (no honorário created), and that the client's e-mail/telefone got backfilled only if they
  were empty before.
- **LexIA · Chat — implementação COMPLETA do handoff "Chat de IA" (24 módulos, 8 fases, this session,
  VERIFIED tsc 0, 451/451 testes, eslint limpo, 1 migração ÚNICA)** (memories `project_lexia_bar`,
  `project_lexia_agent`, `project_documents_module` — o editor de docs reusa o mesmo `LexiaChat` embutido).
  Handoff de 2 rodadas (cards/padrões + "Robustez" 6 blocos) implementado passo a passo em 8 fases
  verificadas independentemente (tsc+testes a cada uma); nada do chat anterior foi perdido. **Decisões
  travadas com o usuário no planejamento:** entity cards automáticos a partir das tools de leitura (0
  tokens extra); follow-ups via sentinela de texto `<sugestoes>` (não uma tool — ~30-60 tokens vs. 1 rodada
  de API); ChoiceCard completo com tool `perguntar_usuario` + pausa/resume; 1 migração Prisma consolidada.
  **Fase 1 (fundações):** migração `20260704184817_lexia_chat_v2` (`LexiaMensagem.feedback/meta`,
  `LexiaConversa.fixada/contexto`, `LexiaAcaoPendente.kind/respostaJson` — a ÚNICA migração de todo o
  projeto); `cc/` kit completo (CcKit tokens/linhas/cards + motion kit ThinkingOrb/reveals/ícones animados,
  regra travada: keyframes SEMPRE sob `prefers-reduced-motion: no-preference`, nunca par webkit+standard
  `backdrop-filter` — bug do Lightning CSS). **Fase 2 (composer unificado + markdown v2):** `LexiaComposer.tsx`
  extraído — as 5 montagens (flutuante/lateral/tela-cheia/embutido no editor/`/lexia`) agora compartilham UM
  composer; markdown completo (CodeBlock com copiar/colapsar, checkbox, blockquote, listas aninhadas, hr,
  LongTable); `AiActionsBar` (copiar+feedback 👍👎) + `ModelSeal`. **Fase 3 (entity cards + timeline + diff):**
  `agent/cards.ts` mapeia tool→card automaticamente (cliente/lead/lançamento/honorário/tarefa/processo/evento
  + busca agrupada + insight/viz); `AgentTimeline` substitui os chips soltos de tool; `ConfirmCard` ganhou diff
  riscado→novo nas edições. **Fase 4 (controle de geração — a mais arriscada):** `SysCard` (8 códigos de
  erro: offline/sobrecarga/timeout/sem-chave/sessão/stream-caiu/modo-econômico/genérico) + `POST
  /api/lexia/conversas/[id]/continuar` (serve Continuar-por-limite/Retomar-após-parar/Reconectar); 2 bugs
  reais corrigidos: `sse.ts` sem guarda de `cancel()` (enqueue pós-desconexão) e o loop perdia o texto parcial
  no aborto (agora vira bloco de verdade, com `meta.interrompida`); scroll do thread com auto-stick <28px +
  pill "↓ Nova resposta". **Fase 5 (truncamento/retry):** editar a última pergunta inline (pencil no balão,
  reenviar substitui — `truncarConversaDesde` deleta ≥id + expira pendentes numa transação); `RetryMenu`
  (Tentar de novo/Modelo avançado/Ajustar tom-tamanho via `agent/modificadores.ts`, volátil); **gap real
  corrigido durante a implementação:** o retry genérico da Fase 4 só reproduzia o último `send()` — depois
  de um refazer que falhasse, "Tentar de novo" reenviava a pergunta ERRADA; unificado em `lastReplayRef`
  (tagged union). **Fase 6 (ChoiceCard + follow-ups + proveniência — ÚNICA edição do prompt CACHEADO):**
  nova tool `perguntar_usuario` (kind="pergunta" — pausa o turno como uma mutação mas sem `run`; resolve com
  decisao="responder"); `FollowupsFilter` (holdback de streaming p/ nunca piscar `<sugest…` na tela, testado
  com torture-test de chunk=1 caractere); `fontesParaTool`+rodapé de fontes citáveis; `ThoughtDisclosure`
  ("Pensou por Xs", extended thinking); `TurnResult.meta` centraliza thinking/fontes/followups (refatorado a
  partir dos campos soltos da Fase 4). **Fase 7 (composer poderoso):** `@` menções (Clientes/Processos/
  Contratos via `/api/search`, popover com teclado, vira chip + injeta `<mencoes>` no turno) e `/` comandos;
  `MicButton`+`useDitado` (Web Speech API, mesmo padrão do `RambleModal` de Tarefas); colar texto longo (>2500
  chars) oferece "Anexar como .txt" (novo MIME `text/plain` decodifica p/ bloco de texto); contador de 4000
  caracteres + bloqueio; prévia rica de anexo na bolha enviada. **Fase 8 (histórico v2 + welcome v2 + a11y):**
  `HistoryDropdown` (busca accent-insensitive, fixar/renomear inline, skeleton); pools de sugestão maiores
  com "↻ Renovar" + "Sugerido pra você"; **3 bugs REAIS de teclado corrigidos na varredura de a11y** — as
  opções do ChoiceCard e a linha do HistoryDropdown eram `<div onClick>` sem suporte a teclado, e o `CcRow`
  compartilhado (usado por TODAS as linhas de entity card) tinha o mesmo problema, corrigido uma vez só no
  componente base; +anel de foco dourado (`:focus-visible`) em tudo que não usa `.btn`. **Verificado a cada
  fase e no fim: `npx tsc --noEmit` 0 erros; `npm test` 451/451 (foram de 320 a 451 ao longo da sessão);
  `npx eslint` no módulo LexIA inteiro limpo** (achados pré-existentes fora de escopo em `LexiaChat.tsx`
  2 casos/`LexiaSpotlight.tsx` documentados e deliberadamente não tocados). **User action:** parar `next dev`
  se ainda não aplicou a migração desta sessão → `npm run db:migrate` → `npm run db:generate` → `npm run dev`.
  Visual: pedir algo ambíguo → ChoiceCard de opções; "@Nome" no composer → popover → chip; colar texto longo →
  oferta .txt; ícone de mic (Chrome/Edge) → ditado; parar uma geração → Retomar/Refazer; abrir o menu do
  histórico → busca + fixar (estrela) + renomear inline; Tab/Enter navegando cards e ChoiceCard sem mouse.
- **Documentos — "docs2" editor redesign (handoff `lexia-handoff(4).zip`) + glass nos popups + passe nas abas
  (this session, tsc 0, 320/320 testes, NO migration)** (memory `project_documents_module`,
  `project_acrylic_surfaces`). README apontava p/ `LexIA - Documentos.html`, mas o `src/docs/docs2-*.jsx`
  do bundle estava AUSENTE — o design foi reconstruído do CSS embutido + 3 screenshots (`editor.png`,
  `01/02-light-editor.png`) + diff do v1. **Decisões do usuário (perguntadas):** ambos os painéis abertos por
  padrão; TODAS as 3 novas interações; passe completo (inclui abas). **Constraints mantidas:** paginação A4 +
  zoom ([pagination.ts](src/components/documents/editor2/pagination.ts) INTACTA) e o chat da LexIA
  ([LexiaChat](src/components/lexia/LexiaChat.tsx)) NÃO mudaram; nada de funcionalidade removida. **Novos
  arquivos** em `components/documents/editor2/`: `field-types.tsx` (dataType→ícone+rótulo PT-BR),
  `ai-flash.ts` (extensão PM: realce dourado transitório de edição da IA via `aiFlashKey` meta+timeout),
  `placeholder-view.ts` (**NodeView só-cliente**: mostra o VALOR inline quando o campo está preenchido, senão
  `{{rótulo}}`, lendo `valores` via `getValor`; + `PlaceholderRefresh`, decoração de nó versionada que repinta
  quando `valores` muda — um fill NÃO é edição de doc; o import `.docx` no servidor via `editor-schema.ts`
  `PlaceholderNode.renderHTML` continua texto puro, o NodeView é só do browser via `editorProps.nodeViews`),
  `EditorPopovers.tsx` (3 popovers glass: **FieldFillPopover** = clicar num `{{campo}}` no papel p/ preencher;
  **ArmFieldPopover** = novo campo nome+tipo; **SelectionToolbar** = B/I/U + "Editar com a LexIA"), `TimbradoPicker.tsx`
  (dropdown glass com miniatura+"Padrão do escritório", substitui o `<select>` cru). **[DocEditor.tsx](src/components/documents/editor2/DocEditor.tsx)**
  (reescrito, paginação/zoom intactos): `editorProps.handleClickOn`→`onFieldClick` (a menos que armado);
  `handleClick`(armado)→`onArmClick`; botão **"posicionar campo"** (Crosshair, `paperArmed` crosshair+anel dourado);
  **"Campo"** virou popover no cursor (fim do `window.prompt`); handle novo `rectOfRange/markState/toggleMark/
  insertFieldAt/flashRange`; `applyPosOp` agora dá flash no intervalo editado; **`onMarksChange`** (correção da
  única revisão: as marcas da barra flutuante ficavam obsoletas ao formatar pela barra do topo/Ctrl+B — reemitido
  no `onUpdate` quando há seleção). **[page.tsx](src/app/documents/doc/[id]/page.tsx)** (reescrito): ambos os
  painéis abrem por padrão (campos esq · LexIA dir); passa `valores` ao DocEditor; painel de campos com **ícones
  por tipo**; renderiza os 3 popovers glass; seleção→barra flutuante ("Editar com a LexIA" só abre o painel docado,
  a seleção já vira chip); toda a lógica de load/autosave/`onDocAccept`/`getChatContext`/salvar-modelo preservada.
  **Glass**: `lexGlassStrong`+`glassElevation` nos popovers/picker e no menu "⋯" de *Meus documentos*
  ([LibraryTab.css.ts](src/components/documents/page/tabs/LibraryTab/LibraryTab.css.ts) `rowMenu` compõe o glass).
  **Abas**: "Criar"→**"Novo documento"** + rótulo **"Módulo de Documentos"** à direita
  ([TabStrip](src/components/documents/page/tabs/TabStrip.tsx)); hero do CreateTab alinhado. **Método**: build
  direto + 1 workflow de revisão adversarial (4 dims, verify por achado) → **1 achado low confirmado e corrigido**
  (selMarks obsoleto). **6 ajustes pós-visual (follow-up, tsc 0, 320 testes):** (1) campos do painel + inputs
  dos popovers agora usam o kit de formulário `.f-in` ([fields.css.ts](src/components/documents/editor2/fields.css.ts):
  `fInput`/`fieldChip`/`fieldChipInput` — borda + **anel dourado no foco**, `:focus-within` no chip); (2) controle
  de **zoom com glass** (`lexGlassStrong`); (3) o toggle do painel de campos voltou p/ a **ESQUERDA** do cabeçalho
  (o da LexIA fica à direita); (4) **zoom auto-fit**: a folha A4 encaixa na largura da coluna por padrão (ResizeObserver
  re-encaixa ao abrir/fechar painel; zoom manual desliga o auto-fit; o botão do meio = "Ajustar à largura"); (5)
  **economia de tokens** no editor: `prompt.ts` `<instrucoes_doc>` agora manda a IA agir SÓ pelas ferramentas (cards),
  sem reescrever/concluir em prosa (responde vazio quando só há ações) — a notificação "concluiu" já era suprimida no
  editor (`watchingRef=open`); (6) **"Editar com a LexIA"** na barra flutuante agora **foca o composer** (novo prop
  `focusSeq` no `LexiaChat` + `taRef` no `AutoTextarea`) com um **pulse dourado** de feedback. **Verificado: `npx tsc
  --noEmit` 0 erros; `npm test` 320/320** (1 novo:
  `tests/documents-field-types.test.ts`). **Sem migração. User action:** visual em `/documents/doc/[id]`: campo
  preenchido aparece no papel (sublinhado dourado); clicar num `{{campo}}` → popover glass; barra "Campo"/mira →
  popover novo campo; selecionar texto → barra flutuante (B/I/U + Editar com a LexIA) e destaque dourado quando a
  IA aplica; seletor de timbrado = dropdown glass; menu "⋯" em Meus documentos com glass; abas "Novo documento…".
- **Tarefas & Projetos — full "Tarefas v2" (Todoist-style) redesign + Ramble voice capture + 2 post-hoc
  bugfixes (this session, tsc 0, 317/317 testes, NO migration)** (memories `project_projetos_module`,
  `project_tarefas_module`). Implemented the Claude Design "LexIA - Tarefas v2" handoff, replacing the old
  tab-bar + project-rail workspace with a Todoist-inspired module SIDEBAR
  ([t2-shell.tsx](src/components/tarefas/t2-shell.tsx)): Entrada · Hoje · Em breve · Agenda do dia · Todas as
  tarefas · Dashboard · Modelos · favoritados + **projetos dinâmicos** · Arquivados. New v2 rows/views
  ([t2-rows.tsx](src/components/tarefas/t2-rows.tsx), [t2-views.tsx](src/components/tarefas/t2-views.tsx)),
  quick-add with inline token highlighting
  ([QuickAddModal.tsx](src/components/tarefas/QuickAddModal.tsx), keyboard shortcut **Q**), and a two-column
  task detail ([TaskDetailModal.tsx](src/components/tarefas/TaskDetailModal.tsx), replaces the deleted
  `TaskModal.tsx`). `parseQuickAdd` (`tf-meta.ts`) now resolves `#projeto` against the real dynamic Projeto
  list (accent-insensitive) instead of the old static practice-area enum; `TarefasContext` now also carries
  `projetos`/`projetoById`. **New: Ramble** — voice dictation for task capture
  ([RambleModal.tsx](src/components/tarefas/RambleModal.tsx) + `POST /api/tarefas/ramble` +
  [ramble-ai.ts](src/lib/tarefas/ramble-ai.ts), Haiku structured call that keeps a running task-draft list
  across utterances, incl. editing/removing drafts by voice and ending on "é isso"); degrades to the local
  `parseQuickAdd` heuristics without `ANTHROPIC_API_KEY`/model, and to a typed pipeline without browser speech
  support. **Fixed the requested UX bug**: the daily agenda's drag-and-drop now snaps to 15-minute slots
  anywhere on the timeline with a custom drag-image so the drop preview always hangs BELOW the cursor (was
  covering the row above it). **Two bugs reported AFTER the redesign, both fixed**: (1) `meId` (drives
  "Minhas"/"Só minhas" and the quick-add default responsável) was `socios[0]?.id` — the first sócio
  alphabetically — so every account saw the same person's ("Eduarda Gomes") tasks under "Minhas"; now
  resolved server-side from the session e-mail (`getWorkspaceData` → `userIdPorEmail`, threaded as
  `WorkspaceData.meId` → `TarefasProvider`). (2) The calendar's day cells used `minHeight` (grew the WHOLE
  week row when one day had many tasks) and had no `minWidth:0`, so CSS Grid's default content-based sizing
  let a long task title stretch the cell/column horizontally despite the inner `overflow:hidden` — fixed with
  a fixed `height:120` + `overflow:hidden` + `minWidth:0` + `flexShrink:0` on the inner rows. **Verified:
  `npx tsc --noEmit` 0 errors; `npm test` 317/317** (7 new: `tests/tarefas-quickadd.test.ts` for the dynamic
  `#projeto`/`@pessoa` resolution). **User action:** visual in `/tarefas`: the new sidebar nav + Hoje/Em breve
  week-strip/Entrada/Agenda-do-dia (drag a task to a time slot — the preview chip should hang below the
  cursor)/Dashboard; press **Q** for quick-add (token highlighting as you type); click the mic icon in the
  sidebar to try **Ramble** (needs mic permission; works even without a model, degraded); open a task for the
  new 2-column detail; confirm "Minhas"/"Só minhas" shows YOUR OWN tasks (not a fixed teammate's); open
  Calendário view with a busy day (4+ tasks or a long title) and confirm the day box stays a fixed size with a
  "+N mais" line instead of growing.
- **Glass = handoff preset "E · Vidro fosco" via the SHARED recipe (this session, tsc 0, NO migration)**
  (memory `project_acrylic_surfaces`). Pulled the repo; a prior commit `52a7bd4` had STARTED a shared-glass
  refactor but left it half-baked. Finished + corrected it. The earlier token-only passes (superseded bullet
  below) had punted on the reference `::before`/`::after` edge hairlines ("impossible inline / no shared
  className"); `52a7bd4` solved THAT by adding [glass.css.ts](src/styles/glass.css.ts) (`lexGlass`/
  `lexGlassStrong` composing one `glass` base) + [glass.ts](src/styles/glass.ts) (`glassElevation()` for the
  per-surface `--lex-elevation` drop) and wiring **ALL ~31 floating surfaces** to it (modals/dropdowns/toasts/
  spotlight/slide-ins/chat — an Explore-agent sweep confirmed 100% adoption; `modalCard` etc. all compose it) —
  BUT its recipe was a leftover prototype paste (`240×360`, white `0.05`, `blur(16px)`) and its tokens were
  inconsistent (theme.css.ts navy `0.56` vs `.crm-scope` white `0.05`, `--lex-acrylic-strong` missing in the
  bridge). **Rewrote [glass.css.ts](src/styles/glass.css.ts)** to preset E properly: token-driven flat fill +
  `var(--lex-blur)` + `var(--lex-acrylic-border)` + `box-shadow: var(--lex-elevation,…), var(--lex-glass-shadow)`
  + TWO masked edge pseudos — `::before` = 1px soft white glow ring, `::after` = the Apple "liquid glass"
  refraction (`backdrop-filter: blur(6px) brightness(1.16) saturate(150%)`, 3px masked ring); dropped the dead
  prototype dims/blur. **Aligned tokens THEME-AWARE** in [theme.css.ts](src/styles/theme.css.ts) (`:root`/
  `.theme-dark`) + mirrored in [crm-theme.css](src/components/crm/crm-theme.css) (`.crm-scope`/`.theme-dark
  .crm-scope`, added the missing `--lex-acrylic-strong`): **light = white glass** (acrylic 0.62 / pill 0.72 /
  strong 0.80, navy `0.10` hairline) so surfaces' dark `var(--text)` stays legible; **dark = navy fosco** (base
  `#020D25`, 0.45 / 0.55 / 0.66, white `0.08` hairline, preset-E shadow); both `blur(20px) saturate(120%)`.
  Because every surface consumes the shared class, the whole app restyles from **3 files**. LexIA orb keeps its
  own glass ([LexiaKit.tsx](src/components/lexia/LexiaKit.tsx): blur16/sat150 + gold rim — orb spec, untouched).
  **KNOWN LIMIT (handoff §01, deferred):** a dropdown opened INSIDE another glass surface (the chat panel; the
  CrmSettings modal's nested card) can't crisply frost the content behind it (nested `backdrop-filter` has no
  backdrop to sample) — it degrades to the strong fill (still obscures, acceptable). The `.glass-host`
  (border/shadow only) + sibling `.glass-surface` (owns blur) + `z-index:3` trigger split fixes it; invasive
  DOM restructure, do only on request.
  **FIX (follow-up, "border works but no blur" — debugged LIVE in Chrome, root cause ≠ first guess):** blur was
  missing app-wide because **Turbopack's Lightning CSS collapses a hand-written `backdropFilter` +
  `WebkitBackdropFilter` pair and re-emits it WRONG** — the served vanilla-extract chunk had ONLY
  `-webkit-backdrop-filter` (standard stripped at build), Chrome discards that alias → parsed rule had neither
  → no frost anywhere (border/ring/shadow fine). Proven by comparing the chunk's `fetch()` raw text vs the
  CSSOM `cssRules` in the live page; injected test cards with literal CSS blurred fine (compositing/tokens OK).
  **Fix = author ONLY the standard `backdropFilter`** in [glass.css.ts](src/styles/glass.css.ts) (Lightning adds
  prefixes itself; the `WebkitMask`+`mask` pair in `::before` survives the pipeline — the bug bites
  backdrop-filter specifically). RULE: never hand-write webkit+standard backdrop-filter pairs in
  `.css.ts`/`.css`; inline React `style={}` (orb, shell popovers) bypasses Lightning and is fine. An earlier
  fix this session had blamed a nested `::after` backdrop-filter ("Apple refraction") — plausible Chrome hazard
  but NOT the actual cause; that `::after` (and its replacement diagonal gradient sheen) were removed anyway at
  the user's request, so the recipe is now blur + fill + 1px glow ring only. **Verified: served CSS re-checked
  in-browser after HMR (`backdrop-filter: var(--lex-blur)` present, `::after` gone) + real `lexGlass`/
  `lexGlassStrong` classes screenshot-frosted over busy content; `npx tsc --noEmit` 0 source errors. Login page
  was used for the live test (dev creds in CLAUDE.md §4 are stale — login now rejects them).** **User action:**
  visual in the app in BOTH themes: modal / dropdown / toast / LexIA chat + Spotlight should now frost (dark =
  navy fosco + faint glow ring). Tune per-tier alpha in the 2 token files to taste; if you want navy glass in
  LIGHT mode too, say so (needs light text on those surfaces).
- **(SUPERSEDED by the bullet above — that was a mid-refactor, buggy state) Glassmorphism recipe replaced app-wide, 2 iterations (this session, VERIFIED tsc 0 + 310/310 testes,
  NO migration).** User supplied exact CSS recipes to replace the old frosted-glass look (light/dark-tinted
  fill, `blur(34px) saturate(1.7)`, hairline border, single top highlight). Because every modal/dropdown/
  toast/popup already drew from ONE set of global CSS vars (by design, see §5 acrylic memory), both passes
  were **central-token edits, not per-component rewrites**: `--lex-acrylic{,-pill,-strong}` /
  `--lex-acrylic-border` / `--lex-blur` / `--lex-glass-shadow` in [theme.css.ts](src/styles/theme.css.ts)
  (`:root` + `.theme-dark`, now **identical** — theme-invariant, no light/dark split) + the `.crm-scope`
  bridge in [crm-theme.css](src/components/crm/crm-theme.css). Tiers (`-pill`/`-strong`) collapsed to the
  same value as `--lex-acrylic` both times (each user spec gives one flat recipe, no tiering). **1st pass**
  ("gel glass", superseded): `rgba(0,0,0,0.2)` fill, no border, `blur(8px)`, 4-layer *inset* bevel. **2nd/
  CURRENT pass** ("shine glass"): near-transparent white fill `rgba(255,255,255,0.05)`, a REAL visible white
  border `rgba(255,255,255,0.3)` (not transparent this time), `blur(16px)`, shadow = soft outer drop
  `0 8px 32px rgba(0,0,0,.1)` + bright top inset `inset 0 1px 0 rgba(255,255,255,.5)` + faint bottom inset
  `inset 0 -1px 0 rgba(255,255,255,.1)` (a 4th no-op shadow layer in the user's literal CSS — 0px blur/spread,
  alpha 0 — was dropped as inert). **NOT implemented**: the reference recipe's `::before`/`::after` top+left
  1px gradient hairlines — these are pseudo-elements with `content:''`, impossible via the inline `style={}`
  objects every acrylic surface uses, and there's no single shared className across all ~23 consuming
  components to hook a global CSS rule to; would need per-component DOM changes, out of scope for a token
  edit. Surfaces referencing `var(--lex-glass-shadow)` picked up each new recipe automatically (toasts,
  menus/dropdowns, the bell, most popovers). A handful of "big modal" surfaces hardcode their own outer
  elevation shadow literal instead of the var (`0 40px 100px rgba(2,13,37,.42), 0 12px 32px
  rgba(2,13,37,.24), ...`) — in those the trailing single-highlight inset was swapped for
  `var(--lex-glass-shadow)` once, keeping the outer drop-shadow (needed for floating-above-page depth) but
  gaining the new recipe: [TaskModal.tsx](src/components/tarefas/TaskModal.tsx),
  [crm-kit.tsx](src/components/crm/crm-kit.tsx) (generic modal), 3× in
  [CrmSettings.tsx](src/components/crm/overlays/CrmSettings.tsx) (settings modal + 2 confirm dialogs),
  `modalCard` in [interativo.css.ts](src/components/financeiro/interativo/interativo.css.ts),
  [LexiaChat.tsx](src/components/lexia/LexiaChat.tsx), [LexiaSpotlight.tsx](src/components/lexia/LexiaSpotlight.tsx),
  [LexiaSettings.tsx](src/components/lexia/LexiaSettings.tsx); the comercial slide-in panel
  ([cm-kit.tsx](src/components/comercial/cm-kit.tsx)) had no inset highlight at all, so the var was appended.
  Left untouched: surfaces whose boxShadow already reads `"var(--lex-glass-shadow), <elevation>, inset 0 1px 0
  rgba(255,255,255,0.16)"` (e.g. [LexiaKit.tsx](src/components/lexia/LexiaKit.tsx), `tf-kit.tsx`, `pj-kit.tsx`)
  keep that now-redundant trailing 1px highlight — same color family, visually negligible, not worth touching
  ~15 files to strip. **Radius untouched** (design system's 6/8/10/14 scale still applies per component; each
  spec's own `border-radius`/`width`/`height` were the demo element's, not a directive to change the scale).
  **Verified both passes: `npx tsc --noEmit` 0 errors; 2nd pass also `npm test` 310/310.** **User action:**
  visual only — open any modal (Tarefa, Configurações, Novo lançamento), a dropdown/menu (bell, row actions),
  and a toast: should now show a near-transparent white glass with a clearly visible white edge, blur(16px),
  and a bright-top/faint-bottom inset sheen. If the missing top/left gradient hairlines from the reference
  CSS matter, flag it — they'd need a real shared wrapper component, not a token tweak.
- **Three fixes: login one-click, e-mail notifs default-on, Casos & Processos admin kill-switch (this session,
  VERIFIED tsc 0, 310/310 testes, NO migration).** (1) **Login**: [LoginForm.tsx](src/components/auth/LoginForm.tsx)
  already had a `busy` guard + `disabled={busy}`, but the shared `btn` recipe
  ([components.css.ts](src/styles/components.css.ts)) had no `:disabled` style (added opacity/cursor/
  `pointerEvents:none` — benefits every disabled button app-wide) and the post-login `router.push+refresh`
  (client-side, could bounce on router-cache staleness) was replaced with a hard `window.location.href = dest`
  so the destination always re-hits `proxy.ts` with the fresh cookie. (2) **E-mail default flip**: `permiteEmail`
  ([preferencias-core.ts](src/lib/notificacoes/preferencias-core.ts)) went from opt-in (`!== true`) to opt-out
  (`=== false`); `CrmSettings.tsx`'s `emailOn` helper flipped in lockstep (was silently showing "off" for
  users who'd actually be receiving mail) + copy updated; `emailMinPrioridade` default "normal" unchanged.
  Existing users with no saved prefs get the new default immediately (computed fresh, not persisted).
  (3) **Casos & Processos kill-switch**: new `AppSetting` key `modulos` (`ModulosConfig{processos?:boolean}`,
  `getModulosConfig`/`setModulosConfig`/`processosHabilitado` in [settings.ts](src/lib/settings.ts) — reuses
  the generic k/v store, **no migration**) + `/api/settings/modulos` (GET any-auth, PUT admin) mirroring
  `/api/settings/escritorio`. New client store [modulos/store.ts](src/lib/modulos/store.ts) (zustand, mirrors
  `useAreasStore`) loaded once in `UnifiedShell`; sidebar filter extended (`unified-nav.ts` "processos" entry
  hidden when off) and `CrmClienteDetail.tsx`'s "Casos & Processos" tab filtered from `TABS` + content guarded.
  Server-side `redirect("/")` guards (mirroring `verFinanceiro` on `/financeiro`/`/plano-acao`) added to
  `/processos`, `/processos/[id]`, `/casos` pages — works even via direct URL. **LexIA**: `toApiTools` in
  [registry.ts](src/lib/lexia/agent/registry.ts) gained a 4th param `processosHabilitado` that drops the whole
  `casosTools`+`processosTools` name-set; `AgentCtx.processosHabilitado` (types.ts) threaded from a single
  `getModulosConfig()` read per request in both `/api/lexia/chat` and `/api/lexia/acoes/[id]` routes into
  `loop.ts`'s `toApiTools` call AND into `prompt.ts`'s `contextoLinha` (new refusal note, mirrors the existing
  `semFinanceiro` pattern). **Cron**: `gerarNotificacoes` ([processos/notificacoes.ts](src/lib/processos/notificacoes.ts))
  skips the two prazo-related blocks (pendentes + propostos pela IA) when disabled — tarefas/eventos
  notifications untouched. **Admin UI**: new "Módulos" section in Configurações (`CrmSettings.tsx`, admin-only,
  `CrmSwitch` toggle) — toggling PUTs `/api/settings/modulos` then reloads the global `useModulosStore` so
  sidebar/tabs update live in the same session, no reload needed. New test in `lexia-agent.test.ts`
  (`processosHabilitado=false` drops the tool set) + `notificacoes-prefs.test.ts` flipped to the new opt-out
  default. **Verified: tsc 0; 310/310 testes.** **User action:** visual — `/login` click "Entrar" once (button
  visibly disables, lands on destination in one click, including via a `callbackUrl` redirect); Configurações →
  Notificações shows e-mail already on for every module for a fresh user; Configurações → Módulos (admin) →
  toggle Casos & Processos off → sidebar entry + cliente tab disappear, `/processos` redirects, LexIA declines
  casos/processos questions → toggle back on → everything reappears without a page reload.
- **LexIA do editor de Documentos = a MESMA da global + edição por seleção (Copilot) (this session, VERIFIED
  tsc 0, 303/303 testes)** (memories `project_documents_module`, `project_lexia_bar`, `project_lexia_agent`).
  O chat do editor era próprio e inferior (`DocLexiaChat`: single-shot a `/api/documentos/editar-ia`, **sem
  streaming/memória/modos/anexos**, ops por 1ª-ocorrência → "travada e medíocre"). Agora o editor reusa a
  **stack global** (`useLexiaStream` + `/api/lexia/chat` + loop do agente + a UI `LexiaChat`), tornada
  *document-aware* — revivido o padrão **doc-patch** deletado em `aaf534d`, generalizado p/ o `LexDoc` livre +
  **ops por posição** (seleção). Decisões do usuário: (1) **conversa separada por documento**; (2) **acesso de
  LEITURA** a clientes/dados (preenche campos com dados reais), **mutações de CRM bloqueadas**; (3) seleção =
  **botão flutuante "Editar com a LexIA" + chip "Trecho" no composer**. **Como:** em vez de extrair um
  `LexiaChatSurface`, adicionei um **modo `embedded`** à própria [LexiaChat.tsx](src/components/lexia/LexiaChat.tsx)
  (mesmo composer/anexos/Configurações/seletor-de-modelo/personas — paridade garantida; só o cabeçalho/sugestões/
  chip-de-seleção/fiação mudam sob `embedded`). A [doc/[id]/page.tsx](src/app/documents/doc/[id]/page.tsx)
  renderiza `memo(LexiaChat)` com props estáveis (digitar não re-renderiza o chat). **Backend:** `AgentCtx.doc`
  + clientEvent **"doc-patch"** ([agent/types.ts](src/lib/lexia/agent/types.ts)); `documento` no
  [lexiaChatSchema](src/lib/lexia/schemas.ts) (texto≤40k, campos, valores, selecao{texto,from,to}); a
  [route](src/app/api/lexia/chat/route.ts) injeta `contextoDocumento` (bloco **volátil**, CORE intacto → cache
  1h preservado; seleção → texto truncado +8k, manda a seleção verbatim ⇒ menos tokens) e **guarda o .docx**
  dentro do editor (`docx && !body.documento` → aviso, não importa outro). 2 tools client em
  [tools/documentos.ts](src/lib/lexia/agent/tools/documentos.ts): **`editar_documento_aberto`** (ops; o `run`
  FIXA from/to/de das ops de seleção na seleção REAL do contexto — o modelo nunca inventa posições) e
  **`detectar_campos_documento`** (chama o `detectarCampos` testado). `toApiTools(role,mode,docMode)` em
  [registry.ts](src/lib/lexia/agent/registry.ts): no editor expõe SÓ leitura + as 2 de doc (sem mutações de
  CRM/navegação); fora do editor as 2 somem; em "pergunta" elas também somem. O [loop.ts](src/lib/lexia/agent/loop.ts)
  ganhou o ramo client `doc-patch` (emite `{ops,campos}`; doc-edits são **client**, aplicadas no editor VIVO,
  reversíveis por desfazer — não tocam o banco). **Seleção (Copilot):** [DocEditor.tsx](src/components/documents/editor2/DocEditor.tsx)
  virou `forwardRef` com handle (`getSelection`/`coordsOf`/`applyPosOp`/`getDoc`) + `onSelectionChange`
  (`selectionUpdate`); `substituir_selecao`/`inserir_apos_selecao` aplicam por POSIÇÃO no editor vivo
  (sem remontar, com **verify-or-fallback** anti-stale: se o intervalo mudou, cai p/ `substituir_texto`
  buscando o `de`). `partitionOps` ([model/ops.ts](src/lib/documents/model/ops.ts)) separa ops JSON (aplicarOps
  + remontagem) das de posição; passes separados (posição primeiro, sobre o doc fresco do editor). **Card**
  revivido [DocPatchCard.tsx](src/components/lexia/DocPatchCard.tsx) (Aplicar/Aplicar-todos) renderizado por
  `LexiaBubble` (`onDocAccept`). **Prompt** melhor em `<instrucoes_doc>` (editor jurídico, as 5 ops, "prefira a
  seleção", preencher com dados reais, ser cirúrgico). **DELETADOS:** `editor2/DocLexiaChat.tsx` + `doc-chat.css.ts`,
  `lib/documents/editar-ia.ts`, rotas `api/documentos/{editar-ia,detectar-campos}` (a lib `detectar-campos.ts`
  fica, usada pela tool). **Anexos** (imagem/PDF → visão) funcionam no editor; `.docx` dentro do editor só avisa.
  **Verificado: `npx tsc --noEmit` 0 erros; 303/303 testes** (novos: gating `docMode` em `lexia-agent`, `partitionOps`
  + ops de posição em `documents-ops`). **Sem migração.** **User action:** visual em `/documents/doc/[id]` →
  abrir o orbe → chat **idêntico à LexIA global** (Orb/composer/⚙ modos Agente·Pergunta·Plano/auto/seletor de
  modelo/anexos/Personalizar); anexar PDF e pedir p/ preencher campos; "preencha o CPF do cliente João" (usa
  buscar/detalhe_cliente → card Aplicar); **selecionar um trecho** → botão flutuante "Editar com a LexIA" → chip
  no composer → "deixe mais formal" → troca SÓ o trecho; "detecte os campos" → card; Plano pede aprovação,
  Auto-mode aplica direto.
  - **Fix (mesma sessão): "clico em Aplicar e nada muda".** Causa: `substituirTexto`/`replaceInline`
    ([model/ops.ts](src/lib/documents/model/ops.ts)) só casava DENTRO de UM nó de texto — qualquer formatação
    (negrito/itálico) ou placeholder divide a frase em vários nós, então o `de` que o modelo copia do texto
    JUNTADO do bloco cruzava a fronteira e nunca casava. Reescrito p/ buscar sobre RUNS de nós de texto
    consecutivos (casa "São **Paulo**"), parando em nós não-texto (placeholders/quebras nunca são cruzados/
    apagados) + `mergeText` junta nós adjacentes de mesma marca. `applyPosOp` ([DocEditor.tsx](src/components/documents/editor2/DocEditor.tsx))
    passou a inserir NÓ de texto (não string → sem parse de HTML que estragaria `<`/`&`) e a deletar o trecho
    quando o substituto é vazio. **Verificado: tsc 0; 305/305 testes** (2 novos: match cross-marks + seguro
    contra placeholder). NOTA: `preencher_campo` atualiza o painel **Campos** (valor entra no PDF/export); o
    corpo do editor segue mostrando o **chip** `{{…}}` — se o usuário esperava ver o valor no corpo, é o
    comportamento atual do "page view" (chips), não um bug.
  - **Fix (mesma sessão): formatação (negrito) virava `**asteriscos`** + **seleção ignorada (editava o doc
    inteiro)**. (1) As ops só mexiam em TEXTO — pedir "negrito" fazia o modelo inserir markdown `**palavra**`
    (literal no editor). Adicionadas ops de FORMATAÇÃO REAL: **`formatar_texto`** (`de`+`marca` bold|italic|
    underline|strike → `aplicarMarca` em [model/ops.ts](src/lib/documents/model/ops.ts), aplica a MARCA aos
    nós, cross-marks, sem cruzar placeholder) e **`formatar_selecao`** (posição → `applyPosOp` em
    [DocEditor.tsx](src/components/documents/editor2/DocEditor.tsx) faz `setMark`/`unsetMark` no intervalo). O
    prompt ([prompt.ts](src/lib/lexia/agent/prompt.ts)) agora PROÍBE markdown e manda usar essas ops. (2)
    Escopo da seleção: o prompt reforça "havendo <selecao>, TODAS as ops ficam DENTRO dela" **+ uma GUARDA no
    `run`** de `editar_documento_aberto` ([tools/documentos.ts](src/lib/lexia/agent/tools/documentos.ts))
    descarta ops `substituir_texto`/`formatar_texto` cujo `de` NÃO está dentro de `sel.texto` — impede a IA de
    formatar o documento inteiro ignorando a seleção. Card/labels ([DocPatchCard.tsx](src/components/lexia/DocPatchCard.tsx))
    + fallback de `formatar_selecao`→`formatar_texto` na page. **Verificado: tsc 0; 309/309 testes** (4 novos:
    aplicarMarca aplica/remove marca real, aplicarOps roteia formatar_texto, formatar_selecao é op de posição).
  - **Fix (mesma sessão): auto-mode não auto-aplicava + "concluiu" antes de aplicar.** Doc-edits são `client`
    (não passam pelo auto-mode do servidor); faltava o auto-apply no CLIENTE. (1) `DocPatchCard`
    ([DocPatchCard.tsx](src/components/lexia/DocPatchCard.tsx)) ganhou `autoApply` → `useEffect` aplica TODAS
    as ops/campos ao montar (uma vez). Threaded `autoApplyDoc = embedded && autoMode && agentMode!=="plano"`
    por LexiaThread→LexiaBubble→card (em **plano** ainda mostra o card). (2) A notificação "LexIA concluiu"
    deixava de considerar as propostas pendentes: `useLexiaStream` agora passa `docPatch` no `onComplete`
    (turno deixou bloco doc-patch) e o gate virou `if (pendente || docPatch || watchingRef.current) return` —
    não avisa "concluído" enquanto houver edições a aplicar (nem ao minimizar). **Verificado: tsc 0; 309/309.**
  - **Layout (mesma sessão): LexIA virou painel DOCADO fixo à direita (sempre aberta) + toggle do timbrado
    movido.** Antes a LexIA era uma janela flutuante (fixed bottom-right) que sobrepunha o editor. Agora o
    modo `embedded` de [LexiaChat.tsx](src/components/lexia/LexiaChat.tsx) renderiza um painel SÓLIDO docado
    (`position:relative; 100%×100%`, sem acrílico/sombra, sem botão fechar) e a
    [page](src/app/documents/doc/[id]/page.tsx) o coloca numa **`<aside>` de 384px à direita** (borderLeft) —
    o editor reflui no espaço restante, sem sobreposição. Removidos: `chatOpen`/orbe-lançador/botão flutuante
    de seleção (a LexIA está sempre aberta; a seleção vira o chip "Trecho" no composer automaticamente). O
    **toggle do painel Campos & timbrado** saiu de junto das ações (DOCX/PDF) e virou um `PanelLeft` **à
    esquerda do cabeçalho** (logo após o voltar), associado ao painel que controla; o painel de campos agora
    começa **oculto** por padrão (a LexIA ocupa a direita). **Verificado: tsc 0; 309/309 testes.**
  - **Toggle da LexIA + zoom no editor (mesma sessão).** (1) Toggle do painel da LexIA: `lexiaOpen` (default
    true) + botão `PanelRight` no cabeçalho (direita, dourado quando aberto) → a `<aside>` da LexIA renderiza
    só quando aberta (recolher dá tela cheia ao editor). (2) Zoom: `DocEditor`
    ([DocEditor.tsx](src/components/documents/editor2/DocEditor.tsx)) ganhou estado `zoom` (0.5–2.0, passo
    0.1) aplicado via **CSS `zoom`** na folha (escala de LAYOUT → a paginação, que compara
    `paper.clientWidth` × `getBoundingClientRect`, fica consistente em qualquer zoom; `transform:scale`
    quebraria isso) + dispatch de `recompute` da paginação ao mudar o zoom (deps do useEffect de margens).
    Controle flutuante no canto inferior direito do editor (− / 100% / +; clicar no % reseta). **Verificado:
    tsc 0; 309/309 testes.**
  - **Fix (mesma sessão): zoom bagunçava o texto/timbrado.** A premissa de que o CSS `zoom` mantinha a
    paginação consistente estava ERRADA: o `zoom` escala `getBoundingClientRect()` (alturas dos blocos) mas
    NÃO as APIs de LAYOUT (`clientWidth` + `getComputedStyle` de padding/margens) → blocos "curtos" demais →
    poucas quebras → texto invadindo o rodapé do timbrado. **Correção final (minimal e principled) na
    [pagination.ts](src/components/documents/editor2/pagination.ts):** `getBoundingClientRect` é a ÚNICA API
    no espaço RENDERIZADO; `clientWidth`/`getComputedStyle` ficam no espaço de LAYOUT juntos. Então detecta
    `z = paperRect.width / clientWidth` e divide SÓ as leituras de rect (alturas dos blocos `/z`) — padding/
    margens/pageH ficam intocados (layout). Os spacers/minHeight (px) e o tile do timbrado (mm) são layout, e
    o `zoom` escala o render uniformemente. Em `z==1` (sem zoom) é `alturas/1` → **byte-idêntico ao código
    pré-zoom** (sem regressão a 100%); auto-ajustável (se `clientWidth` também fosse escalado, `z=1` e o
    caminho original já seria consistente). NOTA: a 1ª tentativa com `gcsScale = geomTop/gcsTop` foi REVERTIDA
    — o margin-collapse do 1º bloco fazia `geomTop ≠ gcsTop`, escalando TODAS as margens errado → o texto
    desrespeitava a margem superior acumulando pelas páginas. **Verificado: tsc 0; 309/309 testes.**
- **LexIA — REDESIGN do assistente: 3 superfícies (orbe + Spotlight ⌘K + Chat flutuante) + prefs (prev
  session, tsc 0, 299/300 testes)** (memories `project_lexia_bar`, `project_lexia_agent`). Implementado o
  handoff "LexIA - Assistente" (`~/Downloads/lexia-handoff(1).zip`, prompt + `src/ai/asst-*.jsx`). Decisões
  do usuário: (a) **reconstruir fiel** as 3 superfícies (substitui a `LexiaBar` única, agora DELETADA); (b)
  **UI fiel + integrar o possível** (persiste prefs + liga ao agente Opus/gate-de-confirmação/persona/modo;
  **Acesso à web adiado** — toggle persistido, sem tool). **Frontend novo** (`components/lexia/`):
  `LexiaKit` (Orb vidro-fosco + rim dourado girando + 3 auroras + sparkle; SparkleChip; AutoTextarea;
  MenuPanel acrílico), `LexiaSpotlight` (paleta ⌘K: sugestões IA + recentes recolhíveis + ações + Ir-para +
  **busca real** `searchAll`; "Perguntar à LexIA" abre o chat), `LexiaChat` (janela flutuante/lateral/cheia
  sobre o stream REAL `useLexiaStream`; cabeçalho dropdown + menu de layout + "−"; composer chips+"+"+config+
  modelo+enviar), `LexiaSettings` (menu modos/web/auto/fontes + modal personas+instruções+memórias),
  `asst.css.ts`. `LexiaBubble` agora usa o Orb + texto corrido (sem balão) + shimmer "Pensando…". **Backend**:
  migração **20260623120000_lexia_prefs** (`User.lexiaPrefs` JSON) + `lib/lexia/preferencias{,-core}.ts` +
  `/api/lexia/preferencias` (GET/PATCH runMutation). `router.decidirModelo` mapeia `modelo` (avançado→Opus,
  rápido/auto→default); `contextoLinha` injeta persona/instruções/modo no contexto VOLÁTIL (CORE cacheado
  intacto + nota anti-injeção); `toApiTools(role,mode)` remove mutações no modo **pergunta**; `loop.ts` em
  **auto-mode** executa a mutação inline (reusa role+rate-limit+auditoria) — MAS sempre confirma em
  **plano** e em ações **destrutivas** (excluir_*/anonimizar). `useLexiaStream.send` virou bag
  `{opus,modelo,agentMode,autoMode}`; rota carrega prefs server-side (degrada p/ {} se a coluna não migrou).
  **Shell** (`UnifiedShell`+`crm-chrome-store`): ⌘K→Spotlight, busca da sidebar→Spotlight, orbe→Chat,
  reflow no modo lateral; pílula antiga removida. **`onComplete`** (notif "LexIA concluiu em 2º plano")
  re-religado no `LexiaChat`. **Método**: build direto + 1 workflow de review adversarial (4 dims, verify por
  finding) → **15 achados corrigidos**. **Verificado: tsc 0; 300/300 testes** (incl. o teste pré-existente
  `documents-render` "letterhead" CORRIGIDO — o timbrado saiu do `documentToHtml` p/ o overlay pdf-lib; o
  teste agora afere fundo transparente + page-break em vez do antigo `lex-letterhead`). 8 testes novos (router
  `modelo`, toApiTools pergunta, prefs core). **User action (REQUIRED — lock do Windows; a coluna precisa ser
  aplicada)**: parar `next dev` → `npm run db:migrate` (aplica 20260623120000_lexia_prefs) → `npm run
  db:generate` → `npm test` → `npm run dev`. Conferir visual: orbe abre o chat; **⌘K** abre o Spotlight
  (sugestões/busca/"Perguntar"→chat); chat nos 3 modos; composer → ⚙ (Agente/Pergunta/Planejamento + web +
  auto) e **Personalizar** (personas + instruções); seletor de modelo Automático/Rápido/Avançado; minimizar
  com chat fechado → notificação "LexIA concluiu…".
- **Documentos — REMOVIDO o editor antigo (estruturado); só o rich-text (this session, tsc 0)**
  (memory `project_documents_module`; plano em `~/.claude/plans/remova-do-m-dulo-de-wise-swan.md`).
  O módulo tinha 2 editores; o usuário pediu **só o novo (rich-text, `/documents/doc/[id]`, editor2/\*)**.
  Decisões do usuário: (a) **remover** o automático "Contrato fechado → lança honorários no Financeiro"
  (`fecharContrato`) — honorários agora são lançados manualmente; (b) **ignorar/limpar** docs antigos com
  `payload` tipado (sem migração); (c) **remover os 6 modelos embutidos** para subir os próprios depois.
  **Roteamento unificado**: TODO documento/modelo abre em `/documents/doc/[id]`; removidos
  `isStructuredTemplate`/`templateEditorPath`/`STRUCTURED_TEMPLATES` de [registry.ts](src/lib/documents/registry.ts)
  e os branches `tipoEstruturado` em CreateTab/LibraryTab/TemplatesTab/novo/CrmClienteDetail/CrmClienteModals
  (o `CrmDocumentoModal` agora cria doc flexível em branco). Clicar num modelo já preserva **texto+campos**
  (`criarDocumentoDeTemplate` faz fork do `conteudo` LexDoc com nós placeholder; simplificado p/ `template:
  tpl.chave||"livre"`). **LexIA**: `rascunhar_documento` cria rascunho em branco e abre `/documents/doc/[id]`;
  REMOVIDA a tool `editar_documento_aberto` + todo o fluxo **doc-patch** (loop/types/SseEvent/UiBlock/ChatBlock/
  useLexiaStream/LexiaBubble/LexiaThread/LexiaBar `onDocAccept`/`sendContext`, `lexiaChatSchema.documento`,
  `DocPatchCard`) — o editor flexível tem chat próprio (`editor2/DocLexiaChat` via `/api/documentos/editar-ia`).
  `deleteTemplate` perdeu o guard `tipoEstruturado` (coluna mantida, **sem migração**). **DELETADOS** (puro
  legado): `app/documents/{editor,new,preview,download,print}`, `api/documents/generate`,
  `api/documentos/[id]/{fechar,enviar}`, `components/documents/{editor,forms,review,ContratoHonorariosPreview,
  Paginator}`, `lib/documents/{generators/contrato-honorarios,contrato-finance,ai-suggest}`,
  `lib/types/contrato-honorarios`, `components/lexia/DocPatchCard`, e os testes `contrato-finance`/`contrato-clausulas`.
  **`scripts/seed-documentos.ts`** foi repurposado: agora **soft-deleta** os embutidos (`chave != null`) em vez de
  criá-los (`npm run db:seed:documentos`). **Verificado: `npx tsc --noEmit` = 0 erros.** **User action:** rodar
  **`npm run db:seed:documentos`** (com `next dev` parado) p/ sumir com os 6 modelos embutidos → `npm test` →
  visual em `/documents`: Criar (em branco/importar/rascunhos) e Meus documentos abrem o editor rich-text; sem
  botões "Enviar"/"Contrato fechado"; Modelos vazio até subir os seus (`.docx`/"Salvar como modelo") → clicar um
  modelo abre o editor **com texto e campos**; LexIA "rascunhe uma minuta…" abre `/documents/doc/[id]`.
- **Documentos — performance do editor flexível (this session, tsc 0, 306/307 testes)**
  (memory `project_documents_module`; plano em `~/.claude/plans/funciona-mas-est-com-distributed-newell.md`).
  Digitar tinha delay grande. 3 custos por tecla, atacados (escopo "Núcleo", sem mudança visual/comportamento):
  (1) **Thrash de reflow na paginação** (o maior) — `computeDecorations`
  ([editor2/pagination.ts](src/components/documents/editor2/pagination.ts)) fazia **3N+1 reflows síncronos**
  porque o antigo `naturalMargins` escrevia/restaurava `el.style.marginTop` e lia `getComputedStyle`
  intercalado, por bloco. Reescrito: **READ PASS** lê todas as alturas (`getBoundingClientRect`) e as margens
  naturais num **cache por tipo de bloco** (`tagName|className`; blocos de início de página com `margin-top:0`
  reusam o valor de um irmão não-sobrescrito, sem mutar o DOM) — todas as leituras ANTES da única escrita
  (`paper.minHeight`) → **1 reflow** por recálculo. (2) **Recálculo a cada tecla** → agora **debounced ~150ms**
  (rajada de teclas mede 1×; zero reflow enquanto digita). (3) **Re-render da página inteira por tecla** →
  `DocLexiaChat` virou `React.memo`; suas props `docText/campos/valores` (só usadas no envio, nunca no render)
  viraram **um getter estável `getContext()`** que lê `stateRef` no momento do envio — então digitar texto NÃO
  re-renderiza o chat nem re-percorre a árvore (`lexDocText`/`extractPlaceholders` saíram do caminho da tecla).
  Na [doc/[id]/page.tsx](src/app/documents/doc/[id]/page.tsx): `margins`/`getChatContext`/`onApplyCampos`/
  `onApplyOps`/`closeChat` memoizados (`useMemo`/`useCallback`). NÃO foi feito o modo agressivo (debounce
  editor→estado) por escolha do usuário. **Verificado: tsc 0; 306/307 testes** (a 1 falha é
  `documents-render.test.ts` esperando `class="lex-letterhead"` — PRÉ-EXISTENTE e não relacionada: o timbrado
  saiu do `documentToHtml` na sessão do overlay pdf-lib; teste estava desatualizado). **User action:** visual —
  abrir um doc flexível LONGO (várias páginas) em `/documents/doc/[id]` e digitar rápido no meio: deve ficar
  fluido; as quebras/altura atualizam logo após pausar; selecionar/exportar/chat inalterados.
- **Documentos — fix: abrir docs flexíveis pelo histórico/biblioteca (this session, tsc 0)**
  (memory `project_documents_module`). Documentos do editor rich-text (flexível) só abriam na hora de
  criar; pelo histórico ("Meus documentos") e pelos cards de rascunho NÃO abriam. **Causa:** os hrefs
  roteavam TUDO por `templateEditorPath(doc.template)` → `/documents/editor/<template>` (editor ESTRUTURADO
  do contrato). Docs flexíveis vivem em **`/documents/doc/[id]`** (carregam `template` = "livre"/"importado"/
  chave do template, não os contratos). **Correção:** novo discriminador em
  [registry.ts](src/lib/documents/registry.ts) — `STRUCTURED_TEMPLATES` (`contrato-honorarios`,
  `contrato-prestacao-servicos`, mesmo set do `fecharContrato`) + `isStructuredTemplate(template)`. Os
  call-sites passam a rotear flexível→`/documents/doc/[id]`, estruturado→editor de form:
  [LibraryTab.tsx](src/components/documents/page/tabs/LibraryTab/LibraryTab.tsx) `documentoHref` (linha/menu
  "Abrir"), [CreateTab.tsx](src/components/documents/page/tabs/CreateTab/CreateTab.tsx) cards "Continue de
  onde parou", e o botão "Abrir no editor" da aba Documentos do cliente
  ([CrmClienteDetail.tsx](src/components/crm/pages/CrmClienteDetail.tsx) — que de quebra agora passa
  `?documento=` p/ estruturados, antes abria editor em branco). **Verificado: tsc 0.** **User action:**
  visual — `/documents` → Meus documentos → clicar num doc flexível (criado "em branco"/importado/de modelo
  flexível) abre o editor rich-text; idem nos cards de rascunho da aba Criar e no "Abrir no editor" do cliente.
- **Documentos — fix do "texto vibrando" na paginação do editor flexível (this session, tsc 0)**
  (memory `project_documents_module`). O rich text do editor WYSIWYG ([editor2/DocEditor.tsx](src/components/documents/editor2/DocEditor.tsx))
  "vibrava" — pulando 1 linha p/ cima e p/ baixo sucessivamente — algumas páginas abaixo. **Causa raiz**
  em [editor2/pagination.ts](src/components/documents/editor2/pagination.ts): `naturalTop` era medido do
  `getBoundingClientRect().top` RENDERIZADO de cada bloco. Mas o bloco que vira início de página recebe um
  `Decoration.node margin-top:0`; zerar a margem superior (headings têm 16/14/12pt; via margin-collapse
  qualquer bloco é afetado) sobe o `r.top` renderizado → o `naturalTop` MEDIDO de um bloco na borda da
  página MUDAVA conforme ele estava ou não quebrado: não-quebrado inclui a margem→estoura→insere gap+margin0
  (sig `"gX:N"`); quebrado→margem some→`naturalTop` menor→não estoura→remove o gap (sig `""`). O guard de
  assinatura nunca atingia ponto fixo → oscilação a cada frame. **Correção:** computar `naturalTop` a partir
  de geometria INVARIANTE às decorations — altura border-box (independe de margem) + margens naturais de cada
  bloco — montando um layout cumulativo com margin-collapse (`top = cursor + max(prevMarginBottom, marginTop)`).
  Helper `naturalMargins(el)` lê as margens naturais neutralizando o nosso `margin-top:0` inline (limpa→lê→
  restaura na mesma medição rAF, sem flicker). Altura/margens não mudam quando inserimos spacer ou zeramos
  margem → posições estáveis → converge em 1 frame, sem vibração. O `margin-top:0` no início de página +
  o spacer de gap seguem iguais (só a MEDIÇÃO mudou). **Verificado: tsc --noEmit 0 erros.** **User action:**
  visual — abrir um doc flexível longo (várias páginas) em `/documents/doc/[id]` e rolar: o texto NÃO deve
  mais vibrar perto das quebras de página.
  **Follow-up (mesma sessão): seleção de texto quebrada.** O plugin recomputava a paginação em TODO
  `view.update` — incluindo mudanças de SELEÇÃO. Cada recompute lê layout e (na medição) mexe no
  `style.marginTop` dos blocos de início de página (reflow) + às vezes dispara uma transação; fazer isso a
  cada `selectionchange` durante um arrasto desfazia a seleção nativa do browser. **Correção:** o estado do
  plugin virou `PgState { deco, version }`; o `version` só incrementa em `tr.docChanged` ou no meta
  `"recompute"` (margens) — nunca numa transação só-de-seleção. O `view.update` agora chama `maybeSchedule`
  que só recomputa quando o `version` muda. Resultado: selecionar/arrastar texto não dispara mais a medição
  pesada. (Como a folha é A4 fixa em mm, toggle de painel/resize não muda as quebras → não precisa recompute.)
  **Verificado: tsc 0.** **User action:** visual — selecionar/arrastar texto num doc flexível com várias
  páginas deve funcionar normalmente.
- **Documentos — PDF flexível: timbrado correto em TODA página via overlay pdf-lib (this session)**
  (memory `project_documents_module`). O PDF do editor flexível saía com o timbrado deslocado/"desformatado"
  (faixa azul do cabeçalho caindo ~55mm pra baixo, texto por cima). **Causa raiz:** o timbrado era desenhado
  por CSS (`position: fixed` em [render/html.ts](src/lib/documents/render/html.ts)). Em mídia paginada o
  Chromium ancora o `fixed` na **área DENTRO das margens do `@page`**, então a arte full-bleed deriva página a
  página (testado: `fixed` e background no `:root` ambos driftam pelo valor das margens). **CSS puro não
  resolve** "timbrado full-bleed repetido + margens de conteúdo por página". **Correção:** compor o timbrado
  por baixo de cada página com **pdf-lib** (novo dep, JS puro — sem binário nativo, sem lock do Prisma). Em
  [render/pdf.ts](src/lib/documents/render/pdf.ts): `overlayLetterhead`/`htmlToPdfWithLetterhead` — renderiza o
  HTML **só com conteúdo + margens `@page`** (fundo transparente) e estampa a imagem A4 em (0,0)→210×297mm
  atrás de cada página via `embedPages`/`drawPage` (texto fica nítido por cima da marca d'água). `documentToHtml`
  não emite mais o timbrado (fundo transparente). Rota [exportar/route.ts](src/app/api/documentos/[id]/exportar/route.ts)
  passa a imagem decodificada (`dataUrlToImage`) ao novo helper; DOCX intacto. **Verificado** rendering o doc
  real do usuário (timbrado NCM, 6 páginas): faixa cabeçalho em 0-3%, rodapé em 98-100% em **todas** as páginas
  (antes: erráticas 19/37/46/73%). **User action (REQUIRED):** o dev server precisa ser **reiniciado** (novo
  dep `pdf-lib` no node_modules) → reexportar o PDF de um documento com timbrado e conferir cabeçalho no topo +
  rodapé embaixo em todas as páginas. `npx tsc --noEmit` p/ checagem de tipos.
- **Documentos — redesign visual "LexIA - Documentos" (this session, tsc 0)** (memory `project_documents_module`).
  Importado o projeto Claude Design (`DesignSync`, projectId `52c44961-…`, `src/docs/*`) e aplicado como
  **re-skin fiel** sobre o módulo flexível JÁ funcional (sem trocar backend/TipTap/rotas/dados). Decisões do
  usuário: **full pass (5 telas)** + **Papéis timbrados vira 4ª aba**. (1) **Criar** ([CreateTab.tsx](src/components/documents/page/tabs/CreateTab/CreateTab.tsx)
  +.css): hero 30px, nova linha **"Começar em branco"** (POST /api/documentos blank→/documents/doc/[id]) +
  **Importar documento** (dropzone .docx→/api/documentos/importar-docx), cards de rascunho maiores. (2) **Meus
  documentos**: filtro virou **pills douradas** (recipe `segmentedButton` reusa `pillBase`; mesma API/lógica),
  busca 38px. (3) **Modelos**: chips de categoria com **contagem** (`templateChipCount`). (4) **Papéis timbrados**:
  novo componente reusável [TimbradosManager.tsx](src/components/documents/timbrados/TimbradosManager.tsx)
  (upload→cria já no banco, lista à esquerda + editor de **área de segurança** A4 com margens mm à direita;
  wired aos endpoints reais), usado pela ROTA `/documents/timbrados` E pela nova aba; `TabStrip`+`useTabRouting`
  ganharam `"timbrados"`; o botão "Papéis timbrados" do header saiu (agora é aba). (5) **Editor flexível**
  ([doc/[id]/page.tsx](src/app/documents/doc/[id]/page.tsx)): novo cabeçalho (botão voltar quadrado, ícone-box,
  nome inline, status salvo, toggle painel, DOCX/PDF), layout **painel Campos&timbrado (esq) | editor (page view)**
  + **chat LexIA flutuante acrílico** ([DocLexiaChat.tsx](src/components/documents/editor2/DocLexiaChat.tsx),
  `--lex-acrylic-strong`/`--lex-blur`) com orbe-launcher quando fechado. **Sem LexIA duplicada**: a pílula global
  do `UnifiedShell` agora também é escondida em `/documents/doc` (`routePillHidden`, igual ao editor do contrato em
  `/documents/editor`) — a LexIA da página é só a do documento (focada nos endpoints do LexDoc detectar-campos/
  editar-ia). Unificar no agente global (client-tools p/ LexDoc) fica como evolução futura. O chat substitui os antigos painéis de
  Detecção/Editar-IA: thread + cards (Detectar campos→/api/documentos/detectar-campos; instrução→editar-ia) +
  toggle Opus + Aplicar/Aplicar-todos, aplicando via `aplicarCampos`/`aplicarOps` (bump `editorKey` p/ chips
  aparecerem). Painel de campos = barra de progresso + chips com input inline. Toolbar do TipTap: ativo agora
  `accent-soft`/`accent`. **Editor = "page view" estilo Word com paginação real** ([DocEditor.tsx](src/components/documents/editor2/DocEditor.tsx)):
  a folha é **A4 FIXA em mm** (`width:210mm`, `min-height:297mm`, padding=margens em mm, `box-sizing` border-box) — tamanho
  CONSTANTE, não muda ao abrir/fechar o painel (bug anterior era folha responsiva com margens em %). O **timbrado é o
  fundo da página** (`background` repeat-y `210mm 297mm`) + **linha-guia** a cada página (`PAGE_GUIDE`). **Paginação de
  verdade (nível de bloco)** via extensão [pagination.ts](src/components/documents/editor2/pagination.ts) (decorations
  do ProseMirror): mede a **posição REAL** de cada bloco top-level (`getBoundingClientRect` menos os espaçadores já
  acima = "naturalTop", o que evita o erro de colapso de margens que antes deixava o texto subir p/ dentro da margem
  superior das páginas 2+), insere por quebra DOIS decorations: (1) widget espaçador `.lex-page-gap` que empurra o
  bloco que estoura para o **topo exato da safe-area** da próxima página (`safeTop = page*pageH + topPx`, alinhado
  às tiles do timbrado) e (2) `Decoration.node` que **zera a margem-superior** desse bloco — sem isso o espaçador
  quebra o colapso de margem e o erro `δ=min(margemInf_ant, margemSup_bloco)` ACUMULAVA por página (texto subindo
  cada vez mais). Cresce a folha p/ nº inteiro de páginas. Convergência em ~2-3 frames (assinatura idempotente →
  sem loop). Recompute em rAF no `view.update` + dispatch quando as margens mudam. LIMITAÇÃO: é nível de BLOCO — um único parágrafo mais alto
  que a página ainda transborda (split de linha exigiria layout engine); o **PDF exportado segue a verdade paginada
  exata**. O preview iframe separado SAIU (o editor é a superfície WYSIWYG). O editor mostra os **chips** de campo
  (valores preenchidos aparecem no PDF/export). NOTA: o editor ESTRUTURADO do contrato (`/documents/editor/[templateId]` + EditorLexia)
  segue INTACTO (legado). **Verificado: tsc --noEmit 0 erros.** **User action:** visual em `/documents`:
  aba Criar (Começar em branco + Importar), Meus documentos (chips dourados), Modelos (contagens), **aba Papéis
  timbrados** (subir A4 + área de segurança), e abrir um doc flexível → editor com painel de campos + **chat
  flutuante** (Detectar campos / "troque o foro para Campinas" → Aplicar) + toggle Opus.
- **LexIA importa .docx pelo chat (prev session)** (memory `project_documents_module`). Anexar um `.docx`
  no chat da LexIA agora **importa o contrato e abre direto no editor**. `.docx` entrou no
  `MIME_PERMITIDOS`/`ACCEPT_ATTR` ([validacao.ts](src/lib/lexia/anexos/validacao.ts) +`MIME_DOCX`/`ehDocx`);
  o binário NÃO vai ao modelo (a Anthropic não lê .docx) — a rota
  [/api/lexia/chat](src/app/api/lexia/chat/route.ts) o **intercepta ANTES do loop do agente**
  (`importarDocxComoDocumento`: mammoth→LexDoc→rascunho) e emite `text` + `navigate` →
  `/documents/doc/[id]` (determinístico, 0 tokens, sem chamar o modelo). Imagem/PDF seguem indo ao modelo
  (visão); o builder [agent/anexos.ts](src/lib/lexia/agent/anexos.ts) só monta image/document (docx nunca
  chega lá). Decisão do usuário: **abrir direto** (não card) + **sem auto-detecção** (clica "Detectar
  campos" no editor depois). **Verificado: tsc 0, 307 testes verdes.** **User action:** visual — abrir a
  barra LexIA → clipe → anexar um `.docx` → enviar → deve abrir o editor com o contrato importado.
- **Documentos — redesign flexível, Fase 0+1+2+3+4+5 COMPLETO (this session, VERIFIED GREEN)** (memory
  `project_documents_module`). Objetivo: aposentar o contrato hardcoded — criar do zero sobre um papel
  timbrado, subir .docx existente, escrever rich text, LexIA auto-detecta placeholders, exportar
  docx+pdf idênticos ao preview, Sonnet padrão / Opus opt-in. **Fase 0 (fundação, arquivos novos, sem
  deps):** modelo portátil `src/lib/documents/model/{types.ts (LexDoc = subset do JSON do ProseMirror:
  parágrafo/heading/listas/blockquote/imagem/pageBreak/**placeholder** + bold/itálico/sublinhado/
  riscado), placeholders.ts}` + renderizadores UNIFICADOS `src/lib/documents/render/{html.ts
  documentToHtml = o ÚNICO HTML A4 canônico que o preview (iframe) e o PDF (puppeteer) compartilham →
  "preview === PDF" por construção; pdf.ts htmlToPdf (singleton puppeteer genérico extraído do
  contrato); docx.ts documentToDocx (nó-a-nó → lib docx, timbrado = header flutuante de página inteira,
  listas nativas)}`. Testes [documents-render.test.ts](tests/documents-render.test.ts). DOCX é fiel mas
  NÃO pixel-idêntico (motor do Word reflui); PDF é o export exato. **Fase 1 (dados):** migração
  **20260620120000_documentos_flex** — models **Timbrado** (imagem data-URL + margens mm + `padrao`) +
  **DocumentoTemplate** (registry no banco: conteudo LexDoc, placeholders JSON, `tipoEstruturado` marca
  o contrato como template "inteligente" que MANTÉM o caminho tipado + `fecharContrato`) e estende
  **Documento** (+conteudo/valores/templateId/timbradoId). Camada `src/lib/documentos/{templates.ts,
  timbrados.ts}` + zod em schemas.ts + rotas `/api/documentos/{templates,timbrados}[/[id]]` (escrita
  gated `ROLES_DOC_GESTAO=["socio"]`). Seed **`db:seed:documentos`** migra as 6 linhas do registry
  (create-only; marca os contratos como estruturados). **O caminho legado do contrato segue INTACTO**
  (template='contrato-honorarios' + payload + AST em generators/contrato-honorarios/*). **Verificado:**
  migrate+generate+seed OK, `tsc --noEmit` 0 erros, **288 testes verdes** (corrigidos de quebra 5 erros
  de tsc PRÉ-EXISTENTES da feature areas_direito que o vitest mascarava). **Gotcha resolvido:** o par de
  migrações `areas_direito` estava fora de ordem (REDEFINE `153528` antes do CREATE `20000000`) e
  quebrava o shadow DB do `migrate dev` (P3006) — corrigido renomeando a pasta → `20260620010000_areas_
  direito` + UPDATE no `_prisma_migrations` (memory `reference_prisma_migration_order`). **Fase 2 (editor
  WYSIWYG, DONE):** deps `@tiptap/react@2.27 + pm + starter-kit + underline + text-align + image` +
  `mammoth` instaladas. Conversores PUROS [model/tiptap.ts](src/lib/documents/model/tiptap.ts)
  (`proseMirrorToLex`/`lexToProseMirror` — TipTap usa `textAlign`, LexDoc usa `align`; filtra marcas/nós
  não suportados; LexDoc segue canônico) + testes [documents-tiptap.test.ts](tests/documents-tiptap.test.ts).
  Editor [components/documents/editor2/DocEditor.tsx](src/components/documents/editor2/DocEditor.tsx)
  (TipTap, `immediatelyRender:false` p/ SSR; nós customizados **placeholder** (chip inline atom) +
  **pageBreak**; toolbar B/I/U/S, H1/H2, listas, citação, alinhamento, **Campo** (insere placeholder via
  prompt) + quebra de página). [DocPreview.tsx](src/components/documents/editor2/DocPreview.tsx) = iframe
  sandbox com `documentToPreviewHtml` (mesmo `DOC_CONTENT_CSS` do PDF → conteúdo idêntico; PDF é a
  verdade paginada). `html.ts` refatorado p/ exportar `DOC_CONTENT_CSS` + `documentToPreviewHtml`. Página
  **`/documents/doc/[id]`** (editor│preview│painel de campos+timbrado; autosave debounced de
  conteudo/valores/timbradoId/nome; export via `window.open`). Launcher **`/documents/novo`** (galeria
  dos templates do banco + "Em branco"; estruturado→editor do contrato, flexível→`de-template`→novo
  editor). Rotas: **`/api/documentos/[id]/exportar?formato=pdf|docx`** (render flexível via
  documentToHtml→htmlToPdf / documentToDocx, timbrado decodificado) + **`/api/documentos/de-template`**
  (POST). Mutation `criarDocumentoDeTemplate` (fork do conteudo + bump usoCount). **Verificado: tsc 0,
  294 testes verdes.** **Fase 3 (timbrados + galeria DB, DONE):** gerenciador **`/documents/timbrados`** (upload de imagem
  PNG/JPEG → data URL via FileReader + margens de segurança em mm com **preview da área segura** +
  definir padrão/editar/excluir; backend `getTimbradosComImagem` + `GET .../timbrados?comImagem=1`);
  picker do editor com link "Gerenciar papéis timbrados"; DocumentsPage "Novo documento" → `/documents/
  novo` + link "Papéis timbrados"; aba **Modelos** (TemplatesTab) deixou o `registry` hardcoded → busca
  os templates do BANCO e roteia pelo fluxo novo (estruturado→contrato, flexível→de-template→WYSIWYG).
  Fluxo ponta-a-ponta fecha: timbrado → novo doc → editar → campos → exportar. **Fase 4 (importar .docx + autodetecção IA, DONE):** dep `@tiptap/html` (zeed-dom → roda no
  servidor). Import 100% server: [importar.ts](src/lib/documents/importar.ts) `docxBufferToLexDoc`
  (mammoth → HTML → `generateJSON` sobre o schema compartilhado
  [editor-schema.ts](src/lib/documents/editor-schema.ts) → `proseMirrorToLex` → LexDoc) + rota multipart
  **`/api/documentos/importar-docx`** (runMutation → {id}); o botão "Importar .docx" da aba Modelos ficou
  funcional. Autodetecção: [detectar-campos.ts](src/lib/documents/detectar-campos.ts) — chamada direta à
  Anthropic com tool estruturada, **Sonnet por padrão / Opus só com opt-in** (`opts.opus`), degrada sem
  `ANTHROPIC_API_KEY` (o "Campo" manual continua); ledger `doc-campos`; rota
  **`/api/documentos/detectar-campos`**. Núcleo PURO [model/campos.ts](src/lib/documents/model/campos.ts):
  `lexDocText` + `aplicarCampos` (envolve a 1ª ocorrência de cada span num nó placeholder, preserva
  marcas) + testes (`documents-campos` + `documents-import` valida o `generateJSON` server-side). Editor:
  **"Detectar campos (LexIA)"** + checkbox **"Usar Opus (mais créditos)"** + "Aplicar todos"/individual
  (remonta o editor via `editorKey` p/ os chips aparecerem) + **"Salvar como modelo"** (POST templates,
  gated sócio). Verificado tsc 0, 300 testes verdes (Fase 4). **Fase 5 (Sonnet-padrão/Opus-opt-in + IA
  edita o doc, DONE — FECHA O PROJETO):** (A) [router.ts](src/lib/lexia/agent/router.ts) `decidirModelo`
  REMOVEU o auto-Opus (regex REDACAO + limiar >1200 chars apagados) → **Sonnet é o padrão em TODO o
  chat**; Opus só com `forcarOpus`. Threaded: `lexiaChatSchema.opus` → /api/lexia/chat passa
  `forcarOpus: body.opus` → `useLexiaStream.send(...,opus)` → **toggle "Opus" na barra LexIA** (estado
  sticky na sessão, pílula dourada quando ativa, tooltip "usa mais créditos"). Guard de orçamento
  (`aplicarTeto`) intacto; testes de roteamento atualizados (REDACAO→Sonnet, forcarOpus→Opus). (B) IA
  editando o doc flexível: núcleo PURO [model/ops.ts](src/lib/documents/model/ops.ts)
  (`aplicarOps`/`substituirTexto` — ops `preencher_campo`|`substituir_texto`|`inserir_paragrafo`,
  preserva marcas) + testes; servidor [editar-ia.ts](src/lib/documents/editar-ia.ts) (Anthropic tool
  estruturada, **Sonnet/Opus opt-in**, degrada sem key) + rota `/api/documentos/editar-ia`; o editor
  (doc page) ganhou painel **"Editar com a LexIA"** (instrução em linguagem natural → ops → cards
  "Aplicar todas"/individual → `aplicarOps` + `editorKey` remonta). NOTA: é um assistente de edição
  focado no editor flexível (não o chat conversacional embarcado completo — fica como evolução futura).
  **Verificado: tsc 0, 307 testes verdes. PROJETO DE DOCUMENTOS COMPLETO — todos os pedidos do usuário
  atendidos.** **User action:** deps já instaladas + DB já aplicado nesta sessão → conferir visual:
  `npm run dev` → **/documents → Papéis timbrados** (subir A4) → **Modelos → Importar .docx** →
  **Detectar campos (LexIA)** → **Editar com a LexIA** ("troque o foro para Campinas") → Aplicar →
  Exportar PDF/DOCX; e na **barra LexIA** o toggle **Opus** (padrão Sonnet). Polimentos futuros opcionais:
  paginação A4 real na tela (paged.js), import de timbrado em PDF, toggle Opus também no Composer da
  página /lexia, e o chat LexIA completo embarcado no editor flexível.
- **Projetos & Tarefas — 5 ajustes pós-Fase 4 (this session)** (memory `project_projetos_module`).
  (1) **Filtro "Vence hoje"**: o bucket de prazo em [views.tsx](src/components/tarefas/views.tsx)
  `ListaView` agora agrupa estritamente por distância do prazo (`n<0`→Vencido, `n===0`→Vence hoje);
  removido o guard `!t.done` que jogava tarefas concluídas/atrasadas em "Vence hoje". (2) **Dropdown de
  área**: a taxonomia de área virou canônica em [pj-kit.tsx](src/components/projetos/pj-kit.tsx)
  (`AREA_OPTIONS {id,label}` espelhando `PROJECTS` sem inbox + `areaLabel(value)`); o backend guarda a
  CHAVE (`soc`, `trab`…, do seed) — os pickers de **template** e **projeto** e o **AreaTag** agora
  resolvem o rótulo via `areaLabel` (antes mostravam o value cru "soc"); corrige também o agrupamento por
  área do rail (que caía tudo em "Outros"). Default de área = `"soc"`. (3) **Ocultar/mostrar concluídas**:
  toggle "Concluídas" (ícone `eye`/`eyeOff`, novo em [tf-icons](src/components/tarefas/tf-icons.tsx)) nas
  barras de filtro de `CrossTarefasTab` e `ProjectCanvas`, **oculto por padrão** (`hideDone` state, só nas
  views Hoje/Lista). (4) **Animação de conclusão**: ao concluir com concluídas ocultas, a tarefa
  permanece ~650ms (check preenchido + strikethrough) e então **colapsa+esvanece** via `motion`
  AnimatePresence — hook `useJustCompleted` + `useVisibleTasks` + `AnimatedRows` em views.tsx; sem mais
  "sumir seco". (5) **Dashboard — dias futuros**: `getProdutividadeDashboard`
  ([queries.ts](src/lib/projetos/queries.ts)) agora devolve `distribuicao` (heatmap próximos 14 dias:
  por pessoa × dia, tarefas abertas com prazo + `depois` + `semPrazo`); novo card "Distribuição da equipe"
  em [DashboardTab.tsx](src/components/projetos/DashboardTab.tsx) (`HeatCell`, hoje destacado, fins de
  semana esmaecidos). (+) **z-index de popover**: o `Menu` compartilhado
  ([tf-kit.tsx](src/components/tarefas/tf-kit.tsx)) eleva o wrapper (`zIndex:60`) quando aberto, p/ o
  dropdown não ficar parcialmente sob a linha/picker vizinha (ex.: Responsável sob Projeto no TaskModal).
  **Sem migração. tsc limpo + 266 testes verdes.** **User action**: visual em
  `/tarefas` (aba Projetos → lista por prazo: nada concluído em "Vence hoje"; toggle Concluídas; concluir
  uma tarefa → animação) e aba Dashboard (novo heatmap futuro); editor de template/projeto → dropdown de
  Área mostra o rótulo. Sem passos de DB.
- **Projetos & Tarefas — FRONTEND (Fase 4, prev session)** (memory `project_projetos_module`).
  Importou o design "LexIA - Projetos & Tarefas" via MCP `claude_design` (DesignSync) e o
  integrou como **workspace de 4 abas** (Tarefas · Projetos · Dashboard · Templates) em
  [src/components/projetos/](src/components/projetos): `pj-meta.ts` (puro: `deriveRollup` espelha
  saúde/progresso no cliente p/ updates otimistas; `addBizDaysClient` preview do wizard; datas),
  `pj-kit.tsx` (ModuleTabs, SaudeChip, ProjStatusPill, ProgressBar/Ring, ProjectIcon/RailItem/Card,
  **BulkBar** acrílica, Overlay/ModalHeader, PageFrame/Header, AREAS/COLOR/ICON_CHOICES),
  `pj-theme.css` (rail+canvas responsivo, skeleton, lift-card), `ProjectModal.tsx`,
  `TemplatesTab.tsx` (galeria + editor drag-reorder + wizard 4 passos), `DashboardTab.tsx`,
  `ProjectsTab.tsx` (rail+canvas+header inline-rename), `CrossTarefasTab.tsx`, e o orquestrador
  **`ProjetosWorkspace.tsx`** (dono do estado; persiste via `apiSend`→runMutation; refetch após
  mutação de projeto/template). **Reusa** os 5 views + TaskModal + tf-kit/tf-meta de Tarefas
  (views ganharam seleção opcional p/ bulk; `tf-icons` +~20 ícones; `Menu` ganhou `placement:"up"`).
  Rotas: **`/tarefas`** agora é o workspace (`?tab=` escolhe aba; `?tarefa=<id>` ainda deep-abre);
  novas **`/projetos`** e **`/projetos/[id]`** (loader [workspace.ts](src/lib/projetos/workspace.ts)).
  RBAC cliente: `canEdit` (admin/socio/advogado) p/ criar/editar projeto + nova-tarefa-no-projeto;
  `canTemplate` (admin/socio) p/ editor de template. `favorito` é client-only efêmero. `TarefasApp.tsx`
  antigo REMOVIDO. **tsc limpo (0 erros) + 266 testes verdes** (`tests/projetos-ui.test.ts` novo).
  **User action**: parar `next dev` → (se ainda não) `npm run db:migrate` → `npm run db:generate`
  → `npm run db:seed:projetos` → `npm run dev`. Conferir visual em `/tarefas`: 4 abas; aba Projetos
  (rail+canvas, criar/editar/excluir/arquivar/renomear); Templates → "Usar template" → wizard;
  Dashboard com KPIs; seleção + BulkBar; Estagiário sem botões de criar projeto/template.
- **Projetos & Tarefas — BACKEND (Fase 3, this session)** (memory `project_projetos_module`).
  Transformou "projetos" (antes 6 áreas hardcoded em [tarefas/types.ts](src/lib/tarefas/types.ts))
  em **entidade dinâmica**. 3 models novos: **`Projeto`** (dono/prazo/status/area-tag/
  cor/vínculo caso|cliente/templateOrigem/soft-delete `excluidoEm`/`chave` p/ seed),
  **`ProjetoTemplate`** + **`ProjetoTemplateTarefa`** (item c/ prazo relativo `offsetDias`
  em dias úteis + `base` inicio|anterior). `Tarefa` ganhou **`projetoId`** (FK) +
  **`concluidoEm`** (alimenta cycle time/taxa-no-prazo). Migração **20260619000000_projetos**
  (rebuild de Tarefa, mão-autorada). Núcleo PURO testável
  [projetos/template.ts](src/lib/projetos/template.ts): `instanciarTemplate` (reusa
  `calcularPrazo`/`carregarContextoPrazo` do motor CPC) + `saudeProjeto`/`progressoProjeto`/
  `contarAtrasadas` (saúde/progresso DERIVADOS, nunca persistidos). Write
  [mutations.ts](src/lib/projetos/mutations.ts): CRUD Projeto, CRUD Template (replace-all
  de itens), `instanciarTemplateProjeto` (1 projeto + N tarefas via createMany numa tx, SEM
  notif por-tarefa), `bulkUpdateTarefas` (F4). Read [queries.ts](src/lib/projetos/queries.ts):
  `getProjetosDataset`/`getProjeto`/`getTemplates`/`getProdutividadeDashboard` (KPIs +
  saúde-por-projeto + carga-por-pessoa + gargalos, estilo `getDashboard`). Rotas via
  `runMutation`: `/api/projetos`(GET+POST), `/api/projetos/[id]`(PATCH+DELETE),
  `/instanciar`, `/dashboard`(GET), `/templates`(GET+POST), `/templates/[id]`,
  `/api/tarefas/lote`(PATCH). RBAC: criar/editar projeto = **sócio+advogado**
  (`ROLES_PROJETO_ESCRITA`), templates = **sócio** (`ROLES_TEMPLATE`); leitura aberta;
  projeto **fora** do gate `verFinanceiro`. LexIA: nova
  [tools/projetos.ts](src/lib/lexia/agent/tools/projetos.ts) (`listar_projetos`,
  `detalhe_projeto`, `listar_templates_projeto` readonly; `criar_projeto`,
  `instanciar_template_projeto` mutation gated) registrada; `criar_tarefa` ganhou
  `projetoId`; `/projetos` no whitelist de `navegar`; bullet no `prompt.ts`. Seed
  **`db:seed:projetos`** ([scripts/seed-projetos.ts](scripts/seed-projetos.ts)):
  upsert 1 Projeto por área (`chave area-<id>`) + **backfill** `Tarefa.projetoId` +
  template **"Holding Patrimonial"** (~11 itens). Soft-delete de Projeto: tarefas NÃO
  somem (lêem como "sem projeto"). Aditivo/lossless: a string `Tarefa.projeto` é
  MANTIDA (Fase 4 a aposenta). Testes novos: `tests/projetos-template.test.ts` (puro) +
  `tests/lexia-agent.test.ts` (gating das tools de projeto). tsc/test NÃO rodados (regra +
  Prisma lock). **Decisões Fase 1**: workspace de módulo (abas + rail) + caso/projeto
  separados c/ criação explícita + sugestão IA. **Fase 2** (prompt p/ Claude Design)
  ENTREGUE. **Fase 4** (integrar bundle do Claude Design) ENTREGUE (ver bullet acima).
  **User action (REQUIRED — Windows Prisma lock)**: parar `next dev` → `npm run db:migrate`
  (aplica 20260619000000_projetos) → `npm run db:generate` → `npm run db:seed:projetos`
  (áreas + backfill + Holding) → `npx tsc --noEmit` → `npm test` → `npm run dev`. Conferir:
  `npm test` verde; ledger de tarefas com `projetoId`; LexIA "quais projetos temos?" /
  "qual a saúde dos projetos?" / "instancie o template Holding para o cliente X" (sócio).
- **Visibilidade financeira por papel "Equipe" (this session)** (memory
  `project_financeiro_visibilidade`). Financeiro só p/ **Sócio/Admin/Financeiro**;
  "Equipe" (advogado/estagiário/staff) não vê nada do financeiro — exceto honorários
  pago/pendente na página do cliente (sem marcar recebimento). Núcleo: helper PURO
  `verFinanceiro(role)` + `ROLES_FINANCEIRO` em [users/types.ts](src/lib/users/types.ts)
  (NÃO é o `podeVerFinanceiro` de processos/rbac). Home: `getDashboard(verFin)` não
  popula nº financeiros + `OfficeDashboard`/`BriefingCard` escondem; briefing tem
  variante operacional sem financeiro (cache `briefing-diario-equipe`, `SYSTEM_EQUIPE`,
  `incluirFinanceiro` em coletarContexto/fallback/montar; `dados` scrubbado). Guards
  server `redirect("/")` em [/plano-acao](src/app/plano-acao/page.tsx) e
  [/financeiro](src/app/financeiro/page.tsx); sidebar `socioPlus`→`!verFinanceiro`.
  Comercial: só a aba **Campanhas** esconde valores (Visão/Funil intactos). LexIA:
  tools financeiras com `roles: ROLES_FINANCEIRO`, `toApiTools(role)` filtra o registry,
  `detalhe_cliente/caso/processo` removem o financeiro, prompt injeta recusa. Cliente:
  `CrmLancRow.canBaixa` (Equipe vê status, sem botão) + "Novo lançamento" oculto +
  rotas `lancamentos/[id]/{pagar,reabrir}` com `roles`. **Sem migração.** Testes:
  `tests/financeiro-visibilidade.test.ts` (novo) + `tests/lexia-agent.test.ts`
  (`toApiTools("admin")` + filtragem por papel). tsc/test NÃO rodados (regra: o
  usuário verifica). **User action**: `npx tsc --noEmit` → `npm test` → visual logando
  como Equipe (ex.: `staff`) e Sócio: home sem KPIs/painel financeiro nem "Ver plano de
  ação" + briefing sem números; `/plano-acao` e `/financeiro` redirecionam + "Financeiro"
  some do menu; Comercial→Campanhas sem valores; cliente vê honorários sem "Marcar
  recebido"; LexIA "qual o faturamento?" recusa p/ Equipe e responde p/ Sócio.
- **E-mail design system "LexIA · Sistema de e-mails" (this session)** (Claude
  Design handoff `LexIA - E-mails.html`). New shared, email-safe layout module
  [lib/notificacoes/email/layout.ts](src/lib/notificacoes/email/layout.ts) (PURO):
  tabelas + inline styles, **600px**, header navy `#020D25` com a assinatura
  **Lex+IA** (`IA` dourado) + régua dourada `2px`, corpo claro, **eyebrow** caixa-alta
  colorido por tom (`neutro|ouro|alerta|sucesso` — ouro reservado à IA), título h1 24px,
  intro 16px, **card de detalhe** FAFAF7 (`emailCard`/`emailRow`/`emailBadge`), **CTA**
  dourado (`emailButton` primary/secondary), `emailFinePrint` e **rodapé com a assinatura
  do escritório (NCM Advogados + endereço/e-mail)** — constante no layout. Os dois
  renderizadores existentes foram reescritos sobre ele:
  [render.ts](src/lib/notificacoes/email/render.ts) (modelo 01 · Notificação — eyebrow=módulo,
  tom por prioridade/IA) e [convite-email.ts](src/lib/users/convite-email.ts) (modelo 03 ·
  Convite — agora mostra "E-mail de acesso" no card; `enviarConvite` passa `to`). **Rebrand
  "Lexia"→"LexIA"** nos textos/subjects; CTA convite "Configurar meu acesso"→"Criar meu
  acesso", subject→"Você foi convidado para o LexIA"; notif CTA "Abrir no LexIA". Modelos
  04/05 do design (cobrança, recibo) NÃO implementados (sem callers no app). Testes
  ajustados: `tests/notificacoes-email.test.ts` + `tests/users-convite.test.ts` (copy/brand
  novos). Sem migração. **User action**: `npx tsc --noEmit` → `npm test` → enviar um e-mail
  de teste (Configurações → Debug) / criar usuário e conferir o novo visual na caixa de entrada.
- **E-mail via Microsoft Graph (this session)** (memory `project_user_invite`).
  Novo backend de e-mail além do SMTP: `getMailer()` em
  [mailer.ts](src/lib/notificacoes/email/mailer.ts) agora seleciona por
  `MAIL_PROVIDER` (auto|graph|smtp). `graphMailer()` usa token de aplicação
  (client credentials) via novo [lib/graph/token.ts](src/lib/graph/token.ts)
  (cache por tenant:client, `fetch` global — sem deps) + `POST
  /users/{GRAPH_MAIL_SENDER}/sendMail` (HTML + `toRecipients` por vírgula). Vars
  `GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET/MAIL_SENDER` + `MAIL_PROVIDER` em
  [env.ts](src/lib/env.ts) + `.env.example` (passos do app registration: permissão
  de **aplicação** Mail.Send + admin consent; pode reusar o app do `ONEDRIVE_*`).
  Nenhum chamador mudou (mailer plugável). Teste novo `tests/graph-mailer.test.ts`
  (fetch mockado: payload do sendMail, cache do token, multi-destinatário, erro
  ≠2xx). **Diagnóstico**: Configurações → Debug & simulação (admin) tem "Enviar
  e-mail de teste" → `POST /api/email/teste` (não-runMutation; devolve `backend` +
  o erro bruto do provedor em `detalhe`, sempre 200) → mostra sucesso/erro do Graph
  na tela. `mailerStatus()` expõe o backend ativo. **User action**: registrar o app
  no Entra ID (Mail.Send + consent + secret
  + caixa remetente) → setar `GRAPH_*` (+`APP_BASE_URL`) no `.env` → `npx tsc
  --noEmit` → `npm test` → criar um usuário e confirmar o e-mail chegando do
  remetente `GRAPH_MAIL_SENDER`. `MAIL_PROVIDER=smtp` força o SMTP.
- **User onboarding por convite (this session)** (memory `project_user_invite`).
  Criar usuário deixou de pedir senha: o admin informa só nome/e-mail/papel, o
  sistema **emite um convite** e (se houver SMTP) envia o **link de acesso**; o
  convidado define a própria senha + confirma o nome numa página pública. Núcleo
  `lib/users/convite.ts` (token 32B aleatório; persiste só o `sha256`; uso único +
  expira 7d; `emitirConvite` = criar+enviar; `definirSenhaPorToken` reivindica o
  token via `updateMany usadoEm:null` p/ evitar corrida) + `convite-email.ts`
  (HTML navy+gold, best-effort). `User.passwordHash` virou **nullable** (convidado
  nasce sem senha; o `authorize` do login rejeita hash null); novo model
  **`ConviteAcesso`** (migração `20260617000000_convite_acesso`, rebuild do User p/
  passwordHash null + tabela). `createUser` perdeu `senha`; POST `/api/users` cria +
  `emitirConvite` e devolve `{conviteLink,emailEnviado}`; nova `POST
  /api/users/[id]/convite` (reenviar). Endpoint **público** `POST
  /api/convite/definir-senha` (sem sessão, rate-limit por IP) + página bare
  `/definir-senha/[token]` (`DefinirSenhaForm`); ambos liberados no `proxy.ts`
  matcher; `UnifiedShell` renderiza bare em `/definir-senha`. UI admin: campo Senha
  removido do `NovoUsuarioModal` (mostra o link p/ copiar quando sem SMTP), badge
  "Convite pendente" (`UserRow.pendente = passwordHash null`) + ação "Reenviar
  convite"; `crm-api` `createUser`/`reenviarConvite`. `scripts/create-user.ts`
  (admin/seed) segue setando senha direto. Método: build direto; 1 teste puro novo
  `tests/users-convite.test.ts` (hashToken/gerarToken/expira/link + renderEmailConvite).
  tsc/test NÃO rodados (lock do Prisma). **User action (REQUIRED — lock do Windows)**:
  parar `next dev` → `npm run db:migrate` → `npm run db:generate` → `npx tsc --noEmit`
  → `npm test` → `npm run dev`. Verificar (sem SMTP): Configurações → Usuários → "Novo
  usuário" → modal mostra o link p/ copiar; abrir o link (aba anônima) → definir senha
  + nome → vai p/ /login → logar; reabrir o link usado → "Link inválido ou expirado".
- **Doc-editor AI = the REAL LexIA chat (this session)** (memory
  `project_documents_module`, `project_lexia_bar`). Replaced the bespoke `AIPanel`
  (`/api/documents/ai-suggest`) with the embedded `LexiaBar` rendered as a floating
  acrylic popup (editor-layout `lexFloat`) via a new wrapper
  `components/documents/editor/EditorLexia.tsx` (page `documents-editor`; contextual
  chips in `Suggestions.tsx`). The agent can now **edit the OPEN document**: a new
  client-tool `editar_documento_aberto` (kind:client, `clientEvent:"doc-patch"`)
  echoes dotted-path suggestions → a new **`doc-patch` SSE event/UiBlock/ChatBlock** →
  `DocPatchCard` "Aceitar/Aceitar todos" → editor `acceptSuggestions` on the live A4
  (no DB round-trip). The open contract rides each turn via `useLexiaStream.send`'s
  4th arg `documento` + `LexiaBar.sendContext` getter → chat route appends
  `<documento_aberto>` (built by `documentoContextoLexia` in `lib/documents/ai-suggest.ts`,
  now a pure field-dict module). **New tool `rascunhar_documento`** (kind:client,
  navigate) creates a `rascunho` Documento + auto-opens `/documents/editor/<tpl>?documento=<id>`
  (no confirm, no contract text in chat); prompt bullet in `agent/prompt.ts`; route
  whitelisted in `navegacao.ts`. Loop client-branch now switches on `tool.clientEvent`
  (navigate vs doc-patch). Deleted `AIPanel.tsx`/`.css.ts` + the `ai-suggest` route +
  the editor changes-log. The embedded bar renders **input at the BOTTOM** (like the
  dock popup; footer hints dropped) and takes a new **`minimal`** prop that hides
  Ações rápidas / Ir para / global search / detected actions — the editor shows ONLY
  the doc suggestions + chat. **No DB migration.** Method: direct build; `tests/lexia-agent.test.ts`
  re-run GREEN (14, incl. toApiTools over the 2 new tools). **User action**: `npx tsc
  --noEmit` (stop `next dev` first) → `npm test` → visual: editor → chat shows the
  floating LexIA popup; "Defina o foro…" → Aceitar card patches the live A4; from the
  dock "rascunhe uma minuta… para João Silva" → opens the editor prefilled (no chat
  text). NOTE: embedded popup is capped at 560px tall (LexiaBar embedded constant) —
  bump via a `maxHeight` prop if the user wants it taller.
- **Notifications redesign + LexIA-done implemented this session** (memory
  `project_notifications`, section 7). Adapted the Claude Design "Clientes, Casos &
  Agenda" prototype: Apple-style tile cards on toasts/bell/page, acrylic kept on
  dropdown+toasts, animated dismissal (`motion`), new `ia`/LexIA module, and the
  "LexIA terminou em segundo plano" notification. Method: direct build + 1 adversarial
  review workflow (4 dims, per-finding verify) → 3 confirmed low-sev findings fixed
  (decide-resume stale resumo; toast coalesce-by-id for `atualizada`; dropdown footer
  `[data-highlighted]`). **No DB migration** (modulo is `String?`); `motion` already a
  dep. tsc/tests NOT run (Prisma lock); 2 new pure test files (notif links `ia` +
  notif-ui helpers). **User action**: `npx tsc --noEmit` → `npm test` → visual check
  of /notificacoes, the bell dropdown, a toast (acrylic + slide-out on dismiss), and
  ask LexIA something then CLOSE the bar → expect a "LexIA concluiu…" toast.
- **(Possibly still pending from prior session) LexIA token-cost optimization** (memory
  `project_lexia_token_economia`). Real split (Opus 4.8 $5/$25): Opus 60% / Sonnet
  39% / Haiku <1% — total ≈ the $5 burned in 3 days; ~all of it is the chat agent.
  Four levers: (1) routing **equilibrado** — de-stickified Opus, narrowed trigger
  to a `REDACAO` regex, effort high→medium, maxTokens 16k→8k; (2) **1h cache TTL**
  on the tools+system prefix (kills the ~$1.15 Sonnet write-churn) + explicit
  history breakpoints (`agent/cache.ts`); (3) **real-time internal ledger** —
  `LexiaUso` model + `lib/consumo/{registrar,pricing,ledger}.ts` wired into all 7
  AI call-sites + `/api/consumo/interno` + a new "Em tempo real (estimado)" panel
  in Configurações (the Admin Cost API stays as the lagging "Faturado" panel); (4)
  **budget guard** (`lib/consumo/guard.ts`) auto-downgrades Opus→Sonnet past
  `limiarPct`% of the monthly cap with a "Modo econômico" notice. tsc/tests NOT run
  (Prisma lock); pure logic added/updated in 4 test files.
- **User action (Windows lock — REQUIRED; ledger needs the new table)**: stop
  `next dev` → `npm run db:migrate` (applies `20260616000000_lexia_uso`) → `npm run
  db:generate` → `npx tsc --noEmit` → `npm test` → `npm run dev`. Verify:
  Configurações → Consumo (IA) shows the real-time panel updating immediately after
  chatting; "analise o contrato…" routes to Sonnet, "rascunhe uma minuta…" to Opus;
  set a low cap + auto-downgrade and confirm Opus turns drop to Sonnet with the
  notice. Keep `lib/consumo/pricing.ts` in sync with Anthropic pricing.
- Always update this file at session end so the next session starts current.
