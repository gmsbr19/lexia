# WhatsApp (Baileys) — operação do worker

Complemento operacional de [`whatsapp-baileys.md`](whatsapp-baileys.md) (o brief, mantido
verbatim). Aqui fica só o que é preciso para **rodar** o módulo. Estado atual: **fase 3**
(ingestão, página de conversas e vínculo com cliente). As ferramentas MCP de leitura são a
fase 4.

Mensagens **só** são gravadas das conversas que o usuário marcar em `/whatsapp/conversas`;
conversa não marcada tem apenas metadado (nome, telefone, data da última mensagem), que é o
que deixa o usuário escolher.

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
| `lexia_whatsapp_cmd` | app → worker | `iniciar`, `pareamento`, `desconectar`, `recarregar` (sempre com o `userId` da **sessão**) |
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

## 5. Ingestão (fase 3)

O worker escuta `chats.upsert`/`chats.update`/`contacts.upsert`/`contacts.update` (metadado
de conversa) e `messages.upsert`/`messaging-history.set` (conteúdo). A regra:

- **metadado de todas** as conversas é mantido — é a lista que o usuário vê;
- **conteúdo só** de conversa com `monitorar = true`;
- **contatos não criam conversa**: `contacts.*` é a agenda inteira do aparelho e só
  ATUALIZA linhas que já existem (senão a lista encheria de gente que nunca escreveu);
- reação, mensagem de protocolo, de sistema e status/newsletter nunca são gravados;
- a mesma mensagem chegando duas vezes (reenvio, ou pelo histórico **e** pelo notify) é
  barrada pela unicidade `(chatId, msgId)`.

Ligar/desligar o interruptor na página publica `recarregar` no canal de comando, que derruba
o cache de conversas do worker (há um TTL de 60 s como rede de segurança). **Mensagens
anteriores a ligar o monitoramento não existem** e não há como recuperá-las: o Baileys não
oferece busca de histórico sob demanda. `WhatsappChat.monitoradoEm` registra o momento, e a
página diz isso na linha da conversa.

### Mídia: caixa de entrada, não arquivo

Os bytes vão para `WhatsappMidia` (tabela própria, para que nenhuma consulta de mensagem os
arraste por descuido), em base64, com **teto de 10 MB** por arquivo — igual aos outros anexos
do Lexia. Acima do teto, ou se o download falhar, fica só o metadado (tipo, mime, nome e
`midiaTamanho`, que vem declarado na própria mensagem).

O arquivo no CDN do WhatsApp é **cifrado com chaves que vivem na mensagem** e a URL expira:
é baixar na hora ou nunca. Nem o Claude, depois, consegue buscá-lo de lá — por isso o worker
baixa no momento em que a mensagem chega.

Download pela rota `GET /api/whatsapp/midia/<id>?t=<token>`, com duas autenticações: o token
assinado (HMAC derivado da `WHATSAPP_AUTH_KEY`, validade 15 min, amarrado ao par
mensagem+usuário) ou a sessão do usuário. É a única rota de `/api/whatsapp` fora do gate do
`proxy.ts`, justamente porque o link precisa funcionar sem cookie — sem token válido ela
mesma exige sessão e devolve 401.

A intenção é que a triagem aconteça no claude.ai (fase 4): o Claude baixa, arquiva onde quer
(OneDrive) e os bytes podem sair do Lexia, ficando o metadado.

### Retenção

O worker faz uma faxina por dia (pendurada no heartbeat):

| o que | prazo | constante |
| --- | --- | --- |
| bytes de mídia não reclamados | 30 dias (o metadado fica) | `MIDIA_RETENCAO_DIAS` |
| mensagens gravadas | 24 meses (a mídia vai pelo cascade) | `MENSAGEM_RETENCAO_MESES` |

Em `src/lib/whatsapp/mensagens-core.ts`. Desmarcar uma conversa não apaga o que já foi
guardado — a página **oferece** apagar (`DELETE /api/whatsapp/conversas/<id>/mensagens`), e é
irreversível.

## 6. Isolar as tabelas do `sql_consultar` — AÇÃO PENDENTE

`prepareSql` ([`src/lib/mcp/sql-core.ts`](../src/lib/mcp/sql-core.ts)) recusa qualquer
consulta que mencione uma tabela `Whatsapp*` ou `OAuth*`, e o `sql_schema` não as lista.
**Isso não é a fronteira de segurança**: o filtro é por nome, e o app conecta como
`postgres` (SUPERUSER), que tem outros caminhos (`pg_read_file`, por exemplo). A fronteira é
um papel sem superusuário:

```sql
-- rodar como postgres, em CADA ambiente (local e produção)
CREATE ROLE lexia_ro LOGIN PASSWORD '<senha forte>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
GRANT CONNECT ON DATABASE ncm TO lexia_ro;
GRANT USAGE ON SCHEMA public TO lexia_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO lexia_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO lexia_ro;
REVOKE SELECT ON "WhatsappChat", "WhatsappMensagem", "WhatsappMidia", "WhatsappAuth",
  "WhatsappSessao", "OAuthClient", "OAuthCode", "OAuthToken" FROM lexia_ro;
```

Depois, no `.env` (e nas variáveis do serviço no EasyPanel):

```
DATABASE_URL_RO=postgresql://lexia_ro:<senha>@<host>:5432/ncm
```

O `sql_consultar` já troca de client sozinho quando a variável existe
([`src/lib/mcp/sql.ts`](../src/lib/mcp/sql.ts) `client()`). Conferir depois:
`SELECT * FROM "WhatsappMensagem"` tem de ser recusado **pelo banco** (permission denied), e
não só pelo filtro de nome.

> O `ALTER DEFAULT PRIVILEGES` faz tabela NOVA nascer legível pelo papel. Ao criar uma
> tabela sensível no futuro, `REVOKE` explícito **e** acrescentar o prefixo em
> `PREFIXOS_BLOQUEADOS` (`sql-core.ts`).

## 7. Pendências conhecidas (fase 4)

- As 7 ferramentas MCP de leitura (`whatsapp_status`, `whatsapp_conversas`,
  `whatsapp_ler_conversa`, `whatsapp_pendencias`, `whatsapp_anexo`,
  `whatsapp_marcar_tratadas`, `whatsapp_vincular_cliente`).
- O envelope de resultado do MCP hoje só devolve **texto**, com teto de 100 mil caracteres
  (`MAX_RESULT_CHARS` em [`src/lib/mcp/exec.ts`](../src/lib/mcp/exec.ts)) — ~75 KB em
  base64. Entregar um PDF ao Claude exige ou estender o `exec` para blocos de imagem/recurso
  do MCP, ou dar a ele o link assinado da mídia para buscar. A decisão é da fase 4.
- `WhatsappMensagem.tratadaEm` e `WhatsappMensagem.midiaPath` já existem e **não são usados
  ainda**: o primeiro é o "já organizei isto" da fase 4; o segundo é o ponteiro para um
  storage externo (OneDrive/S3), se os bytes um dia saírem do banco.
