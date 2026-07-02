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
