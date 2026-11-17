# WhatsApp (Baileys) — operação do worker

Complemento operacional de [`whatsapp-baileys.md`](whatsapp-baileys.md) (o brief, mantido
verbatim). Aqui fica só o que é preciso para **rodar** o módulo. Estado atual: **fase 2**
(schema, worker e página de conexão). A ingestão de mensagens é a fase 3 — hoje **nenhuma
mensagem é gravada**, a conexão só mantém o aparelho pareado.

## 1. Variável obrigatória

```
WHATSAPP_AUTH_KEY=<32 bytes em hex>
```

Gere com `openssl rand -hex 32` (ou
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Trocar a chave invalida as
sessões já conectadas — todos releem o QR.

É a chave AES-256-GCM que cifra o auth state do Baileys em `WhatsappAuth.valor`. **Quem tem
aquela linha em claro tem o WhatsApp da pessoa** — por isso a chave vive só no ambiente,
nunca no banco: um dump sem o `.env` é inútil. Use valores **diferentes** em dev e produção.

Sem a variável o módulo fica desligado por omissão: as rotas respondem 404, a página avisa
"não configurado" e o worker se recusa a subir. Trocar a chave invalida as sessões já
conectadas (todos releem o QR) — o auth state ilegível é tratado como ausente.

## 2. Rodar o worker

```bash
npm run whatsapp:worker
```

Processo Node contínuo, **separado do app web** (cada sessão é um WebSocket permanente, que
não cabe num app request-driven). Precisa das mesmas `DATABASE_URL` e `WHATSAPP_AUTH_KEY`;
lê o `.env` do diretório onde é iniciado.

Em produção (EasyPanel/Nixpacks) é um **2º serviço do mesmo projeto**, apontando para o mesmo
repositório e o mesmo banco, com:

- comando de start `npm run whatsapp:worker` (em vez do `npm start` do serviço web);
- as mesmas variáveis de ambiente do serviço `lexia`;
- **sem** porta publicada — o worker não atende HTTP;
- política de reinício automático (ele **sai de propósito** em situações em que continuar
  seria perigoso; ver abaixo).

> O serviço web continua rodando `prisma migrate deploy && next start`. O worker **não**
> aplica migração: ele assume o schema já aplicado pelo serviço web.

### Instância única

Duas conexões da mesma sessão do WhatsApp se derrubam mutuamente. O worker toma um
`pg_advisory_lock` (id 7333) ao subir e tenta por ~60 s antes de desistir; se não conseguir,
**sai com código 1**. Se a conexão de controle cair depois (o lock é liberado junto), ele
também sai — o supervisor sobe outro, que retoma o lock. Nunca rode dois.

### Como saber se ele está no ar

O worker grava um *heartbeat* a cada 30 s no `AppSetting` de chave `whatsapp.worker`. A
página `/whatsapp/conectar` mostra um aviso quando a última batida tem mais de ~95 s, e o
botão "Desconectar" passa a revogar as credenciais localmente (apagando `WhatsappAuth`) em
vez de esperar o worker.

### Comunicação app ↔ worker

`LISTEN/NOTIFY` do Postgres, sem infraestrutura nova:

| canal | sentido | conteúdo |
| --- | --- | --- |
| `lexia_whatsapp_cmd` | app → worker | `iniciar`, `pareamento`, `desconectar` (sempre com o `userId` da **sessão**) |
| `lexia_whatsapp_evt` | worker → app | `qr`, `pareamento`, `conectado`, `erro`, `deslogado`, `status` |

O app mantém uma conexão `LISTEN` dedicada (`src/lib/whatsapp/bus.ts`, aberta só quando
alguém abre a página) e redistribui os eventos para os SSE em `/api/whatsapp/eventos`.

## 3. O que o worker faz (e o que nunca faz)

- `markOnlineOnConnect: false` — **o celular continua recebendo notificações**. Com `true`,
  o WhatsApp passaria a considerar este cliente o ativo e o aparelho pararia de notificar.
- **Nunca** chama `readMessages`/`sendReceipt`: o contato não vê confirmação de leitura por
  causa do Lexia.
- Não envia mensagem por caminho nenhum (a v1 é somente leitura).
- `syncFullHistory: false`; `status@broadcast` e newsletters nem são decifrados.
- Aparece no celular como **Lexia** em *Aparelhos conectados*.
- Logs em `warn` (`WHATSAPP_LOG_LEVEL` ajusta) e **sem conteúdo de mensagem**.

Ao fechar a conexão, o worker decide pelo código do WhatsApp:

| situação | ação |
| --- | --- |
| `loggedOut` (401), `forbidden` (403), `multideviceMismatch` (411) | apaga `WhatsappAuth` e marca `deslogado` — exige QR novo |
| `connectionReplaced` (440) | **para** essa sessão (reconectar brigaria com a outra instância) |
| `restartRequired` (515) | reconecta na hora |
| qualquer outro | reconecta com backoff 1 s → 60 s |

Usuário com `ativo = false` não conecta: a sessão é encerrada e as credenciais apagadas.

## 4. Versão do Baileys

Fixada **exata** em `7.0.0-rc14` (a tag `latest`). É a série que traz o LID (`@lid`), de que
a fase 3 depende para resolver LID → número e vincular conversa ↔ cliente. Por ser RC, a
versão é fixa sem `^`: atualizar é uma decisão deliberada, com leitura das notas de migração
(`whiskey.so/migrate-latest`).

Todo arquivo que toca o Baileys é `.mts` (ESM). O pacote é ESM-only e carrega WASM
(`whatsapp-rust-bridge`), cujo `package.json` só declara a condição `import` — importado de
um módulo CJS (que é o que um `.ts` é neste pacote) a resolução falha com
`ERR_PACKAGE_PATH_NOT_EXPORTED`. O resto do módulo é `.ts` normal e é compartilhado com o
app web, que **nunca** importa o Baileys.

## 5. Pendências conhecidas (fases seguintes)

- **`sql_consultar` do MCP ainda lê as tabelas `Whatsapp*`.** O app conecta no Postgres como
  `postgres` (SUPERUSER), então revogar privilégio de tabela não adianta. O caminho é criar
  o papel `lexia_ro` (`NOSUPERUSER`, SELECT só no permitido) e setar `DATABASE_URL_RO`, que
  o `sql_consultar` já sabe usar. **Necessário antes da fase 3**, quando passa a haver
  conteúdo de conversa gravado.
- **Storage de mídia** (fase 3): o Lexia não tem storage de arquivos nem link assinado hoje.
  Decisão pendente entre MinIO/S3 no EasyPanel e volume em disco + rota com token HMAC.
- `/whatsapp/conversas`, a ingestão e as 7 ferramentas MCP são as fases 3 e 4.
