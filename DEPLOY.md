# Lexia — VPS deployment runbook (TurboCloud)

> Target: TurboCloud VPS (Ubuntu LTS), Caddy for HTTPS, systemd as process
> manager, SQLite + Litestream backup. One app, 2–5 users. Files referenced
> here live in `deploy/`.

## 0. Prerequisites

- TurboCloud Ubuntu LTS VPS, **≥ 2 GB RAM** (Puppeteer/Chromium needs headroom).
- A domain for the office; create a **DNS A record** pointing at the VPS IP
  *before* installing Caddy (it needs it to issue the TLS certificate).
- An S3-compatible bucket **off this VPS** for Litestream: TurboCloud object
  storage if S3-compatible (data stays in Brazil), else Backblaze B2 or
  Cloudflare R2. Note the endpoint, bucket name and keys.

## 1. Base system

```bash
# as root
adduser --disabled-password lexia
apt-get update && apt-get upgrade -y
apt-get install -y git curl sqlite3 ufw

# firewall: only SSH + HTTP/HTTPS
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

# Node 22 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Chromium for PDF generation (+ fonts/libs Puppeteer needs)
apt-get install -y chromium libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2 fonts-liberation

# Caddy (automatic HTTPS)
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy
```

## 2. App checkout + build

```bash
# as root
mkdir -p /srv/lexia && chown lexia:lexia /srv/lexia

# as lexia
sudo -iu lexia
git clone <REPO_URL> /srv/lexia
cd /srv/lexia
```

### Out-of-band files (gitignored — copy from the office machine!)

```bash
# from the office machine
scp .env lexia@<VPS>:/srv/lexia/.env
scp -r templates/ lexia@<VPS>:/srv/lexia/templates/   # letterhead assets
```

Edit `/srv/lexia/.env` for production:

```env
DATABASE_URL="file:/srv/lexia/prisma/prod.db"   # ABSOLUTE path — relative breaks under systemd
AUTH_SECRET="<openssl rand -base64 33>"          # fresh secret, NOT the dev one
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"
# remove ASTREA_BACKUP_DIR / GENIONS_CSV unless reimporting on the VPS
```

Build:

```bash
cd /srv/lexia
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run build
```

### Database

Either copy the office database (preferred — keeps all operator edits):

```bash
# office machine (stop `next dev` first)
scp prisma/dev.db lexia@<VPS>:/srv/lexia/prisma/prod.db
```

…or start fresh: `npx prisma migrate deploy` + `npm run db:seed` (needs the
Astrea backup dir + `ASTREA_BACKUP_DIR` set).

> If the copied DB contains the dev login user (`thiago@lexia.local`), delete
> it after creating the real accounts (step 5):
> `sqlite3 /srv/lexia/prisma/prod.db "DELETE FROM User WHERE email='thiago@lexia.local';"`

## 3. systemd service

```bash
# as root
cp /srv/lexia/deploy/lexia.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now lexia
journalctl -u lexia -f     # watch boot; "Ready" + no env errors expected
```

`ExecStartPre=npx prisma migrate deploy` runs on every start — production never
runs `migrate dev`/`db push`.

## 4. Caddy (HTTPS)

```bash
cp /srv/lexia/deploy/Caddyfile /etc/caddy/Caddyfile
# edit: replace lexia.example.com.br with the real domain
systemctl reload caddy
```

Optional second wall: uncomment the `remote_ip` allowlist in the Caddyfile to
restrict access to office/partner IPs.

> **Real-time notifications (SSE).** The notification stream
> (`GET /api/notificacoes/stream`) is a long-lived `text/event-stream` response.
> Caddy auto-detects SSE and disables response buffering for it (and the LexIA
> chat already streams the same way) — the bare `reverse_proxy` needs **no**
> change. Do **not** add a `flush_interval` override to the Caddyfile, which
> could re-introduce buffering and delay live toasts.
>
> **E-mail (optional channel).** In-app notifications work with no extra config.
> To also e-mail users (each opts in per module under Configurações →
> Notificações), set `SMTP_*` + `APP_BASE_URL` in `.env` (see `.env.example`);
> without them the app runs normally and just logs instead of sending.

## 5. Users

```bash
cd /srv/lexia
npm run user:create -- leandro@<dominio> "Leandro" "<senha-forte>" socio
npm run user:create -- leonardo@<dominio> "Leonardo" "<senha-forte>" socio
```

## 6. Backups (Litestream) — MANDATORY before go-live

```bash
# install (check latest release: https://github.com/benbjohnson/litestream/releases)
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb
dpkg -i litestream-*.deb        # installs /usr/bin/litestream; adjust ExecStart path if needed

cp /srv/lexia/deploy/litestream.yml /etc/litestream.yml
# edit bucket/endpoint to the real values
install -m 600 /dev/null /etc/litestream.env
# put in /etc/litestream.env:
#   LITESTREAM_ACCESS_KEY_ID=...
#   LITESTREAM_SECRET_ACCESS_KEY=...
cp /srv/lexia/deploy/litestream.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now litestream
systemctl status litestream     # must be active
```

### Restore drill (run it now, and again every few months)

```bash
litestream restore -config /etc/litestream.yml -o /tmp/check.db /srv/lexia/prisma/prod.db
sqlite3 /tmp/check.db "select count(*) from Lancamento;"   # ~427+ expected
rm /tmp/check.db
```

A backup that has never been restored is not a backup.

### Belt-and-braces weekly snapshot (cron, survives Litestream config mistakes)

```bash
# crontab -e (as lexia)
0 3 * * 0 sqlite3 /srv/lexia/prisma/prod.db ".backup /var/backups/lexia-$(date +\%F).db" && find /var/backups -name 'lexia-*.db' -mtime +56 -delete
```

(Create `/var/backups` writable by `lexia` first: `install -d -o lexia /var/backups`.)

## 6c. Jobs agendados (cron)

O app é request-driven (sem worker): um cron externo chama os endpoints de job
com o header `X-Job-Token: $JOBS_TOKEN` (sem o token, o endpoint responde 404).
Defina `JOBS_TOKEN` no `.env` e adicione ao `crontab -e` (como `lexia`):

```bash
# Notificações de prazos/compromissos (cedo, todo dia)
0 7 * * *    curl -s -X POST -H "X-Job-Token: $JOBS_TOKEN" https://<dominio>/api/jobs/notificacoes
# Captura CNJ — intimações (Comunica/DJEN) e andamentos (DataJud), dias úteis
0 7 * * 1-5  curl -s -X POST -H "X-Job-Token: $JOBS_TOKEN" https://<dominio>/api/jobs/captura-intimacoes
30 7 * * 1-5 curl -s -X POST -H "X-Job-Token: $JOBS_TOKEN" https://<dominio>/api/jobs/captura-andamentos
```

A captura de andamentos requer `DATAJUD_API_KEY` (chave pública do CNJ); sem ela,
o job vira no-op. A de intimações requer ao menos uma OAB cadastrada (Processos →
Captura). Carga inicial/backfill manual: `npm run cnj:captura -- --desde=YYYY-MM-DD`.
Ver `docs/processos-captura-cnj.md`.

## 7. Monitoring

`GET /api/health` returns `{ ok, db, uptime }` (503 when the DB is down) and is
excluded from the auth gate. Point a free pinger (UptimeRobot / healthchecks.io)
at `https://<dominio>/api/health`. Logs: `journalctl -u lexia`.

## 8. Update procedure

```bash
sudo -iu lexia
cd /srv/lexia
git fetch && git log --oneline HEAD..origin/master   # review what's coming
sqlite3 prisma/prod.db ".backup /var/backups/lexia-pre-deploy.db"   # snapshot
git pull
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run build
sudo systemctl restart lexia      # ExecStartPre applies any new migrations
journalctl -u lexia -n 50         # confirm clean boot
```

### Rollback

```bash
cd /srv/lexia
git checkout <previous-tag-or-sha>
PUPPETEER_SKIP_DOWNLOAD=1 npm ci && npm run build
cp /var/backups/lexia-pre-deploy.db prisma/prod.db   # only if a migration must be undone
sudo systemctl restart lexia
```

Tag releases (`git tag vYYYY-MM-DD && git push --tags`) so rollback targets are
obvious.

## 9. Go-live checklist

- [ ] `https://<dominio>/login` loads with a valid certificate; HTTP redirects to HTTPS.
- [ ] Login works for both sócios; wrong password shows the PT-BR error.
- [ ] `curl -i https://<dominio>/api/financeiro/lancamentos` (no cookie) → **401 JSON**.
- [ ] `curl -I https://<dominio>` shows `X-Frame-Options: DENY`, `nosniff`, `Strict-Transport-Security`, and no `X-Powered-By`.
- [ ] Financeiro tabs show the real data (Lancamento count matches the office machine).
- [ ] A PDF contract generates on the VPS (proves Chromium + `templates/` copied).
- [ ] `systemctl status litestream` active + **restore drill done** (row count matches).
- [ ] Dev login user removed; `AUTH_SECRET` is a fresh production value.
- [ ] Uptime pinger armed at `/api/health`.
