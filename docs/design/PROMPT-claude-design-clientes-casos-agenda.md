# LexIA — Especificação funcional para o design (Clientes, Casos, Contratos, Agenda, LexIA popup, Buscar, Configurações)

Você é responsável pelo design; esta especificação é responsável pela **funcionalidade**. Tudo aqui descreve dados e comportamentos reais do app (ou planejados) — use os campos e vocabulários exatamente como descritos, mas a forma visual é sua. O app é um sistema de gestão de escritório de advocacia (2 sócios + equipe), PT-BR, com tema claro/escuro já existente. Dinheiro sempre em R$ (pt-BR), datas em pt-BR. Volume real de dados: ~253 clientes, ~129 casos, ~298 contratos de honorários, ~427 lançamentos — listas precisam de busca, filtro e paginação/scroll confortáveis.

## 1. Papéis de usuário (UAC) — vale para TODAS as telas

Três papéis: **admin** (gestor do escritório), **sócio** e **staff**.
- **admin**: acesso total, incluindo todas as Configurações, gestão de usuários, auditoria e LGPD.
- **sócio**: tudo do dia a dia + financeiro completo (incl. acerto entre sócios e rateio); nas Configurações vê Financeiro/Escritório/Importação, mas NÃO Usuários & permissões, Auditoria e LGPD.
- **staff**: opera clientes, casos, tarefas, agenda e documentos; NÃO vê valores agregados sensíveis (acerto entre sócios, DRE, rateio entre sócios); nas Configurações vê apenas Perfil e Aparência.

O design deve prever o tratamento de "sem permissão": itens simplesmente ocultos para staff (não cadeados espalhados), e na tela de Configurações as seções visíveis variam por papel.

## 2. Página de Clientes (lista)

Campos por linha: nome, apelido (opcional), tipo **PF | PJ**, classificação **cliente | lead**, CPF/CNPJ, cidade/UF, nº de casos. Funcional:
- Busca por nome/CPF-CNPJ; filtros por segmento (Todos / PF / PJ / Leads); contadores no topo (total, PF, PJ, leads).
- Ação primária "Novo cliente" (modal ou rota — sua escolha) com os campos cadastrais da seção 3.
- Clicar numa linha abre a **página individual do cliente**.

## 3. Página individual do Cliente (página inteira, header + tabs)

**Header do cliente**: nome + apelido, badges PF/PJ e cliente/lead, CPF/CNPJ, contatos (múltiplos e-mails e telefones), endereço (logradouro, número, complemento, bairro, cidade/UF, CEP), e um resumo numérico: casos ativos, total recebido, a receber, vencido. Todos os dados cadastrais são **editáveis** (modo de edição ou edição por campo — sua escolha). Ações do header: **Nova tarefa**, **Novo evento**, **Gerar documento**, e (apenas admin) **Anonimizar (LGPD)** — ação destrutiva que apaga dados pessoais mantendo o histórico financeiro; precisa de confirmação forte (digitar o nome, por ex.).

**Tabs** (identidade visual de tabs igual ao resto do app):
1. **Financeiro** — lançamentos e honorários vinculados ao cliente. KPIs do cliente (recebido total, a receber, vencido). Lista de lançamentos: direção entrada/saída, descrição, caso, categoria, vencimento, valor, status pago/aberto; ações: marcar pago / reabrir, "Novo lançamento" já vinculado ao cliente.
2. **Tarefas** — tarefas com vínculo a este cliente: título, status (a fazer / fazendo / revisão / concluída), prioridade P1–P4, prazo (cor de urgência), responsável (sócio). Criar tarefa pré-vinculada; clicar abre a edição da tarefa.
3. **Casos** — casos do cliente: título, tipo **consultivo | litígio**, status, responsável, soma de honorários. Clicar abre o **modal de Caso** (seção 5).
4. **Contratos** — honorários do cliente: descrição, vencimento, valor, status **lançado | recebido**, tipo **recorrente | parcelado | êxito | à vista**. Clicar abre o **modal de Contrato** (seção 7).
5. **Eventos** — eventos da agenda vinculados ao cliente (próximos e passados): título, tipo, data/hora, caso vinculado, responsável. Criar evento pré-vinculado.
6. **Documentos** — documentos gerados para o cliente: nome, modelo (ex.: Contrato de Honorários), formato (PDF/DOCX), data, status **rascunho | finalizado**; ações: baixar, abrir no editor, gerar novo (leva ao fluxo de geração existente).

## 4. Página de Casos (lista)

Campos: título, cliente, tipo **consultivo | litígio**, status, responsável, total de honorários (R$), nº de honorários, e o **rateio entre sócios** atual (ex.: "50/50", "70/30"). Funcional: busca; filtros (Todos / Com honorário / Sem rateio definido); paginação (~50/página). Clicar abre o modal.

## 5. Modal individual do Caso

Seções funcionais:
- **Dados do processo**: nº do processo, tribunal, vara, instância, tipo de ação, valor da causa, data de distribuição, última movimentação, status. Editáveis.
- **Financeiro do caso**: honorários vinculados (com status) + lançamentos do caso; totais recebido vs. em aberto.
- **Rateio entre sócios** (oculto para staff): exatamente 2 sócios (Leandro e Leonardo); percentuais que somam 100. Interação: **slider que balanceia os dois lados com pontos de atração ("snap") em 0, 50 e 100**, mostrando os dois percentuais e o reflexo em R$ sobre os honorários do caso; presets rápidos (100/0, 50/50, 0/100); salvar explícito.
- **Tarefas e eventos do caso** (listas compactas, criar pré-vinculado).

## 6. Página de Contratos (lista)

Cada "contrato" é um honorário. Campos: descrição, cliente, caso, vencimento, valor, status **lançado | recebido**, tipo **recorrente | parcelado | êxito | à vista**, conta de recebimento, data de pagamento. KPIs no topo: total contratado, recebido, em aberto (lançado), ticket médio. Busca + filtros (Todos / Recebidos / Lançados). Clicar abre o modal.

## 7. Modal individual do Contrato

- Detalhe completo: descrição, cliente (link p/ página do cliente), caso (link p/ modal do caso), valor bruto e líquido, tipo, vencimento, conta, responsável.
- Ações: **Marcar como recebido** (escolhendo conta e data de pagamento) e **Desfazer recebimento** — já existem no backend; editar campos; link para o lançamento financeiro gerado.
- Se parcelado/recorrente: mostrar a série de parcelas vinculadas com o status de cada uma.

## 8. Página de Agenda (nova)

Calendário do escritório. Itens de dois tipos, visualmente distintos:
- **Eventos** (novo): título, tipo **audiência | prazo | reunião | outro**, data/hora início–fim ou dia inteiro, local ou link de vídeo, descrição, vínculo opcional a cliente e/ou caso, responsável (sócio), status (confirmado/cancelado).
- **Tarefas com data/hora** (do módulo de tarefas existente): aparecem no calendário como itens secundários; clicar abre a tarefa.

Visualizações em **tabs: Mês / Semana / Dia / Lista** (lista = próximos compromissos agrupados por dia). Funcional: criar evento por clique em slot vazio e por botão "Novo evento"; editar via modal; arrastar para remarcar nas visões semana/dia; filtro por responsável e por tipo; indicador de "hoje". Tipos com cor semântica consistente (audiência e prazo são os críticos do dia a dia jurídico).

## 9. App shell — popup da LexIA (AI-first)

Botão flutuante **dourado** no canto inferior direito, sempre visível em todas as páginas, com animação de presença (idle sutil, micro-interação ao abrir). Abre um **popup de chat moderno** (não página):
- Thread de conversa com a LexIA (avatar/identidade dourada já usada no app), composer com textarea, estado "pensando"/streaming animado.
- **Chips de sugestão contextuais à página atual** (ex.: em /financeiro: "Quem está devendo há mais de 60 dias?"; na página de um cliente: "Resuma a situação deste cliente").
- Respostas podem conter **cards de ação** (ex.: link para um lançamento, botão "Criar tarefa"), não só texto.
- Histórico de conversas (lista de conversas anteriores, nova conversa).
- O backend será ligado depois — desenhe os estados completos (vazio/boas-vindas, digitando, resposta com ações, erro).

## 10. App shell — Buscar (estilo Spotlight)

O campo "Buscar… ⌘K" da sidebar e o atalho **⌘K / Ctrl+K** abrem um **modal central estilo Spotlight da Apple**: um campo único grande, resultados ao vivo abaixo, agrupados por tipo — **Clientes, Casos, Contratos, Tarefas, Lançamentos, Páginas/Ações** (navegação: "Ir para Financeiro", ações rápidas: "Nova tarefa", "Novo lançamento", "Novo evento"). Navegação 100% por teclado (↑↓ percorre, Enter abre, Esc fecha, Tab alterna grupos). Estados: vazio (sugestões recentes + ações rápidas), digitando, sem resultados. Cada resultado mostra metadados úteis (ex.: cliente → cidade e nº de casos; contrato → valor e status).

## 11. Modal de Configurações (novo) — com UAC

Abre pelo botão "Configurações" da sidebar. Layout com navegação interna por seções; **as seções visíveis dependem do papel** (admin vê todas):

| Seção | Quem vê | Conteúdo funcional |
|---|---|---|
| **Perfil** | todos | nome, e-mail, alterar senha |
| **Aparência** | todos | tema claro / escuro / sistema |
| **Usuários & permissões** | admin | lista de usuários (nome, e-mail, papel admin/sócio/staff, ativo); criar usuário, editar papel, ativar/desativar, redefinir senha |
| **Financeiro** | admin + sócio | **Custos fixos & pró-labore**: CRUD (nome, valor, categoria pró-labore/operacional, dia de vencimento, conta, ativo) — alimenta DRE e ponto de equilíbrio; gestão de contas (renomear, ativar/desativar) |
| **Escritório & documentos** | admin | dados do escritório usados nos documentos gerados (razão social, endereço, dados bancários, timbrado/logotipo) |
| **Importação & integrações** | admin | reimportação do backup Astrea e importação de leads (CSV Genions), com status/data da última importação |
| **LGPD & Auditoria** | admin | atalho para anonimização de cliente; trilha de auditoria (quem, quando, ação, entidade — lista somente leitura, filtrável) |

## 12. Observações transversais

- Status sempre com os vocabulários exatos citados (ex.: honorário é **lançado | recebido**, nunca "pendente/pago").
- Toda lista grande precisa de estado vazio desenhado (com CTA) e estado de busca sem resultados.
- Vínculos são navegáveis em ambas as direções (do caso para o cliente, do contrato para o caso, da tarefa para o cliente…).
- Mutações dão feedback via toast (sistema de toast já existe no app).
- Tema claro/escuro: ambos os modos para todas as telas novas.
