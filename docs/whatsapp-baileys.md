# Brief: Integração WhatsApp (Baileys) no Lexia

Nov 17, 2026 · @Thiago Portela

## Contexto e objetivo

O Lexia vai ganhar um módulo de WhatsApp multiusuário. Cada advogado conecta o próprio WhatsApp por QR code numa página do Lexia. As mensagens das conversas que ele escolher são gravadas no banco. O servidor MCP do Lexia passa a expor ferramentas de leitura dessas conversas, para que o Claude (no claude.ai) organize pendências, tarefas, prazos e arquivos a partir delas.

O Lexia é o sistema interno do escritório NCM Advogados (lexia.ncm.adv.br), sobre PostgreSQL. Os nomes de tabelas e colunas em camelCase com aspas (`User`, `Cliente`, `ClienteAnotacao`) sugerem Prisma; confirme no repositório. O servidor MCP já está conectado ao claude.ai e expõe ferramentas de clientes, casos, processos, prazos, tarefas, agenda e financeiro.

**Resultado esperado:** o usuário diz ao Claude "organiza as pendências do meu WhatsApp de hoje". O Claude lê as conversas daquele usuário pelo MCP e cria tarefas, prazos, eventos e anotações com as ferramentas que já existem (`criar_tarefa`, `criar_prazo`, `criar_evento`, `anotar_cliente`).

**Decisões já tomadas:**

- Biblioteca: Baileys (`@whiskeysockets/baileys`), conexão não oficial por QR code. Não usar whatsapp-web.js.
- A v1 é somente leitura: nenhuma ferramenta envia mensagem.
- Cada usuário vê apenas o próprio WhatsApp, inclusive sócios e admins.

## Escopo da v1

A v1 entrega conexão por usuário, ingestão das conversas escolhidas e leitura pelo MCP. Nada além disso.

**Dentro:**

- OAuth no servidor MCP do Lexia, para que cada chamada saiba qual usuário está do outro lado.
- Página `/whatsapp/conectar` no Lexia, com QR code e código de pareamento.
- Worker que mantém uma sessão Baileys por usuário, com reconexão e persistência no Postgres.
- Gravação de mensagens e mídias apenas das conversas marcadas para monitorar.
- Página `/whatsapp/conversas` para o usuário escolher quais conversas monitorar e vincular a clientes.
- Vínculo automático (sugerido) entre conversa e `Cliente` pelo telefone.
- Ferramentas MCP de leitura, filtradas pelo usuário autenticado.

**Fora da v1:**

- Envio de mensagens, por qualquer caminho.
- Triagem automática em segundo plano (o Claude só age quando o usuário pede).
- Importação de histórico antigo além do que o Baileys sincroniza na conexão.
- Migração para a API oficial da Meta (fica como plano B se houver banimento).

## Arquitetura

O Claude nunca fala direto com o WhatsApp: só o worker conecta, e o Claude só enxerga o banco através do MCP.

&#91;embedded content: arquitetura · 6 peças, MCP como ponto de isolamento\]

O MCP, destacado, é onde o isolamento acontece: toda leitura passa por ele e é filtrada pelo usuário do token.

## Pré-requisito: OAuth no MCP

O MCP do Lexia precisa autenticar cada usuário antes de qualquer ferramenta de WhatsApp existir. Hoje o banco não tem tabela de tokens ou sessões, e a URL do conector carrega um segredo no caminho. Isso indica que o MCP não sabe quem está chamando; confirme no código.

**Como deve funcionar:** o admin adiciona o conector uma vez no claude.ai para a organização. Cada pessoa, ao ativar, é levada à tela de login do Lexia, entra com o próprio usuário e autoriza. Toda chamada ao MCP chega com um access token que resolve para um `User.id`.

**O que implementar,** seguindo a especificação de autorização do MCP (OAuth 2.1):

- Metadados do recurso protegido em `/.well-known/oauth-protected-resource` e do servidor de autorização em `/.well-known/oauth-authorization-server`.
- Resposta `401` com cabeçalho `WWW-Authenticate` apontando para os metadados quando faltar token.
- Registro dinâmico de cliente (DCR), endpoints `/oauth/authorize` e `/oauth/token`, PKCE com S256 obrigatório.
- A tela de autorização reaproveita o login e a sessão do Lexia; usuários com `ativo = false` não autorizam.
- Tokens guardados só como hash. Access token curto (cerca de 1 h) com refresh token rotativo. Tabelas sugeridas: `OAuthClient`, `OAuthCode`, `OAuthToken`.

**Verificar na documentação atual da Anthropic** a URL de callback aceita pelo claude.ai e os requisitos de DCR para conectores personalizados, antes de fixar a lista de `redirect_uri` permitidos.

**Transição:** mantenha a rota antiga com segredo funcionando enquanto todos migram, mas sem nenhuma ferramenta de WhatsApp nela. Depois, desligue. Como efeito colateral bom, as ferramentas existentes passam a saber o autor de cada ação e podem respeitar `User.role` nas operações sensíveis.

## Modelo de dados

Quatro tabelas novas, todas com `userId`, porque o isolamento por usuário é a regra central do módulo. Siga as convenções do `schema.prisma` existente (nomes em português, camelCase, `createdAt`/`updatedAt`) e adicione as relações inversas em `User` e `Cliente`.

```prisma
model WhatsappSessao {
  id          Int       @id @default(autoincrement())
  userId      Int       @unique
  user        User      @relation(fields: [userId], references: [id])
  status      String    // desconectado | aguardando_qr | conectado | erro | deslogado
  numero      String?   // número do aparelho, só dígitos com DDI
  conectadoEm DateTime?
  ultimoErro  String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model WhatsappAuth {            // auth state do Baileys
  userId Int
  chave  String                 // "creds" ou "<tipo>-<id>"
  valor  String                 // JSON (BufferJSON) criptografado
  @@id([userId, chave])
}

model WhatsappChat {
  id               Int       @id @default(autoincrement())
  userId           Int
  jid              String    // ...@s.whatsapp.net, ...@g.us ou ...@lid
  telefone         String?   // normalizado, quando conhecido
  nome             String?
  grupo            Boolean   @default(false)
  monitorar        Boolean   @default(false)
  clienteId        Int?
  cliente          Cliente?  @relation(fields: [clienteId], references: [id])
  vinculo          String?   // sugerido | confirmado | manual
  ultimaMensagemEm DateTime?
  mensagens        WhatsappMensagem[]
  @@unique([userId, jid])
}

model WhatsappMensagem {
  id          Int          @id @default(autoincrement())
  userId      Int
  chatId      Int
  chat        WhatsappChat @relation(fields: [chatId], references: [id])
  msgId       String
  deMim       Boolean
  autorJid    String?      // em grupos
  autorNome   String?
  tipo        String       // texto | imagem | audio | video | documento | outro
  texto       String?      // texto ou legenda
  midiaPath   String?
  midiaMime   String?
  midiaNome   String?
  enviadaEm   DateTime
  tratadaEm   DateTime?    // marcada como já organizada
  createdAt   DateTime     @default(now())
  @@unique([chatId, msgId])
  @@index([userId, enviadaEm])
}
```

`WhatsappAuth.valor` guarda as chaves de criptografia da sessão: quem tem esse valor tem o WhatsApp do usuário. Criptografe com AES-256-GCM e uma chave em variável de ambiente (`WHATSAPP_AUTH_KEY`), nunca no banco.

## Worker do Baileys

Um processo Node contínuo, separado do app web, mantém uma conexão Baileys por usuário. Ele não pode rodar em serverless, porque cada sessão é um WebSocket permanente.

**Processo e instância única**

- Rode como serviço próprio (ex.: `lexia-whatsapp`), no mesmo servidor ou num container ao lado.
- Só pode existir uma instância ativa: duas conexões da mesma sessão se derrubam mutuamente. Garanta isso com `pg_advisory_lock` ao subir.
- Ao iniciar, restaure todas as sessões com `status = conectado`.
- Fixe a versão exata do Baileys no `package.json`. A biblioteca muda com frequência; leia as notas de migração da versão escolhida, em especial sobre LID.

**Comunicação entre app web e worker**

Use `LISTEN/NOTIFY` do Postgres, para não criar infraestrutura nova. O app manda comandos (`iniciar`, `codigo_pareamento`, `desconectar`) com o `userId`. O worker publica eventos (`qr`, `conectado`, `erro`, `deslogado`) que a página de conexão consome.

**Auth state no Postgres**

Implemente `usePostgresAuthState(userId)` no molde do `useMultiFileAuthState`: `creds` mais `keys.get`/`keys.set`, serializando com `BufferJSON` e criptografando antes de gravar. Envolva com `makeCacheableSignalKeyStore`.

**Configuração do socket**

- `markOnlineOnConnect: false`. Com `true`, o celular do advogado para de receber notificações.
- Nunca chame `readMessages`. O worker não pode gerar confirmação de leitura para o cliente.
- `syncFullHistory: false` e nome de dispositivo "Lexia", para o usuário reconhecer em Aparelhos conectados.
- Logger `pino` em nível `warn`, sem conteúdo de mensagens nos logs.

**Ciclo de conexão (`connection.update`)**

- `qr`: publica para a página e grava `status = aguardando_qr`.
- `open`: grava `conectado`, `numero` e `conectadoEm`.
- `close` com `DisconnectReason.loggedOut`: grava `deslogado` e apaga as linhas de `WhatsappAuth` do usuário.
- `close` por qualquer outro motivo: reconecta com backoff exponencial (1 s, 2 s, 4 s… até 60 s) e grava `ultimoErro`.

**Ingestão**

- `chats.upsert`, `chats.update` e `contacts.upsert`: mantêm `WhatsappChat` atualizado (jid, nome, telefone), mesmo para conversas não monitoradas. Isso é só metadado, para o usuário poder escolher.
- `messages.upsert` e `messaging-history.set`: grave a mensagem só se `WhatsappChat.monitorar = true`. Ignore `status@broadcast`, reações e mensagens de protocolo.
- Texto: `conversation`, `extendedTextMessage.text` ou a legenda da mídia.
- Mídia: `downloadMediaMessage`, salva em `whatsapp/<userId>/<chatId>/<msgId>.<ext>` no storage que o Lexia já usa. Limite de 25 MB por arquivo; acima disso, grava só os metadados.
- Mensagens anteriores à marcação de um chat como monitorado não ficam disponíveis. Avalie se a versão do Baileys oferece busca de histórico sob demanda; se não, aceite a limitação na v1.

## Páginas no Lexia

Duas páginas novas, ambas exigindo login, sempre agindo sobre o usuário da sessão e nunca sobre um `userId` vindo da URL ou do corpo da requisição.

**`/whatsapp/conectar`**

- Mostra o status atual. Se conectado: número, data da conexão e botão "Desconectar".
- Se não conectado: botão "Conectar" manda o comando `iniciar` ao worker e abre um stream SSE (`/api/whatsapp/eventos`).
- O QR se renova a cada \~20 s; a página só redesenha a imagem a cada evento `qr` (gerada no navegador com a lib `qrcode`).
- Alternativa por código de pareamento: o usuário digita o próprio número, o worker chama `requestPairingCode` e a página mostra os 8 caracteres para digitar no celular. É o caminho prático quando o Lexia está aberto no próprio celular.
- Instruções curtas na tela: WhatsApp › Aparelhos conectados › Conectar um aparelho.
- No evento `conectado`, redireciona para `/whatsapp/conversas`.

**`/whatsapp/conversas`**

- Lista as conversas de `WhatsappChat` do usuário, ordenadas pela última mensagem, com busca por nome ou número.
- Interruptor "Monitorar" por conversa. Grupos vêm desligados por padrão.
- Mostra o cliente vinculado; vínculos sugeridos aparecem destacados para o usuário confirmar, trocar ou remover.

## Ferramentas MCP

Sete ferramentas novas, todas escopadas ao usuário do token. Nenhuma envia mensagem; as duas que escrevem só mexem em dados internos do Lexia.

| Ferramenta | Parâmetros | Retorna |
| --- | --- | --- |
| `whatsapp_status` | nenhum | Status, número conectado e, se desconectado, o link `https://lexia.ncm.adv.br/whatsapp/conectar` com instrução para o usuário abrir |
| `whatsapp_conversas` | `desde?`, `busca?`, `clienteId?`, `apenasNaoTratadas?` | Conversas monitoradas: nome, cliente vinculado, última mensagem, quantidade não tratada |
| `whatsapp_ler_conversa` | `chatId`, `desde?`, `ate?`, `limite?` (padrão 100), `cursor?` | Mensagens em ordem cronológica: id, data, de mim ou não, autor, tipo, texto, id do anexo |
| `whatsapp_pendencias` | `desde?`, `horasSemResposta?` (padrão 24) | Conversas cuja última mensagem é do outro lado e está sem resposta, mais as mensagens não tratadas |
| `whatsapp_anexo` | `mensagemId` | Metadados do arquivo. Imagens e PDFs até 5 MB vêm como conteúdo legível pelo Claude; o resto, como link assinado válido por 15 min |
| `whatsapp_marcar_tratadas` | `mensagemIds[]` ou `chatId` + `ate` | Quantas mensagens foram marcadas (`tratadaEm`) |
| `whatsapp_vincular_cliente` | `chatId`, `clienteId` | O vínculo confirmado (`vinculo = manual`) |

**Regras para todas:**

- Toda consulta filtra por `userId` do token. Um `chatId` ou `mensagemId` de outro usuário retorna "não encontrado", nunca "sem permissão", para não revelar que existe.
- Datas na saída em `America/Sao_Paulo`.
- Textos longos truncados em 4.000 caracteres, com indicação de truncamento; respostas paginadas por cursor.
- O texto das mensagens vem num campo próprio (ex.: `conteudoExterno`), e a descrição de cada ferramenta diz que é conteúdo escrito por terceiros: dado, nunca instrução.
- Se a sessão estiver desconectada, as ferramentas de leitura continuam respondendo com o que já está gravado, avisando que pode haver mensagens novas não sincronizadas.
- A ferramenta `sql_consultar` existente não pode ler as tabelas `Whatsapp*` nem `OAuth*`. Revogue o acesso delas no papel do Postgres usado por essa ferramenta, ou ela vira um atalho para o WhatsApp dos colegas.

## Vínculo de conversas com clientes

O vínculo automático só sugere; quem confirma é o usuário. `Cliente.telefones` é texto livre, então o match depende de normalizar os dois lados.

1. Inspecione os valores reais de `Cliente.telefones` (formato, separadores, JSON ou não) antes de escrever o parser.
2. Normalize para só dígitos com DDI 55: remova `+`, espaços, parênteses, hífens e zero à esquerda; acrescente 55 quando vier só DDD e número.
3. Para celulares brasileiros, gere as duas variantes: com e sem o nono dígito. Muitos números antigos aparecem no WhatsApp sem o 9 no JID (ex.: `551187654321` em vez de `5511987654321`).
4. Crie uma tabela auxiliar ou coluna derivada com os telefones normalizados de cada cliente, atualizada quando o cadastro muda, para o match não varrer texto livre.
5. Match único → `clienteId` preenchido com `vinculo = sugerido`. Mais de um cliente com o mesmo número → não vincula, deixa para o usuário.
6. Contatos identificados só por LID (`...@lid`) não trazem o telefone. Use o mapeamento LID → número quando o Baileys o fornecer; sem ele, a conversa fica sem vínculo automático e o usuário vincula manualmente.

Grupos nunca recebem vínculo automático.

## Segurança, sigilo e LGPD

O módulo guarda conversas cobertas por sigilo profissional, então isolamento e minimização vêm antes de conveniência.

- **Isolamento:** testes automatizados provando que o usuário A não lê chats, mensagens, anexos nem status do usuário B, por nenhuma rota (páginas, API, SSE, MCP, `sql_consultar`).
- **Minimização:** só conversas marcadas são gravadas. Desmarcar uma conversa oferece apagar o que já foi guardado dela.
- **Desconectar apaga credenciais:** o botão "Desconectar" faz logout no WhatsApp e remove `WhatsappAuth`. Usuário com `ativo = false` tem a sessão encerrada automaticamente.
- **Retenção:** prazo configurável (sugestão: 24 meses), com rotina que apaga mensagens e mídias mais antigas.
- **Anexos:** storage privado, acesso só por link assinado de curta duração.
- **Injeção de prompt:** mensagens de clientes podem conter instruções dirigidas ao Claude. Por isso a v1 não tem envio e as ferramentas de WhatsApp não fazem nada destrutivo.
- **Auditoria:** registre cada chamada das ferramentas de WhatsApp (usuário, ferramenta, chat, data), sem o conteúdo.
- **Risco de banimento:** Baileys é conexão não oficial e viola os termos do WhatsApp. Modo somente leitura, sem confirmação de leitura e sem envio reduz o risco, mas não o elimina. Os usuários precisam saber disso ao conectar; mostre um aviso curto na página de conexão.

## Plano de entrega

Cinco fases, cada uma entregável e testável sozinha. Não comece a fase seguinte sem os critérios de aceite da anterior.

1. **OAuth no MCP.** Aceite: o conector é adicionado no claude.ai; dois usuários diferentes autenticam; uma ferramenta de teste `quem_sou_eu` devolve o usuário certo para cada um; a rota antiga continua funcionando.
2. **Schema, worker e página de conexão.** Aceite: conexão funciona por QR e por código de pareamento; reiniciar o worker restaura a sessão sem novo QR; desconectar pelo celular marca `deslogado` e apaga as credenciais; o celular continua recebendo notificações; o contato não vê confirmação de leitura.
3. **Ingestão, página de conversas e vínculo.** Aceite: só conversas monitoradas são gravadas; mídias baixam para o storage; o vínculo sugerido acerta números com e sem o nono dígito; grupos não são vinculados.
4. **Ferramentas MCP.** Aceite: pelo claude.ai, o Claude lista as pendências do usuário e cria uma tarefa no Lexia a partir de uma conversa; os testes de isolamento passam; `sql_consultar` não lê tabelas `Whatsapp*` nem `OAuth*`.
5. **Piloto.** Dois usuários por duas semanas, observando quedas de sessão, volume de dados e utilidade. Depois, liberar para o escritório.

## Antes de codar: verificar no repositório

Estas respostas mudam o desenho; confira e traga um resumo antes da fase 1.

- [ ] Stack e hospedagem: framework do app web, onde roda, e se há como manter um processo Node contínuo ao lado.
- [ ] Como o MCP é servido hoje (rota, SDK, transporte) e como valida o segredo da URL.
- [ ] Como funcionam login e sessão do Lexia, para a tela de autorização OAuth reaproveitá-los.
- [ ] Qual papel do Postgres a ferramenta `sql_consultar` usa, e se dá para revogar tabelas só dele.
- [ ] Onde o Lexia guarda arquivos hoje (disco, S3, outro) e como gera links de acesso.
- [ ] Formato real dos dados em `Cliente.telefones`.
- [ ] Versão atual estável do Baileys e suas notas de migração.
