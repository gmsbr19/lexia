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

## 6. Isolar as tabelas do `sql_consultar`

`prepareSql` ([`src/lib/mcp/sql-core.ts`](../src/lib/mcp/sql-core.ts)) recusa qualquer
consulta que mencione uma tabela `Whatsapp*` ou `OAuth*`, e o `sql_schema` não as lista.
**Isso não é a fronteira de segurança**: o filtro é por nome, e o app conecta como
`postgres` (SUPERUSER), que tem outros caminhos (`pg_read_file`, por exemplo). A fronteira é
um papel sem superusuário.

### Criar o papel — AÇÃO MANUAL, uma vez por ambiente

```sql
-- rodar como postgres, em CADA ambiente, com senhas DIFERENTES
CREATE ROLE lexia_ro LOGIN PASSWORD '<senha forte>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
GRANT CONNECT ON DATABASE ncm TO lexia_ro;
GRANT USAGE ON SCHEMA public TO lexia_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO lexia_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO lexia_ro;
```

Depois, no `.env` (e nas variáveis do serviço no EasyPanel):

```
DATABASE_URL_RO=postgresql://lexia_ro:<senha>@<host>:5432/ncm
```

O `sql_consultar` já troca de client sozinho quando a variável existe
([`src/lib/mcp/sql.ts`](../src/lib/mcp/sql.ts) `client()`).

> Em produção o container do Postgres não se chama `pg-ncm` (esse é o nome local): ache o
> dele com `docker ps | grep -i postgres`, ou use o console do próprio serviço no EasyPanel.
> E confirme usuário e banco na `DATABASE_URL` do serviço — no EasyPanel eles costumam não
> ser `postgres`/`ncm`.

### A revogação é AUTOMÁTICA — não repita à mão

O `ALTER DEFAULT PRIVILEGES` acima faz tabela NOVA nascer legível pelo papel, **inclusive a
próxima tabela sensível que uma migração criar**. Depender de alguém lembrar de revogar
depois de cada deploy é como a fronteira se perde — foi o que aconteceu em 17/11/2026, em
que o `REVOKE` manual (uma instrução só, com oito tabelas) abortou na primeira tabela
inexistente e **não revogou nada**, nem as `OAuth*`.

Agora o app refaz a revogação **a cada boot**, depois do `prisma migrate deploy` que o
`npm start` roda: `agendarRevogacaoRoNoBoot` ([`src/lib/mcp/ro.ts`](../src/lib/mcp/ro.ts)),
chamada em [`src/instrumentation.ts`](../src/instrumentation.ts), varre o `pg_tables` pelos
MESMOS `PREFIXOS_BLOQUEADOS` do `sql-core.ts` e emite um `REVOKE ALL` por tabela. É
idempotente, roda em segundo plano, nunca derruba o boot, e não faz nada quando o papel não
existe (o caso de dev). Não espera pela `DATABASE_URL_RO`: o papel pode existir antes dela,
que é justamente o estado em que a revogação mais importa.

Ela **se recusa a agir** quando o papel é superusuário ou é o próprio usuário do app —
apontar a variável para o usuário de escrita por engano desarmaria o acesso do app. Nesse
caso loga `warn` e o `sql_consultar` segue lendo tudo.

Sobra um único trabalho manual: **tabela sensível com prefixo NOVO**. Acrescente o prefixo
em `PREFIXOS_BLOQUEADOS` (`sql-core.ts`) e o boot seguinte já a cobre.

### Revogar agora, sem esperar um deploy

O mesmo que o boot faz. Ignora o que ainda não existe, então serve para rodar de novo
quantas vezes precisar:

```sql
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
              AND (tablename ILIKE 'whatsapp%' OR tablename ILIKE 'oauth%')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM lexia_ro', t);
  END LOOP;
END $$;
```

Conferir — tudo tem de vir `f`, e a recusa de `SELECT * FROM "WhatsappMensagem"` tem de vir
**do banco** (`permission denied`), não só do filtro de nome:

```sql
SELECT tablename, has_table_privilege('lexia_ro', format('public.%I', tablename), 'SELECT') AS pode_ler
FROM pg_tables
WHERE schemaname = 'public' AND (tablename ILIKE 'whatsapp%' OR tablename ILIKE 'oauth%')
ORDER BY 1;
```

> Se a consulta acima não devolver NENHUMA linha `Whatsapp*`, as migrações do WhatsApp ainda
> não foram aplicadas nesse ambiente — confira com
> `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5`.

## 7. Ferramentas MCP (fase 4)

As 7 ferramentas vivem em [`src/lib/mcp/whatsapp.ts`](../src/lib/mcp/whatsapp.ts) e o núcleo
puro delas (filtros, cursor, datas, decisão de anexo) em
[`src/lib/whatsapp/mcp-core.ts`](../src/lib/whatsapp/mcp-core.ts).

| Ferramenta | Para que serve |
| --- | --- |
| `whatsapp_status` | Conexão deste usuário; desconectada, devolve o link de `/whatsapp/conectar` |
| `whatsapp_conversas` | As conversas MONITORADAS: nome, contato, última mensagem, não tratadas |
| `whatsapp_ler_conversa` | Mensagens de uma conversa, cronológicas, paginadas por cursor |
| `whatsapp_pendencias` | Conversas esperando resposta há ≥ N horas (padrão 24) + o que não foi organizado |
| `whatsapp_anexo` | O arquivo: imagem/PDF até 5 MB como conteúdo, o resto como link assinado |
| `whatsapp_marcar_tratadas` | Marca `tratadaEm` depois de virar tarefa/prazo/evento/anotação |
| `whatsapp_vincular_cliente` | Liga (ou desliga) a conversa a um contato do Lexia |

**Só aparecem no caminho OAuth.** O registro depende de um `User.id`, que só o bearer OAuth
resolve (`expoeWhatsapp` em [`src/lib/mcp/tools.ts`](../src/lib/mcp/tools.ts)). Pelo token
estático antigo a chamada roda como o usuário de serviço admin — e ali o módulo
simplesmente não existe, como o brief exige. Sem `WHATSAPP_AUTH_KEY` também não aparecem.

**Nenhuma envia mensagem** e nenhuma aceita `userId`: o id vem da sessão OAuth e TODO filtro
de consulta é montado em `mcp-core.ts`, que o exige na assinatura. Um `chatId`/`mensagemId`
de outra pessoa responde **"não encontrada"**, nunca "sem permissão".

**Texto de terceiros.** O texto das mensagens sai sempre no campo `conteudoExterno`, e as
descrições + um `avisoConteudo` na resposta dizem que é dado para interpretar, nunca
instrução para seguir.

**"Não tratada" vale para os dois lados** da conversa, inclusive o que o próprio usuário
escreveu: esconder a resposta dele faria o Claude abrir tarefa para algo já respondido.

**Auditoria** em `AuditLog` a cada chamada (`mcp.whatsapp_*`), com ids, filtros e contagens —
**nunca** com o conteúdo. As leituras se auditam dentro da própria ferramenta, porque o
`exec.ts` só audita mutação.

**Anexo como conteúdo.** `exec.ts` ganhou uma escotilha (`conteudoMcp`) para a ferramenta
devolver blocos de conteúdo do MCP em vez de JSON — é o que entrega a imagem sem passar pelo
`JSON.stringify` nem pelo corte de `MAX_RESULT_CHARS`, que picaria o base64. PDF vai como
recurso embutido **e** com o link no bloco de texto: se o cliente MCP ignorar o recurso,
ainda sobra um caminho para o arquivo. O link é absoluto, assinado e vale 15 min — ele
depende da origem da requisição (ou de `APP_BASE_URL`); sem isso a resposta diz que não deu
para montar o link.

### Aceite da fase (o que falta é no claude.ai)

Numa **conversa nova** (a lista de ferramentas é buscada na conexão), pelo conector com
OAuth: "o que está pendente no meu WhatsApp?" → `whatsapp_pendencias`; depois "cria uma
tarefa para isso" (`criar_tarefa`) e "marca como tratada". Conferir com um SEGUNDO usuário
que cada um só vê o próprio, e que no conector ANTIGO (token no caminho) as ferramentas
`whatsapp_*` **não aparecem**.

## 8. Pendência conhecida

- `WhatsappMensagem.midiaPath` existe e **não é usado**: é o ponteiro para um storage
  externo (OneDrive/S3), se os bytes um dia saírem do banco.
