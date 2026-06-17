# Captura CNJ — Processos & Prazos (fontes públicas gratuitas)

Módulo de captura automática de **intimações** e **andamentos** usando **apenas as
APIs públicas e gratuitas do CNJ**. Sem serviços pagos, sem scraping com login de
tribunal, sem armazenar credenciais de tribunal de ninguém.

> ⚠️ **Apoio à decisão, não substituto.** A captura sugere; o cálculo de prazo é
> conferência **obrigatória** do advogado. Intimações entram como *publicações a
> triar* — o prazo só nasce quando uma pessoa confirma a peça e a quantidade de dias.

## As duas fontes

| Fonte | Para quê | Chave | Conta prazo? |
|---|---|---|---|
| **Comunica/DJEN** (`comunicaapi.pje.jus.br`) | Intimações **por OAB** | Não (público) | **Sim** — vira `Publicacao` a triar |
| **DataJud** (`api-publica.datajud.cnj.jus.br`) | Capa + **andamentos** por nº CNJ | `DATAJUD_API_KEY` (chave pública do CNJ) | **Não** — metadados defasados → `Andamento` |

O DataJud é a "base nacional de metadados processuais": é **defasado** (horas a
semanas) e **não traz o teor das publicações**, então **nunca** alimenta o motor de
prazos. A contagem nasce só do texto/disponibilização do **Comunica/DJEN**.

## Configuração

1. **OABs do escritório** (Comunica/DJEN) — cadastre em **Processos → Captura**
   (botão *Adicionar OAB*) ou via CLI:
   ```bash
   npm run cnj:seed:oabs -- 123456/SP "Nome do Advogado"
   ```
2. **Chave do DataJud** (opcional, só p/ andamentos) — `DATAJUD_API_KEY` no `.env`.
   É a chave **pública** divulgada na [wiki do CNJ](https://datajud-wiki.cnj.jus.br/api-publica/acesso)
   ("por transparência"); pode rotacionar — se a captura de andamentos der 401,
   atualize com o valor corrente da wiki. Sem ela, a captura de andamentos fica
   desabilitada (as intimações seguem funcionando).
3. **Janela de varredura** — `CAPTURA_JANELA_DIAS` (default 7).

## Como rodar

**Na tela** (Processos → Captura): *Pré-visualizar* (dry-run, não grava) e *Rodar
agora*. As rotas manuais exigem login (`socio`/`advogado`).

**CLI** (carga inicial / backfill / depuração):
```bash
npm run cnj:captura -- --dry                 # simula (não grava)
npm run cnj:captura -- --desde=2026-01-01     # backfill de intimações desde a data
npm run cnj:captura -- --andamentos           # roda também o DataJud
```

**Amostragem das APIs** (REGRA ZERO — modela o parsing a partir do payload real):
```bash
npm run cnj:sample -- --oab=526952/SP --de=2026-06-01 --ate=2026-06-12
npm run cnj:sample -- --oab=526952/SP --cnj=00008323520184013202   # DataJud (precisa da chave)
```
Salva `src/lib/processos/cnj/__fixtures__/*.latest.json`. As fixtures `*.sample.json`
(commitadas) são as usadas pelos testes e **não** são sobrescritas.

**Cron** (produção — o app é request-driven; um cron externo chama os jobs com o
header `X-Job-Token: $JOBS_TOKEN`, igual ao job de notificações). Cedo, dias úteis:
```cron
0 7  * * 1-5  curl -s -X POST -H "X-Job-Token: $JOBS_TOKEN" https://<dominio>/api/jobs/captura-intimacoes
30 7 * * 1-5  curl -s -X POST -H "X-Job-Token: $JOBS_TOKEN" https://<dominio>/api/jobs/captura-andamentos
```
O job de intimações pula sozinho em fim de semana/feriado (`?force=1` sobrepõe).
`?dry=1` simula; `?desde=YYYY-MM-DD` faz backfill.

## Arquitetura (resumo)

```
OABs (banco) ─┐
              ├─► capturarIntimacoes ─► comunica/client → map ─┐
DataJud key ──┘                                                ├─► ingerir({publicacoes|andamentos})  (porta existente, idempotente por externalId)
processos ───── capturarAndamentos ─► datajud/client → map ───┘            │
                                                                            ▼
                                              Publicacao (a triar) → triagem humana → Prazo (motor CPC)
                                              Andamento (timeline)
```
- Clients finos e **config-driven**: `src/lib/processos/cnj/config.ts` é o único lugar
  com endpoints/params/headers. `http.ts` faz retry/backoff com jitter (429/5xx).
- Orquestração `cnj/captura.ts`: **falha isolada** por OAB/tribunal (uma falha não
  derruba a rodada), dedup, dry-run, backfill, e grava `ExecucaoCaptura` (o log que
  vira o **alerta de falha de captura** no app).
- CNJ → índice DataJud: `cnj-tribunal.ts` (Res. 65/2008), testado.

## Dados coletados / LGPD

- **Comunicações** (Comunica/DJEN): nº do processo, data de disponibilização, órgão,
  tipo, **inteiro teor** e as partes/advogados — são **dados públicos** do Diário de
  Justiça, mas contêm **dados pessoais**. Guardamos só o necessário (`Publicacao`).
- **Andamentos** (DataJud): só metadados (classe/assunto/órgão/movimentos).
- **Acesso restrito**: as telas e rotas exigem login + papel (RBAC) e respeitam o
  escopo por responsável. **Logs não registram dados pessoais** — só host, status e
  contagens; mensagens de erro mascaram dígitos longos (CPF/OAB/protocolo).
- **Expurgo**: processos/publicações/partes usam *soft-delete* (`excluidoEm`); a
  exclusão da entidade remove o dado do uso corrente.
- **Sem credenciais de tribunal**: o desenho é só com APIs públicas — nada de
  login/senha/SEED de tribunal é solicitado ou armazenado.

## Limites e cuidados

- DataJud: limite oficial **120 req/min** (auto-throttle no orquestrador). É **beta**
  e pode estar desatualizado.
- Comunica: sem limite publicado → auto-throttle entre páginas; exige `User-Agent`
  de browser (datacenter recebe 403).
- Idempotência: re-rodar um job **não duplica** (dedup por `externalId` = `hash` da
  comunicação / id+codigo+data do movimento).
