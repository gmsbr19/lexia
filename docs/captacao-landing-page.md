# Captação de leads + conversões offline (feed CSV do Google Ads)

Como conectar uma landing page ao endpoint público `POST /api/captacao/lead`
para capturar o `gclid` no momento do formulário, e como o Google Ads passa a
LER (não recebe push) dois feeds CSV para importar as conversões offline —
sem nenhuma credencial do Google no app.

## 1. Cadastrar a landing page

Configurações → **Landing pages** (admin) → **Nova landing page**. Preencha
nome, domínios autorizados (apex + `www`, um por linha), e opcionalmente
campanha/área/responsável padrão. Ao salvar, a **chave de API é mostrada uma
única vez** — copie antes de fechar (não é recuperável; só dá para
rotacionar, gerando outra).

## 2. Colar o snippet

Na lista de landing pages, menu **⋯ → Ver snippet** gera o trecho já
preenchido com o endpoint da instância atual. Cole antes de `</body>`, troque
`SUA_CHAVE_AQUI` pela chave copiada no passo 1, e chame
`NCM_CAPTACAO.enviar(dados)` no submit do formulário existente — **depois**
abra o WhatsApp com o protocolo devolvido.

O snippet captura `gclid`/UTMs na **entrada** da página (não no submit — a
pessoa pode navegar várias páginas antes de preencher o formulário) e guarda
em `sessionStorage`.

## 3. Criar as 4 ações de conversão no Google Ads (nomes EXATOS)

No Google Ads, crie 4 ações de conversão do tipo **"Importada" → "Usar
importação de cliques"**, com estes nomes **exatos, sem acento**:

```
NCM Formulario Enviado
NCM Lead Qualificado
NCM Reuniao Realizada
NCM Contrato Assinado
```

O casamento é **por nome**, não por id — o feed CSV nunca carrega um
identificador do Google. Se um desses nomes for alterado no Google Ads (ou
aqui, em `src/lib/captacao/acoes.ts`), o Google passa a ver uma ação NOVA e o
histórico de otimização daquela ação se perde. **Nunca renomear.**

## 4. Configurar a leitura agendada do feed

Google Ads → Ferramentas e configurações → Conversões → Uploads → novo
upload → **"Feed HTTP"**, uma vez por dia, apontando para:

```
https://<seu-dominio>/feeds/google-ads/conversions.csv
https://<seu-dominio>/feeds/google-ads/adjustments.csv
```

Autenticação: **HTTP Basic Auth**, usuário/senha = `GADS_FEED_USER`/
`GADS_FEED_PASS` do `.env` do app (ver `DEPLOY.md` §6c).

## 5. Como o feed se comporta

- **Regenerado do zero a cada leitura** — nunca guarda "o que já foi
  enviado". Toda linha dentro da janela de 90 dias é incluída sempre, com
  `gclid`, exceto as marcadas como descartadas. O Google deduplica por
  `gclid` + nome da ação + horário, então reenviar o que já foi importado não
  duplica nada — e é o que faz o feed se **auto-corrigir** se uma leitura
  falhar um dia.
- **Exclui**: linhas sem `gclid`, fora da janela de 90 dias, ou marcadas
  "descartado" manualmente (painel de reconciliação).
- **`conversion_date_time` é gravado uma vez e nunca recalculado.** Mudar
  esse horário depois não corrige um envio — cria uma SEGUNDA conversão no
  Google (quebra o dedup).

## 6. Ajustes — RETRACT e RESTATE

- **RETRACT**: quando um lead **volta de estágio** no app (ex.: um lead
  marcado "Qualificado" volta para "Contato", ou um "Ganho" é revertido) — o
  app já permite isso (editor da oportunidade, Kanban, "Reabrir lead" para
  leads ganhos/perdidos). A retratação é automática: comparamos o que a
  etapa anterior implicava (qualificado? ganho?) com o que a etapa nova
  implica, e retratamos só o que deixou de ser verdade.
- **RESTATE**: quando o **valor do contrato** de um lead já marcado
  "Contrato Assinado" muda (edição do lançamento vinculado no Financeiro) —
  automático, lê o novo valor direto do lançamento.
- O ajuste identifica a conversão original pela trinca `gclid` + nome da ação
  + horário original — sempre lida da conversão já registrada, nunca
  recalculada.

## 7. Painel de reconciliação

`/comercial` → aba **Captação** → **Reconciliação** (admin/sócio): leads
gravados, eventos disparados, linhas presentes no feed agora, descartados
(com motivo) e POSTs que falharam — por semana e por estágio.

## 8. O que fica PARADO para a migração futura à API

`ConversaoEvento.conversionActionId` e `ConversaoEvento.orderId` (formato
`{leadId}-{tipo}`) são gravados em toda linha, mas **não são lidos pelo feed
hoje** — o casamento é por nome. Servem só para quando o projeto migrar da
leitura de feed para a API do Google Ads (Data Manager API ou similar), sem
precisar reprocessar o histórico. `Lead.consentimentoEm`/`consentimentoVersao`
também já são capturados hoje (LGPD), mesmo sem uso no feed.

**Fora de escopo, deliberadamente**: chamada à API do Google Ads, hash
SHA-256 de telefone/e-mail, enhanced conversions. Ficam para a migração.
