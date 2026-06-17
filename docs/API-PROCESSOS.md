# API — Módulo de Processos & Casos

Referência para a implementação do **frontend** (que virá depois). O backend segue
as convenções do Lexia: rotas finas sobre `runMutation` (auth + zod + rate-limit +
auditoria), envelope `{ ok, result }` em writes e JSON puro em GETs. Sem OpenAPI
(decisão do repo: o app é o único consumidor) — esta é a referência canônica,
complementada pelos JSDoc no topo de cada `route.ts`.

## Convenções gerais
- **Auth**: toda rota exige sessão (gate em `src/proxy.ts` + defesa em profundidade).
- **Envelope**: write → `{ ok: true, result }`; erro → `{ error: string }` (PT-BR) com
  status `400` (validação/UserError), `401`, `403`, `429` (rate limit), `500` (genérico).
  GET de detalhe → JSON puro; GET de lista → `{ items, total, page, pageSize }`.
- **Paginação/ordenação** (listas): query `?page=1&pageSize=20&sort=<campo>&order=asc|desc`
  (clamp: pageSize ≤ 100; `sort` restrito a um whitelist por recurso).
- **Datas**: entrada `"YYYY-MM-DD"`; saída ISO. Dinheiro em **centavos** (inteiro).
- **Idempotência de ingestão**: por `externalId` (protocolo da fonte).

## RBAC (papéis)
`admin` (superusuário) · `socio` + `financeiro` (veem tudo) · `advogado`
(vê só o que é seu/atribuído — escopo por `responsavelUserId` no processo/caso e por
prazos/tarefas/eventos atribuídos) · `estagiario` (restrito, **sem financeiro** — o
bloco `financeiro` é omitido do detalhe). Escrita de processo/parte/andamento/prazo
exige `socio`/`advogado`; configuração de feriados/suspensões exige `socio`.
> Observação: o bloqueio de finanças para `estagiario` é aplicado no **novo módulo**
> (detalhe de processo/caso). Retrofitar as rotas `/api/financeiro/*` GET existentes
> para excluir `estagiario` é follow-up de baixo risco (nenhum usuário estagiário existe hoje).

## Modelo de dados (novo)
| Modelo | Resumo |
|---|---|
| **Processo** | processo judicial de um Caso (1 Caso → N). CNJ validado, classe, assunto, fase, instância, vara/comarca/tribunal/UF, sistema (pje/esaj/projudi/eproc), `responsavelUserId`, `status`. Soft-delete `excluidoEm`. |
| **Parte** + **ParteProcesso** | parte (PF/PJ, documento validado) e seu vínculo a um processo (papel autor/réu/…; polo ativo/passivo; flag "é o cliente"). |
| **Andamento** | movimentação do processo (data, tipo, descrição, fonte, `relevante`, `externalId`, `prazoId` gerado). |
| **Publicacao** | publicação/intimação (DJe) para triagem (`statusTriagem` pendente/triada/descartada; pode chegar sem processo). |
| **Prazo** | o prazo **calculado** (dataFatal/dataInterna gravadas; urgência derivada na leitura). |
| **Feriado** / **SuspensaoPrazo** | calendário configurável (feriados estaduais/forenses/municipais + períodos de suspensão; nacionais são calculados em código). |
| **Notificacao** | notificação por usuário (upsert idempotente do job). |
| **DocumentoVersao** | histórico de versões de um Documento (bytes via `AnexoStore`). |
| **Anotacao** | nota livre de um caso/processo (autor, conteúdo, interno). |
| **Caso** (estendido) | + `area`, `responsavelUserId`, `excluidoEm`, relações `processos`/`anotacoes`. |
| Evento/Tarefa/Lancamento/Documento (estendidos) | + `processoId`; Lancamento + `naturezaLegal`; Documento + `tipo`. |

## Cálculo de prazos (a regra mais crítica)
Serviço puro e testado: `src/lib/processos/{prazo,feriados,urgencia,datas}.ts` (sem
Prisma; datas como `"YYYY-MM-DD"`, math em UTC, TZ `America/Sao_Paulo`).
- **Dias úteis** (CPC art. 219): só dias úteis contam. Dia útil = não é sábado/domingo,
  não é feriado (nacional/forense/estadual/municipal) e não está em período de suspensão.
- **Intimação DJe** (Lei 11.419): disponibilização → publicação no 1º dia útil seguinte →
  **contagem inicia no 1º dia útil seguinte ao da publicação** (`inicioPorDisponibilizacao`).
- **Protração** (art. 224 §1): início e vencimento são adiados ao 1º dia útil seguinte.
- **Suspensões** (art. 220: 20/12–20/1 + recesso): **configuráveis** (tabela
  `SuspensaoPrazo`), nunca fixas no código. Em "dias corridos" a suspensão pausa a contagem.
- **Data interna**: `diasMargem` dias úteis antes da data fatal (default `PRAZO_MARGEM_DIAS`).
- **Urgência (semáforo)**: derivada na resposta (vencido/hoje/futuro → vermelho/âmbar/verde),
  **nunca armazenada**.
- **Jurisdição**: o conjunto de feriados/suspensões é filtrável por tribunal/UF; ao criar um
  prazo sem `jurisdicao`, ela é herdada do tribunal/UF do processo.
- **Preview** (`POST …/prazos/preview`): calcula data fatal/interna sem salvar.

## Endpoints

### Processos
| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET | `/api/processos` | logado | lista paginada (filtros: `casoId,status,responsavelUserId,tribunal,uf,q`). sort: `createdAt,dataDistribuicao,status,numeroCnj` |
| POST | `/api/processos` | socio/advogado | cria processo (`casoId` obrigatório; CNJ validado/único) |
| GET | `/api/processos/[id]` | logado (escopo) | detalhe (partes, andamentos, prazos[urgência], publicações, anotações, documentos, financeiro*) |
| PATCH | `/api/processos/[id]` | socio/advogado | edita campos do processo |
| DELETE | `/api/processos/[id]` | socio/advogado | soft-delete (`excluidoEm`) |
| GET | `/api/processos/dashboard` | logado (escopo) | agregação da tela inicial (indicadores + prazos + audiências do dia + tarefas + publicações pendentes) |

\* `financeiro` é omitido para `estagiario`.

### Partes, andamentos, prazos, publicações, anotações (sub-recursos)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/processos/[id]/partes` | adiciona/vincula uma parte |
| PATCH/DELETE | `/api/partes/[id]` | edita / desvincula a parte (Parte é mantida) |
| POST | `/api/processos/[id]/andamentos` | adiciona andamento |
| PATCH/DELETE | `/api/andamentos/[id]` | edita / soft-delete |
| POST | `/api/andamentos/[id]/gerar-prazo` | cria um prazo a partir do andamento (marca relevante + vincula) |
| POST | `/api/processos/[id]/prazos` | cria prazo (corpo: `descricao,quantidadeDias,tipoContagem?,dataInicio|dataPublicacao,diasMargem?,jurisdicao?,responsavelUserId?,criarEvento?`) |
| POST | `/api/processos/[id]/prazos/preview` | calcula sem salvar |
| GET | `/api/prazos` | lista paginada (filtros: `processoId,status,responsavelUserId,vencidos=1,ate=YYYY-MM-DD`). sort: `dataFatal,createdAt,dataInicio` |
| PATCH/DELETE | `/api/prazos/[id]` | edita (recalcula se mudar a contagem) / soft-delete |
| POST | `/api/prazos/[id]/cumprir` | marca cumprido (`data?`) |
| POST | `/api/prazos/[id]/reabrir` | reabre |
| POST | `/api/processos/[id]/publicacoes` | registra publicação no processo |
| GET | `/api/publicacoes` | fila de triagem (filtros: `status,processoId`) |
| POST | `/api/publicacoes` | registra publicação (pode chegar sem processo) |
| POST | `/api/publicacoes/[id]/triagem` | `{ acao: 'relevante'|'descartar', prazo?, criarEvento? }` |
| POST | `/api/processos/[id]/anotacoes` · `/api/anotacoes` | adiciona anotação (autor = sessão) |
| DELETE | `/api/anotacoes/[id]` | soft-delete |

### Ingestão (porta de integração)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/processos/ingestao` | **adaptador manual**: `{ andamentos?: [], publicacoes?: [] }` (DTOs externos). Casa por CNJ, cria idempotentemente por `externalId`. Scrapers (PJe/e-SAJ/Projudi/DJe) implementam `IngestaoAdapter` e chamam `ingerir` — **fora do escopo**. |

### Casos
| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET | `/api/casos` | logado (escopo) | lista paginada (filtros: `tipo,status,area,clienteId,responsavelUserId,q`). sort: `titulo,dataCriacao,status` |
| POST | `/api/casos` | socio/advogado | cria caso |
| GET | `/api/casos/[id]` | logado (escopo) | detalhe (+ processos, documentos, rateio, financeiro, tarefas, eventos) |
| PATCH | `/api/casos/[id]` | logado | edita |
| DELETE | `/api/casos/[id]` | socio/advogado | soft-delete |

### Documentos (versões)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/documentos/[id]/versoes` | histórico de versões |
| POST | `/api/documentos/[id]/versoes` | snapshot de nova versão (bytes via `AnexoStore`; `dataBase64?`) |

### Notificações + job
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/notificacoes` | notificações do usuário (`?naoLidas=1`) |
| POST | `/api/notificacoes/[id]/lida` | marca como lida |
| POST | `/api/jobs/notificacoes` | **cron externo** (header `X-Job-Token: $JOBS_TOKEN`). Varre prazos/compromissos/tarefas próximos e faz upsert idempotente de `Notificacao`. 404 se `JOBS_TOKEN` não definido. |

### Busca global
`GET /api/search?q=...` (já existente) agora inclui grupos **processos** (por CNJ/classe/assunto)
e **partes** (por nome/documento), além de clientes/casos/contratos/tarefas/lançamentos.

## Validadores
`src/lib/processos/validacao.ts` (puros, testados em `tests/cnj.test.ts`):
`validarCnj` (mód. 97, Res. CNJ 65/2008) + `parseCnj`/`montarCnj`/`formatarCnj`,
`validarCpf`, `validarCnpj`, `validarCpfCnpj`. Ligados aos schemas via `.refine`.

## Variáveis de ambiente
- `JOBS_TOKEN` — segredo do cron que dispara `/api/jobs/notificacoes` (job desabilitado se ausente).
- `PRAZO_MARGEM_DIAS` (default 2) — margem padrão (dias úteis) da data interna.
- `NOTIF_ANTECEDENCIA_DIAS` (default 7) — janela de antecedência do job de notificações.

## Seeds
- `npm run db:seed:feriados` — recesso CPC 220 (20/12–20/1) + feriados estaduais/municipais exemplo.
- `npm run db:seed:processos:demo` — "Costa & Andrade / Dra. Mariana Costa", ~6 processos
  variados (incl. `1004567-14.2024.8.26.0100` com **contestação vencendo em ~2 dias úteis**,
  MS federal, reclamação trabalhista com audiência, e 1 caso **consultivo sem processo**) +
  partes, prazos, andamentos, tarefas e lançamentos. Idempotente.

## Testes
`tests/{cnj,feriados,prazo,urgencia,list}.test.ts` (vitest, puros). O `prazo` cobre:
início em fim de semana/feriado, travessia da suspensão 20/12–20/1, feriado estadual,
dias corridos com prorrogação, virada de mês/ano, margem interna e o caso 23:00 SP vs UTC.
