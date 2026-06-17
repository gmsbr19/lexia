# Formulário Editor Unificado

_Started 2026-05-22 12:44 UTC_

---

## User

Esse formulário no editor unificado fica melhor com cards ou tem algum outro design mais clean e claro que dê uma boa hierarquia de informações mantendo a funcionalidade?

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: update_todos]_

Vou explorar 4 abordagens lado a lado num canvas para você comparar. Antes a recomendação rápida (já que sua dúvida está nisso):

**O card grande funciona, mas atrapalha a hierarquia quando tem subseção.** O problema é que "ENDEREÇO" virou uma sub-eyebrow dentro do mesmo card que tem outra eyebrow ("CLIENTE") fora dele — dois níveis lutando pelo mesmo peso visual. Algumas saídas mais limpas:

1. **Linhas agrupadas estilo iOS Settings** — sem card cheio: cada campo é uma linha numa lista com divisor de 1px, label à esquerda, controle à direita. Endereço vira **outro grupo** (não subseção), o que resolve a hierarquia.
2. **Tipográfico com eyebrow na margem** — sem card nenhum, eyebrow gold na coluna esquerda e campos na direita, inputs com fundo suave (filled).
3. **Acordeão progressivo** — uma seção aberta por vez, foco numa coisa só, ideal pra formulário longo de 8 seções.

Vou montar as 4 variações pra você comparar:

_[tool: write_file]_

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Coloquei 4 variações lado a lado no canvas pra você comparar:

**A · Cards (atual)** — baseline pra referência.

**B · Linhas agrupadas (iOS Settings)** — minha recomendação. Cada campo vira uma linha num container com divisor de 1px, label à esquerda (largura fixa de 140px), controle alinhado à direita. "Endereço" vira **um segundo grupo** (não subseção dentro do mesmo card), o que resolve o conflito de hierarquia. Mais limpo, mais escaneável, e funciona melhor pra forms longos porque o usuário consegue ver muita coisa de uma vez.

**C · Tipográfico (eyebrow lateral)** — mais "editorial". Eyebrow gold na coluna esquerda fica como âncora visual da seção; campos com fundo *filled* (sem borda) na coluna direita. Hierarquia bem clara entre seção e subseção (eyebrow pequeno, mesma coluna). Bom se você quer um tom mais sóbrio/premium e tem espaço horizontal.

**D · Acordeão progressivo** — só uma seção aberta por vez, indicador de progresso por seção (círculo gold quando completa). Recomendado se o form tem mesmo 6-8 seções: foca o usuário, evita scroll infinito.

Trade-offs rápidos:
- **B** mantém tudo visível e é o mais "produto sério" — ideal pro contexto jurídico.
- **C** é o mais belo mas exige largura mínima (~600px). Pode quebrar feio no painel estreito do editor unificado (280px).
- **D** é o mais funcional pra forms longos, mas esconde campos — usuário precisa clicar pra ver o que falta.

Se quiser, posso aplicar a vencedora direto no `03-ai-chat.jsx` (o painel esquerdo do editor unificado), ajustando a largura do painel se necessário.

## User

Eu gostei muito da tipografia das eyebrows dos modelos A e C, mas ao mesmo tempo acho que o fundo diferente, mesmo que agrupando as informações, acaba causando muita poluição visual quando somada ao resto da interface. Gostei muito do aspecto limpo que ficou o modelo C, mas o form terá tamanho máximo de 480px e minimo de 300, é importante lembrar que são 3 seções: formulário, pré-visualização e chat de IA. Não gostei do modelo de linhas agrupadas.

## User

A hierarquia do modelo 4 ficou excelente, acho que ficaria ótimo manter esse acordeão, mas mantendo a tipografia dos modelos A e C os steps (0/8 por ex) dentro de uma pill e ele sendo o indicador se os campos estão 100% preenchidos, o que poderia remover aquela bola ao lado esquerdo do nome da seção. Seria sensacional tirar de dentro dessa estrutura de card para deixar o visual mais limpo como o modelo C, mas ainda deixando muito clara a hierarquia visual do formulário, talvez utilizando mais linhas retas e tracejadas (como você fez para dividir o endereço na categoria de cliente).

## Assistant

_[tool: str_replace_edit]_

Bora montar essa variação híbrida — acordeão sem o card externo, tipografia gold de A/C, pill sendo o indicador, hierarquia por hairlines (sólida entre seções, tracejada entre subseções). Vou mostrar em 3 larguras (300, 380, 480) pra validar no range que você tem.

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Versão E pronta no topo do canvas, em 3 larguras (300 / 380 / 480px) pra você validar no range do painel.

**O que mudou:**
- **Sem card externo** — sentou direto no fundo da página, igual o C.
- **Eyebrow gold** maiúsculo com letterspacing nos títulos de seção (A/C).
- **Pill é o indicador**: vazio (`0 / 8`) = pill neutra com borda fina; completo (`2 / 2`) = pill gold preenchida com check. Removi a bolinha à esquerda do nome.
- **Hierarquia por linhas**: hairline sólida edge-to-edge separa seções; hairline **tracejada** separa subseções (Endereço dentro de Cliente).
- **Chevron sutil** à direita da pill como única affordance de "clicável".
- Mantive os inputs filled de C (sem borda) — funcionam bem em larguras estreitas e não competem com as hairlines.

Mostrei a seção **Foro** já com `2 / 2` completa pra você ver o estado da pill preenchida em ação.

Se gostar, posso aplicar direto no `03-ai-chat.jsx` substituindo o painel esquerdo do editor unificado.

## User

Adorei, mas acho que da pra fazer algumas mini melhorias.

O radio de contratante e gênero pode ficar ao lado do nome, mas podemos mudar de "Contratante" para "Pessoa" e deixar as opções como "Física" e "Jurídica", quem está inserido no meio jurídico já entende isso bem. Isso permite que o nome fique bem ao lado sem quebrar.

Vou lhe enviar o descritivo do formulário para você já fazer o design dele completo com essa identidade nova:

Cliente

- Contratante pessoa física:
  - Nome completo
  - Gênero
  - Nacionalidade
  - Estado civil
  - Profissão
  - RG
  - CPF
  - Endereço
  - E-mail

- Contratante pessoa jurídica:
  - Razão social
  - CNPJ
  - Endereço
  - E-mail
  - Sócios representantes:
    - Nome completo
    - Gênero
    - Nacionalidade
    - Estado civil
    - Profissão
    - RG
    - CPF

- Permitir múltiplos contratantes.
- Permitir adicionar e remover sócios.

Objeto e prazo

- Objeto

Honorários (no campo de data, preciso que haja um botão de "Na assinatura", que adicionará ao texto do contrato que o pagamento dos honorários será no ato de assinatura do contrato.

- Tipo de honorários:
  - À vista
  - Parcelado
  - Parcelas variadas
  - Êxito puro
  - À vista + êxito
  - Parcelado + êxito

Campos por tipo:

- À vista:
  - Valor total dos honorários
  - Data de pagamento

- Parcelado:
  - Valor total dos honorários
  - Número de parcelas
  - Valor por parcela
  - Data da primeira parcela

- Parcelas variadas:
  - Parcela 1:
    - Valor
    - Vencimento
  - Parcela 2:
    - Valor
    - Vencimento
  - Adicionar/remover parcelas

- Êxito puro:
  - Percentual de êxito
  - Base de cálculo

- À vista + êxito:
  - Valor dos honorários fixos
  - Data de pagamento
  - Percentual de êxito
  - Base de cálculo

- Parcelado + êxito:
  - Valor total dos honorários
  - Número de parcelas
  - Valor por parcela
  - Data da primeira parcela
  - Percentual de êxito
  - Base de cálculo

Foro e data

- Cidade do foro
- Data de assinatura

## Assistant

_[tool: write_file]_

Vou construir o design completo. Decisões que tomei a partir do brief:

- **Linha topo do contratante**: `[Pessoa F|J] [Gênero M|F] [Nome completo]` em uma única linha com labels acima — micro-segmentadas (só "F"/"J", "M"/"F") liberam espaço pro nome até em 380px.
- **Múltiplos contratantes**: chips no topo da seção Cliente, cada chip é um contratante (clica pra trocar). PF/PJ independente por contratante.
- **Sócios em PJ**: subsection tracejada com cada sócio numerado + botão remover + `+ Adicionar sócio`.
- **"Na assinatura"**: botão pill ao lado do date input que, quando ativo, marca o campo (fica gold preenchido). Aplicado SÓ aos campos de data dos honorários, não na "Data de assinatura" do foro.
- **Tipo de honorários**: select dropdown (6 opções caberiam em chips mas viraria poluído); campos abaixo mudam conforme o tipo.
- **Vou renderizar tudo aberto** pra você revisar o form inteiro — em produção continua sendo acordeão.
- Duas artboards: **PF** com Honorários = Parcelado, e **PJ** com Honorários = Parcelado + Êxito (mais complexa) pra cobrir todos os casos visuais.

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Design completo entregue no topo do canvas — duas artboards a 400px:

**PF · Honorários parcelados** — caminho mais comum. Linha topo: `[Pessoa F|J] [Gênero M|F] [Nome completo]` em uma linha só com labels acima. Chips de contratante no topo da seção. Endereço como subsection tracejada. Pill "Foro e data" em estado gold (completo) pra você ver como fica.

**PJ · Parcelado + Êxito** — caso mais complexo. Linha topo: `[Pessoa F|J] [Razão social]`. Subsection "Sócios representantes" tracejada com cada sócio numerado (chip gold + botão Remover) e botão `+ Adicionar sócio` (borda tracejada). Honorários mostra o split fixo + êxito separados por uma terceira subsection tracejada interna ("Êxito"), demonstrando que o padrão escala para conteúdo aninhado.

Detalhes do componente novo:
- **"Na assinatura"**: pill ao lado do input de data; quando ativa, o input fica com fundo gold suave + check + texto "No ato da assinatura", e o botão fica gold sólido. Aplicado só nos campos de data de honorários (não no "Data de assinatura" do foro).
- **Tipo de honorários**: select dropdown. Embaixo, campos condicionais por tipo. Implementei os 6 tipos como componentes separados (`HonorAVista`, `HonorParcelado`, `HonorVariadas`, `HonorExitoPuro`, `HonorAVistaExito`, `HonorParceladoExito`) — fácil de trocar trocando uma prop.
- **Múltiplos contratantes / sócios / parcelas**: padrão de "repeater" com chip numerado gold + botão Remover, e botão dashed `+ Adicionar X` ao final. Mesma linguagem visual nos 3 casos pra criar consistência.

Se quiser, posso:
1. Renderizar as outras 5 variações de honorários como artboards separados pra você revisar os estados condicionais.
2. Aplicar o form diretamente no `03-ai-chat.jsx` no painel esquerdo do editor unificado.
3. Mostrar o form com a seção Cliente em "múltiplos contratantes" (2-3 chips) pra ver como o strip lida com vários.

## User

Verifier agent check completed

## Assistant

Recebido. Tudo limpo no canvas. Aguardando seu próximo passo (próximas variações de honorários, aplicar no editor unificado, ou testar com múltiplos contratantes/sócios).

## User

Não acho que fez sentido o Nome, Pessoa e Gênero comprimidos na primeira linha, o nome completo é grande e quem está preenchendo precisa vê-lo inteiro. A razão social a mesma coisa. Tirando isso, o design ficou perfeito. Pode consertar e já adicionar no 03-ai-chat.jsx

## Assistant

_[tool: str_replace_edit]_

Bom ponto — fields longos precisam de espaço. Vou corrigir os 3 identity rows e aplicar no editor unificado.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Pronto.

**Mudanças aplicadas:**
1. **Identity rows corrigidos** em PF, PJ e Sócio: micro-controles (`Pessoa F|J`, `Gênero M|F`) numa primeira linha; **Nome completo** / **Razão social** em uma segunda linha de largura total. O reflete tanto no canvas de variações quanto no editor unificado.

2. **Editor unificado (`03-ai-chat.jsx`)** agora usa o form novo no painel esquerdo:
   - Largura: 400px (no range 300-480 que você definiu)
   - Header: eyebrow gold "MODELO ATIVO" + título do contrato + "Trocar modelo"
   - Acordeão flat com as 4 seções: Cliente (aberta, PF, Helena Vargas), Objeto e prazo, Honorários (Parcelado), Foro e data (pill gold completa)
   - Footer de progresso na base do painel
   - Mantive o preview central e o chat IA da direita intactos

3. Limpei o código antigo (`FormField`/`FormSection` antigos) e expus os primitivos necessários via `window.*` pra reutilização entre arquivos.

O design no canvas de variações continua a fonte da verdade — qualquer ajuste futuro nos componentes (V5Section, ClientePFContent, HonorariosContent, etc.) reflete automaticamente no editor unificado, já que ambos usam os mesmos componentes.

## User

Verifier agent check completed

## Assistant

Tudo verificado e funcionando. Pronto pro próximo passo quando quiser — variações de honorários, ajustes no editor, ou outra área do app.

