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
  loop+registry+router Haiku/Sonnet/Opus); mutations confirmation-gated; single
  acrylic LexIA bar (dock pill + ⌘K). Degrades without `ANTHROPIC_API_KEY`.
  Memories `project_lexia_agent`, `project_lexia_bar`.
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
