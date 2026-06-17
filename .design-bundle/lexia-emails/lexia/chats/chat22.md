# Design padrão de e-mails Lexia

_Started 2026-06-17 17:52 UTC_

---

## User

Baseado nos tokens e design da Lexia, crie um design padrão para ser usado nos e-mails enviados pelo app. Tanto as notificações quanto de esqueci minha senha ou cadastro de usuário novo (quando o usuário recebe e monta o próprio acesso), também cobrança de clientes

## Assistant

Vou explorar o design system da Lexia antes de criar os templates de e-mail.

_[tool: read_file]_

_[tool: list_files]_

Vou ler os tokens para usar valores exatos nos e-mails.

_[tool: read_file]_

O design system está claro: navy + dourado, Inter, tema escuro como casa. Antes de montar, três decisões que evitam retrabalho:

_[tool: questions_v2]_

## User

Questions answered:
- theme: Híbrido: cabeçalho navy com o L dourado + corpo claro (recomendado)
- tipos: Notificação genérica (prazo, atualização de caso), Esqueci minha senha / redefinição, Convite / cadastro de novo usuário (monta o próprio acesso), Cobrança de cliente (honorário/parcela), Recibo / confirmação de pagamento
- logo: Só o texto 'LexIA'
- remetente: NCM Advogados
Av. Marquês de São Vicente, 1619, Sala 505, Barra Funda, São Paulo - SP, CEP 01139-003
contato@ncm.adv.br
- idioma_extra: Só português

## Assistant

Decisões registradas. Vou montar um sistema de e-mail email-safe (tabelas + estilos inline, 600px, cabeçalho navy + corpo claro, CTA dourado) com 5 templates de exemplo, tudo numa página-vitrine.

_[tool: update_todos]_

_[tool: write_file]_

## Assistant

_[tool: write_file]_

## Assistant

_[tool: write_file]_

_[tool: update_todos]_

_[tool: ready_for_verification]_

Pronto. Criei **`LexIA - E-mails.html`** — um sistema de e-mail email-safe (tabelas + estilos inline, 600px) sobre os tokens da LexIA, com 5 templates:

1. **Notificação** (prazo/caso) — card de detalhe + badge de status
2. **Redefinição de senha** — CTA único, link de fallback, validade, nota de segurança
3. **Convite / novo usuário** — quem convidou, perfil, "Criar meu acesso"
4. **Cobrança de cliente** — fatura com valor em destaque, vencimento, PIX/boleto
5. **Recibo** — confirmação verde, comprovante, "Baixar PDF"

Todos com cabeçalho navy + wordmark "Lex**IA**" (IA dourado), corpo claro, CTA dourado e rodapé da NCM Advogados.

Notas:
- Cada e-mail está delimitado por comentários `EMAIL NN :: início/fim` — é só copiar o bloco `<table>` para sua ferramenta de envio.
- A Inter carrega via Google Fonts no preview; em clientes de e-mail há fallback automático para Arial/Helvetica (esperado e correto).
- Se quiser, posso adicionar versão dark, trocar o wordmark por um logo seu, ou gerar variações de cada um (ex.: prazo vencido em vermelho).

