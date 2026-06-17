# Lexia — Production-Readiness Roadmap

> Produced 2026-06-10 from a multi-agent audit (8 dimensions: auth, API hardening, data layer, Next.js config, frontend robustness, ops, LGPD/PII, testing; every blocker/high finding adversarially verified). This document is the single source of truth for taking Lexia to production. Implementation happens session by session (see "Session sequencing").

## Locked decisions

- **Hosting:** TurboCloud VPS (Brazilian hosting), Ubuntu LTS, HTTPS via Caddy. SQLite + Puppeteer stay as-is (they rule out serverless; a persistent VPS is the right fit for 2–5 users). Brazilian datacenter = low latency + LGPD data-residency comfort.
- **Auth:** Auth.js (NextAuth v5) credentials, per-user accounts (2 sócios + possible staff), Prisma `User` table, gate on ALL routes (pages + API).
- The hardcoded "Helena Maria Vargas" preview data is **fictional** → placeholder swap only, no git-history scrub needed.

## Verified platform facts (read from repo/node_modules — trust these in future sessions)

- **Next 16 renamed `middleware.ts` → `src/proxy.ts`** (confirmed in `node_modules/next/dist/docs/.../proxy.md`; export named `proxy` or default; Node runtime by default — do not set `runtime` config in it).
- **Auth.js v5 beta supports Next 16:** `next-auth@5.0.0-beta.31` peerDeps allow `next ^16.0.0`, `react ^19`.
- **`runMutation()` in `src/lib/finance/api.ts` is imported by 26 of 32 API route files** — the single seam where auth guard, error envelope, audit log, and rate limit all land. The 6 outliers needing individual edits: `documents/generate`, `financeiro/reimport`, `financeiro/recorrencia/gerar`, `comercial/leads/import`, `comercial/campanhas/import`, `comercial/export`.
- No `.db`/`.csv`/`.env` was ever committed to git (verified `git log --all --diff-filter=A`). `.claude/settings.local.json` + `.claude/launch.json` ARE tracked and should be untracked.
- `.gitignore` excludes `/templates` — letterhead assets must be copied to the VPS out-of-band.
- Already solid: `src/lib/db/client.ts` Prisma singleton, `lang="pt-BR"`, tsconfig strict, money as integer centavos everywhere, idempotent importers (`astreaId`/`genionsId` `@unique`). Gaps: zero test infrastructure; zod only a transitive dep (must be added to `package.json`).

---

## P0 — Go-live gate (nothing internet-exposed before ALL of these)

| # | Item | Effort | Dependencies |
|---|------|--------|--------------|
| P0-1 | Auth.js v5: `User` model, login page, `src/proxy.ts` gate, per-route guard | L | blocks P1-1/5/10 |
| P0-2 | Error-message hardening (`runMutation` + 2 CSV import routes) | S | — |
| P0-3 | Security headers + production `next.config.ts` | S | — |
| P0-4 | `.env.example` + startup env validation (installs zod) | S | — |
| P0-5 | PII placeholder replacement (fictional — no history scrub) | S | — |
| P0-6 | SQLite backup: **Litestream** → S3-compatible bucket + restore drill | M | VPS (P0-8) |
| P0-7 | `prisma migrate deploy` story (systemd `ExecStartPre`) | S | — |
| P0-8 | VPS deployment runbook `DEPLOY.md` + `deploy/` units | M | P0-1..7 |
| P0-9 | Untrack `.claude/settings.local.json` + `.claude/launch.json` | S | — |

### P0-1 — Authentication (Auth.js v5 credentials, per-user accounts)

**Files:** `prisma/schema.prisma` (+`User { id, email @unique, nome, passwordHash, role @default("socio") /* 'socio'|'staff' */, ativo, createdAt, updatedAt }`, additive migration `auth`), NEW `src/lib/auth/index.ts` (NextAuth config: JWT sessions, `pages.signIn: "/login"`, Credentials provider with bcrypt compare), NEW `src/app/api/auth/[...nextauth]/route.ts` (re-exports `handlers`), NEW `src/proxy.ts`, NEW `src/app/login/page.tsx` + `src/components/auth/LoginForm.tsx` + `login.css.ts`, NEW `scripts/create-user.ts`, EDIT `src/lib/finance/api.ts`, EDIT the 6 outlier routes + GET handlers, EDIT shell topbar (user chip + "Sair").

**Sketch:**
1. `npm i next-auth@beta bcryptjs zod` (+`@types/bcryptjs`).
2. `src/proxy.ts`: `auth()` wrapper — unauthenticated `/api/*` → 401 JSON, pages → redirect `/login`; matcher excludes `/login`, `/api/auth`, `/api/health`, `/_next`, `favicon.ico`. Also reject non-GET `/api/*` whose `Origin` host ≠ request host (cheap CSRF belt; Auth.js cookies already httpOnly+Lax).
3. Defense in depth: `src/lib/auth/session.ts` → `requireUser()` calling `auth()`, throwing a 401 Response. Call once inside `runMutation()` (covers 26 routes); one-line guard in each GET handler + the 6 outlier routes.
4. Login page: standalone, no AppShell (pages self-wrap, so no shell changes), PT-BR labels ("E-mail", "Senha", "Entrar"), vanilla-extract consuming `src/styles/tokens.css.ts`/`theme.css.ts`; mirror input/button recipes from `NovoLancamentoModal`/`interativo.css.ts`.
5. `scripts/create-user.ts` (tsx CLI like `seed-socios.ts`): email/nome/senha → bcrypt hash → upsert. No public signup. `AUTH_SECRET` added to env (P0-4).

**Fallback** if `auth()` misbehaves as `proxy`: hand-write `src/proxy.ts` verifying the Auth.js JWT cookie via `getToken()`/jose — Auth.js still issues sessions. Full custom (jose cookie + credentials route) only as last resort.

### P0-2 — Error-message hardening

`runMutation` currently returns raw `e.message` to clients with blanket 400. Introduce `class UserError extends Error`; the validation throw-sites in `finance/mutations.ts`, `comercial/mutations.ts`, `tarefas/_input.ts` (already safe PT-BR messages like "id inválido") become `UserError` (mechanical find/replace). `runMutation`: `UserError` → 400 + message; anything else → log full error server-side, return generic "Erro ao processar a requisição" with 500. Same envelope in the 2 CSV import routes. Prisma errors never reach clients raw.

### P0-3 — Security headers + production `next.config.ts`

`headers()` for `/(.*)`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`; plus `poweredByHeader: false` and `serverExternalPackages: ["puppeteer"]`. CSP starts as `Content-Security-Policy-Report-Only` (`default-src 'self'`; Next inline scripts need nonce work) — promote later, don't block go-live. HSTS lives in the Caddyfile where TLS terminates.

### P0-4 — `.env.example` + env validation

NEW `src/lib/env.ts`: zod-parse `DATABASE_URL` (min 1), `AUTH_SECRET` (min 32), optional `ASTREA_BACKUP_DIR`/`GENIONS_CSV`/`PUPPETEER_EXECUTABLE_PATH` — throws at boot with a readable list of missing vars. Import at top of `src/lib/db/client.ts` + `src/lib/auth/index.ts` so any server entry fails fast. NEW `.env.example` documenting each var.

### P0-5 — PII placeholder replacement

Replace "Helena Maria Vargas"/CPF `312.984.760-15`/RG/address with obvious fakes ("Cliente Exemplo", `000.000.000-00`) in: `src/app/documents/download/page.tsx`, `src/app/documents/preview/page.tsx`, `src/components/documents/DraftPreview.tsx`, `src/components/documents/editor/AIPanel.tsx`, `src/components/documents/page/documents-page.data.ts`, `src/components/documents/page/tabs/CreateTab/CreateTab.tsx`. `BANK_INFO` at `src/lib/documents/generators/contrato-honorarios/content.ts:81` is the firm's own (ships in every contract) — optionally move to env (`CONTRATO_BANK_INFO`).

### P0-6 — SQLite backup: Litestream + restore drill

Litestream = continuous WAL streaming to an S3-compatible bucket; survives disk loss; single static binary + systemd service; zero app changes; enables WAL as a side effect. (A cron `.backup` on the same disk does not survive the disk.)

- **Bucket target:** TurboCloud object storage if S3-compatible (keeps data in Brazil); otherwise Backblaze B2 or Cloudflare R2 (encrypted at rest, pennies/month at this DB size). The bucket must be OFF the TurboCloud VPS itself — a provider-level failure must not take both copies.
- NEW `deploy/litestream.yml` (`retention: 30d`) + `litestream.service`.
- Belt-and-braces: weekly cron `sqlite3 prod.db ".backup /var/backups/lexia-$(date +%F).db"`, 8-week retention.
- **Mandatory restore drill** (documented in DEPLOY.md): `litestream restore -o /tmp/check.db <url>` → `sqlite3 /tmp/check.db "select count(*) from Lancamento;"` (~427 expected).

### P0-7 — `prisma migrate deploy` story

`package.json` script `"db:deploy": "prisma migrate deploy"`; systemd `ExecStartPre=npx prisma migrate deploy` so the app can't start against a stale schema. Production never runs `migrate dev`/`db push`. All roadmap migrations are additive; create them on the dev machine with `next dev` stopped (Windows locks the Prisma engine DLL).

### P0-8 — VPS deployment runbook (TurboCloud)

NEW `DEPLOY.md` + `deploy/{lexia.service,Caddyfile,litestream.yml,litestream.service}`:

1. Provision TurboCloud Ubuntu LTS VPS (≥2 GB RAM — Puppeteer/Chromium needs headroom); DNS A record for the office domain → TurboCloud IP; firewall open only 80/443/SSH.
2. Non-root user `lexia`, Node 22 LTS, `git clone` to `/srv/lexia`.
3. **Out-of-band files (gitignored!):** scp `.env` and `templates/` (letterhead); `prisma/prod.db` from first `migrate deploy` + reimport, or copied from the office machine.
4. `DATABASE_URL="file:/srv/lexia/prisma/prod.db"` — **absolute** path (relative breaks under systemd cwd).
5. Chrome for Puppeteer: `apt-get install -y chromium` + `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` + `PUPPETEER_SKIP_DOWNLOAD=1` (or `npx puppeteer browsers install chrome` + system libs `libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2 fonts-liberation`). Keep `--no-sandbox` only because the process runs as unprivileged `lexia`.
6. Process manager: **systemd** (not PM2): `ExecStart=npm run start`, `Restart=always`, `ExecStartPre=npx prisma migrate deploy`, `Environment=NODE_ENV=production`; journald captures stdout (pairs with P1-7 pino).
7. Caddy: `reverse_proxy localhost:3000` + `Strict-Transport-Security` header — automatic HTTPS; optionally office-IP allowlist as a second wall.
8. Create the 2 sócio users via `scripts/create-user.ts`. 9. Litestream service + restore drill. 10. Update procedure + rollback (previous git tag + DB snapshot).

### P0-9 — Untrack Claude settings

`git rm --cached .claude/settings.local.json .claude/launch.json`; add to `.gitignore`. One commit.

---

## P1 — First weeks after go-live

| # | Item | Effort | Depends on |
|---|------|--------|-----------|
| P1-1 | Audit trail: `createdAt/updatedAt` on `Lancamento`/`Honorario`/`Conta`/`Transferencia`/`CustoFixo`/`CasoResponsavel` + append-only `AuditLog { ts, actorEmail, action, entity, entityId, payload }` + actor via `runMutation(fn, { action })` meta | M | P0-1 |
| P1-2 | Zod validation at route boundary: one schema per mutation payload (transcribe the existing `*Create`/`*Patch` types), money `z.number().int().min(0)`, bulk IDs `.max(500)`, CSV imports reject >5 MB + non-text content types; failures throw `UserError` → clean 400 | L | P0-4 |
| P1-3 | Shared Toast + `apiSend()` client helper: promote `send()` from `LancamentosTable.tsx:24`; reuse the proven `TarefasApp` toast pattern rebuilt with vanilla-extract; network failure → "Sem conexão — tente novamente" with retry action; 401 → redirect `/login` | M | — |
| P1-4 | Double-submit hardening: client in-flight lock keyed by method+url+body-hash (covers the pre-`busy` click race in `CmModals.tsx`); server accepts optional `requestId` → `astreaId: app-lanc-${requestId}` instead of fresh uuid (`finance/mutations.ts:191,351`) — the existing `@unique` makes retried creates idempotent for free; then enable auto-retry-once in `apiSend` | M | P1-3 |
| P1-5 | Rate limiting: in-memory sliding window (~40 lines, no deps, single Node process), key `email:routeGroup`, 60 writes/min default; strict buckets: `bulk` 10/min, `reimport` 2/10min, `import` 5/min, `generate` 6/min → 429 "Muitas requisições — aguarde um instante" | S | P0-1 |
| P1-6 | `src/app/global-error.tsx` (renders own html/body) + `error.tsx` + `not-found.tsx` — PT-BR, tokens (navy/gold), no stack traces | S | — |
| P1-7 | pino → stdout (journald handles retention); replace `console.error` sites in `finance/api.ts`, `documents/generate`, `reimport`; `runMutation` logs `{action, actor, ms, err}` on failure; document `journalctl -u lexia` | S | — |
| P1-8 | `/api/health`: `SELECT 1` → `{ ok, db, uptime }`, 503 on failure; excluded from proxy matcher; point a free pinger (UptimeRobot/healthchecks.io) at it — that's the whole monitoring story | S | — |
| P1-9 | Puppeteer lifecycle in `pdf.ts` (the whole seam is that one file): module-level singleton browser (`disconnected` → reset), promise-chain serial queue (concurrency 1 is right for this office), 30s timeout on `page.pdf`, close the **page** not the browser in `finally` | S | — |
| P1-10 | LGPD: export `?redact=1` (strip telefone/email, names → initials in CSV/JSON/AI-prompt — default ON for the AI prompt, PII was being pasted into external LLMs) + `anonimizarCliente` workflow (anonymize-in-place for ledger integrity: PII fields → "[REMOVIDO LGPD]"/null incl. linked Leads, AuditLog entry as deletion evidence; hard-delete only never-converted Leads) | M | P0-1, P1-1 |
| P1-11 | vitest bootstrap + first tests for the pure modules: `finance/money.ts` (pt-BR parse/format, negatives), `finance/periodo.ts` (month/quarter/year boundaries, December rollover), `getAcertoSocios` math (split + transfer netting), `cm-meta.ts` KPIs (ROAS/CAC with zero denominators). ~60–80 assertions; no component/E2E tests yet | M | — |

## P2 — Later

WAL pragma (`journal_mode=WAL; busy_timeout=5000`) in `db/client.ts` for dev parity (Litestream flips it in prod); `engines` + `.nvmrc` (Node 22); `noUncheckedIndexedAccess` (fix `MES_ABBR[...]` sites); extract shared `kpi-formulas.ts` to dedupe `cm-meta.ts` vs `comercial/queries.ts` (after P1-11 tests exist); Radix `AlertDialog` replacing `window.confirm()` + modal a11y/focus-trap pass; `onDelete: Restrict`/soft-delete so a Caso with honorários can't vanish silently; Genions fallback-ID tie-breaker (+telefone) in `import/leads.ts`; `$transaction` chunks in importers; `docx.ts` `as any` cleanup (5×) + `slot.tsx children: any`; pre-commit hook rejecting `*.db`/`.env*`; promote CSP to enforced once nonce strategy verified; role gating (`role === "socio"` for reimport/bulk/user-mgmt) once staff accounts exist; currency-input live validation in `CmMoneyInput`/`fx.ts`.

## Dropped audit items (so future sessions don't re-litigate)

- "DB file in git history" — **false**, verified clean.
- "Prisma singleton risky" — false; canonical pattern.
- "Missing Lead→Campanha FK" — false; relation exists.
- "Missing charset/viewport/lang" — Next emits them; `lang="pt-BR"` set.
- OpenAPI docs — the app is the API's only consumer.
- Feature flags — 2 users; env vars suffice.
- Browser pooling beyond singleton+queue — a few PDFs/day.
- ISR/edge caching — internal SQLite tool; `force-dynamic` is correct.
- Docker — systemd on one VPS is less surface; revisit only if hosting changes.
- Full monitoring/alerting stack — health + pinger + journald covers it.
- Correlation IDs — fold into pino if ever needed.
- Optimistic locking — last-write-wins acceptable for 2 known users; AuditLog gives forensics.
- DST date refactor — Brazil abolished DST in 2019; verifier downgraded to low.
- Custom ESLint finance rules — low ROI.
- Test-fixture reset endpoint — prod footgun; seeds exist.
- SQLCipher/at-rest DB encryption — unsupported by Prisma; VPS disk crypto + encrypted backup bucket instead.
- Import progress UI/cancellation — rare admin op; summary response suffices.

## Session sequencing

| Session | Scope | Items |
|---------|-------|-------|
| 1 — Auth core | deps, User migration, auth config, `src/proxy.ts`, login page, create-user CLI, `requireUser` guards, topbar "Sair" | P0-1 |
| 2 — Hardening | error envelope (`UserError`), headers + `serverExternalPackages`, `src/lib/env.ts` + `.env.example`, PII placeholders, untrack `.claude` files | P0-2..P0-5, P0-9 |
| 3 — Deploy & backup | `DEPLOY.md` + `deploy/` units, `db:deploy`, Litestream, `/api/health`, WAL/engines ride along → **go-live possible after this** | P0-6..P0-8, P1-8 |
| 4 — Data-layer P1 | audit-trail migration + AuditLog + runMutation meta, zod schemas + body caps, rate limiting | P1-1, P1-2, P1-5 |
| 5 — UX robustness | shared Toast + `apiSend`, double-submit, error boundaries, pino, Puppeteer singleton | P1-3, P1-4, P1-6, P1-7, P1-9 |
| 6 — Tests & LGPD | vitest + money/periodo/acerto/cm-meta tests, export redaction, anonymization | P1-11, P1-10 |

## Verification (manual, per P0 — user verifies visually; tsc only)

- **Auth:** `npx tsc --noEmit` clean; incognito → any page redirects to `/login`; wrong password → PT-BR error; correct → Início + user chip; `curl -i /api/financeiro/lancamentos` without cookie → **401 JSON** (not redirect, not data); `curl -X POST .../api/tarefas` → 401.
- **Errors:** POST `{}` to a mutation route → clean 400 PT-BR; forced Prisma error (e.g. duplicate) → generic 500, no `prisma`/file-path strings in body.
- **Headers:** `curl -I` shows `X-Frame-Options: DENY`, `nosniff`, no `X-Powered-By`; HSTS via Caddy.
- **Env:** remove `AUTH_SECRET` from `.env` → boot fails listing the missing var; `.env.example` matches reality.
- **PII:** `grep -ri "Helena\|312.984" src/` → empty; document previews render placeholders.
- **Backup:** `systemctl status litestream` active; restore drill row-count matches (~427+ Lancamento).
- **Migrations:** on VPS `prisma migrate deploy` → "No pending migrations"; clean restart per `journalctl -u lexia`.
- **Runbook:** executed top-to-bottom on a fresh TurboCloud VPS; success = HTTPS login + a PDF contract generated on the VPS (proves Chrome + templates copied) + financeiro tabs showing real data.
- **Untrack:** `git ls-files | grep .claude` → empty.

## Critical files (where the work lands)

- `src/lib/finance/api.ts` — runMutation choke point (auth, errors, audit, rate-limit all land here)
- `prisma/schema.prisma` — User model, audit timestamps, AuditLog (all additive migrations)
- `src/proxy.ts` — NEW; Next 16 proxy (renamed middleware) gating pages + APIs
- `next.config.ts` — headers, poweredByHeader, serverExternalPackages
- `src/lib/documents/generators/contrato-honorarios/pdf.ts` — Puppeteer singleton/queue seam
