# Criação de Templates

_Started 2026-05-21 18:19 UTC_

---

## User

Atualmente, não há como criar templates de documento. Acho que o botão na topbar, ao invés de criar documento, deveria ser Novo Template. Lá é o melhor local para colocar um botão de criar template? Ou o melhor seria dentro de cada categoria de documento?

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Boa pergunta — vale pensar como decisão de hierarquia, não só de localização. Minha opinião:

**Não trocaria o botão da topbar.** "Novo documento" é a ação principal do módulo — é o que o advogado vai fazer 50× por semana. Criar template é uma ação **administrativa, de baixa frequência**, feita pelo sócio ou pelo responsável pela biblioteca, normalmente 1–2× por mês. Promover ela ao slot mais visível inverte a hierarquia de uso.

**Onde colocar então — em ordem de prioridade:**

1. **Dentro da página de Templates (Biblioteca › Templates) como CTA principal.** Esse é o local canônico, onde o usuário já está no mindset de "gerenciar modelos". Botão primário no topo da página: `+ Novo template`. É o único lugar *obrigatório*.

2. **Dentro de cada categoria, ao listar os templates daquela categoria.** Quando o usuário clica em "Contrato" no Home e vê os 14 templates, faz total sentido um `+ Novo template de contrato` ali — o tipo já está pré-selecionado, eliminando uma escolha. Isso também ajuda na descoberta: o usuário entende que o catálogo é editável, não fixo.

3. **(Opcional) Split-button na topbar.** Manter `Novo documento` como ação primária e adicionar um chevron `▾` ao lado com um submenu contendo `Novo template`, `Importar .docx`, etc. Mantém a hierarquia e dá um atalho de power-user sem poluir.

**O que eu evitaria:**
- Trocar o botão da topbar — vai frustrar o uso diário.
- Botão duplicado em todos os lugares — gera ruído visual sem ganho.
- Colocar **só** dentro de cada categoria sem ter na biblioteca — fragmenta a gestão de templates.

Quer que eu mocke essas duas/três opções como variações (artboards separados no canvas) para você comparar visualmente?

## User

Mas acho que aquele botão não faz muito sentido sendo que tem as opções logo abaixo em formato de cards, não fica redundante?

## Assistant

Você tem razão — em UX isso é o que chamam de "duplo CTA" ou "ação fantasma". A página inteira *é* o seletor de "novo documento", então o botão da topbar é decorativo. Boa observação.

Reavaliando com esse olhar:

**Na página Documentos (esta tela específica):**
- O botão `Novo documento` é redundante → pode sair, ou virar outra coisa.
- Substituir por `Novo template` aqui passa a fazer **mais** sentido do que eu sugeri antes: a ação primária da página (escolher tipo + criar) já está nos cards; a topbar fica livre para a ação **secundária**, que é justamente gerenciar/criar templates. Isso resolve seu problema sem inflar a UI.

**Mas a regra tem que ser consistente em todo o módulo:**
- Na tela de **Histórico** (lista de documentos), os cards não existem → ali `Novo documento` na topbar faz total sentido como CTA primário.
- Na tela de **Templates** (Biblioteca), o CTA primário deve ser `Novo template`.
- Ou seja: o botão da topbar é **contextual à página**, não global.

**Variação que pode ficar ainda mais elegante:** em vez de um botão único, ter dois affordances:
- Cards = "criar documento a partir de um template existente" (a ação mais comum)
- Topbar = "criar template novo" (ação de catálogo/biblioteca, ícone `+` discreto ou texto pequeno como `Gerenciar templates ↗`)

Isso comunica visualmente: "*os cards são para usar; o botão é para administrar*". Hierarquia clara, sem redundância.

Quer que eu aplique isso na tela Home agora — trocar `Novo documento` por `Novo template` (ou por um `Gerenciar templates ↗` mais sutil) e ver como fica?

## User

Na verdade, será que faz sequer sentido manter aqueles itens de templates e cláusulas na nav? A ideia da nav é ter itens que são utilizados com frequência, certo? E se o item de templates for adicionado em um dropdown de documentos enquanto o de cláusulas vai para a página de visualização do template específico, que é onde ele deve estar?

## Assistant

Concordo integralmente — e seu raciocínio é exatamente o princípio certo. **A nav lateral é território caro: cada item ali significa "vou aqui várias vezes por dia"**. Templates é configuração ocasional; Cláusulas é um *componente de edição*, não um destino.

Avaliando sua proposta:

**1. Cláusulas → dentro do editor de template/documento ✅**
Essa é a decisão mais clara. Cláusulas são *blocos reutilizáveis de texto* — fora do contexto de edição, elas não têm uso. Onde elas devem viver:
- **Painel lateral** no editor de template/documento (arrastar para inserir)
- Ou **slash command** (`/clausula foro` insere a cláusula de foro)
- Gerenciamento (CRUD) acessível por um botão `Gerenciar cláusulas` *dentro* do mesmo painel — não na nav global

Isso é o padrão do Notion (blocos), Figma (componentes), Linear (templates de issue). Componente fica perto do uso.

**2. Templates → repensaria o "dropdown"**
Aqui eu divergiria um pouco. Dropdowns em sidebar têm problemas:
- Exigem hover/clique extra
- Escondem destino atrás de interação
- Difícil escanear

**Alternativa que prefiro: tabs/segmentos dentro da página Documentos.**
A página `Documentos` ganha um seletor no topo (ou abas logo abaixo do breadcrumb):

```
Documentos
[ Criar ]  [ Meus documentos ]  [ Templates ]
```

- `Criar` = a tela atual com os cards de tipo (a Home)
- `Meus documentos` = o que hoje está em "Histórico"
- `Templates` = a biblioteca de templates

Vantagens:
- Sidebar mais enxuta (5 itens em vez de 7)
- Tudo relacionado a documentos vive embaixo do mesmo guarda-chuva
- Padrão claro (Linear, Vercel, Stripe usam esse padrão)
- `Histórico` deixa de ser uma tela separada e vira sub-seção (mais natural)

**Sidebar resultante:**
```
Início
Documentos    ← com tabs internas
Casos
Clientes
Agenda
─────────
Configurações
```

Limpa, alinhada com frequência de uso, e templates/cláusulas vão para onde semanticamente pertencem.

Quer que eu mocke essa reorganização? Posso fazer duas variações:
- **A:** Tabs internas na página Documentos (minha sugestão)
- **B:** Dropdown na sidebar como você propôs originalmente

Aí você compara lado a lado.

## User

Faça somente a opção A, adorei a ideia

## Assistant

_[tool: read_file]_

_[tool: read_file]_

Perfeito, vou implementar. Plano:

1. **Sidebar**: remover Templates + Cláusulas + header "Biblioteca"
2. **Tabs** novo componente em `shell.jsx`: `Criar | Meus documentos | Templates`
3. **Home (Criar)**: remover botão redundante da topbar, adicionar tabs
4. **Histórico → Meus documentos**: adicionar tabs, manter botão `Novo documento`
5. **Nova tela Templates**: biblioteca de templates com botão `Novo template`

_[tool: read_file]_

_[tool: str_replace_edit]_

Vou implementar. Começo pelo `shell.jsx` (sidebar enxuta + componente de tabs).

_[tool: str_replace_edit]_

Agora atualizo a Home (tab `Criar` ativa, sem botão redundante):

_[tool: str_replace_edit]_

Agora a tela de Histórico vira "Meus documentos":

_[tool: write_file]_

Agora crio a nova tela de Templates (biblioteca):Agora registro a tela e adiciono o artboard no canvas:

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Pronto. Mudanças aplicadas:

**Sidebar** — removidos `Templates`, `Cláusulas` e o header `Biblioteca`. Sobraram 5 itens de uso diário.

**Nova tab strip em Documentos** — `Criar · Meus documentos (142) · Templates (32)`, com underline dourado no item ativo.

**Hierarquia de CTAs por tab:**
- `Criar` → sem botão primário (a página já é o seletor). Ação secundária discreta `Gerenciar templates`.
- `Meus documentos` → `+ Novo documento` (primário) — antiga tela Histórico, renomeada.
- `Templates` → `+ Novo template` (primário) + `Importar .docx` (secundário).

**Nova tela Templates** (artboard 08) — grid de cards com mini-preview do papel timbrado, badge de categoria, contador de uso, favoritos, chips de filtro por tipo. No rodapé, um banner explicando que cláusulas agora vivem no editor de template.

Próximos passos sugeridos quando quiser: (1) desenhar o **editor de template** com o painel lateral de Cláusulas, (2) fluxo de **criar novo template** (do zero vs. duplicar existente vs. importar .docx).

## User

Na página de criar documento, a primeira opção deveria ser selecionar o template e então selecionar se será pelo método manual ou IA, certo? Também não seria melhor se os cards de Manual ou IA fossem mais minimalistas? Quais suas considerações para melhorar o UI/UX da página de criar documento a partir dessa que você já criou?

## Assistant

_[tool: read_file]_

Boas duas perguntas, e tenho várias considerações. Vou separar.

## 1. "Template primeiro, depois método" — sim, mas talvez possamos ir além

Você está certo: hoje o template está **escondido**. O usuário escolhe tipo → método → e só aí o template aparece (dentro do form/chat). Isso inverte a hierarquia, porque o template define a *estrutura final*, enquanto manual/IA é só o *modo de preenchimento*.

Mas eu questiono se a tela de método precisa existir. Considere:

**Opção A — Linear (sua proposta):** Tipo → Template → Método → Conteúdo
4 cliques antes de produzir qualquer coisa. Funciona, mas é wizard pesado.

**Opção B — Método embutido no card do template (recomendada):** Tipo → Template (com 2 CTAs no card: `Preencher` / `Com IA ✨`)
Elimina a tela inteira de método. O usuário vê cada template e decide ali mesmo. Menos cliques, mesma clareza.

**Opção C — IA como entrada padrão:** Home tem um input grande "Descreva o que precisa..." e a IA sugere o template. Manual fica como link secundário "ou escolha um template manualmente". Atalho para quem confia na IA.

Eu construiria **B como padrão + C como atalho no topo**. Assim você atende o usuário rápido (descreve e vai) e o usuário deliberado (escolhe template, escolhe método).

## 2. Cards de Manual/IA mais minimalistas — sim, totalmente

Os cards atuais têm:
- Ícone gigante de 56px com gradiente dourado
- Lista de 4 checkmarks (vira ruído — ninguém compara feature-a-feature antes de criar um contrato)
- Glow radial decorativo
- Badge "RECOMENDADO" competindo com o ícone
- Stepper de 4 passos no topo (overkill para 2 escolhas)

Para uma decisão binária, isso é desproporcional. **Se a tela continuar existindo**, o ideal seria:
- 2 cards lado a lado, ícone pequeno (20–24px), título + 1 linha de subtítulo, e pronto
- Sem checkmarks, sem badge, sem glow
- O "recomendado" vira apenas um destaque sutil (borda dourada ou label inline)

Mas reforço: provavelmente o melhor é **eliminar a tela** (opção B acima).

## 3. Outras melhorias que eu sugeriria para esse fluxo

| # | Problema atual | Sugestão |
|---|---|---|
| **a** | Stepper de 4 passos quebra a sensação de "rápido" | Reduzir para 2–3 passos visíveis ou trocar por breadcrumb fino. Mostrar só `Template → Conteúdo → Pronto` |
| **b** | Templates só aparecem como contagem ("14 templates") no card de tipo | Cada card de tipo deveria mostrar **os 2–3 mais usados** com mini-preview, e um link "ver todos" |
| **c** | Não há "começo rápido" para uso recorrente | Atalho na Home: `Repetir último: Contrato de Honorários (Helena Vargas)` |
| **d** | "Continuar editando" e cards de tipo competem por atenção | Inverter prioridade: rascunhos em aberto vêm **primeiro** (é o caso mais comum: terminar algo) |
| **e** | Não há nomeação do documento no início | Auto-nomear com `[Tipo] — [Cliente] — [data]` e permitir renomear depois |
| **f** | Cliente/caso são escolhidos *dentro* do form/chat | Selecionar cliente **antes** do template já filtra templates relevantes (ex: "Construtora Aurora" → templates de PJ) |
| **g** | IA e Manual produzem o mesmo output mas em telas separadas | Editor unificado: caixa de chat da IA é um *painel lateral* do form manual. Usuário alterna sem trocar de tela |
| **h** | Sem indicação de tempo/esforço | Microcopy honesta: "~30s com IA" vs "~3min preenchendo" ajuda a calibrar expectativa |

## 4. Minha recomendação concreta para a próxima iteração

Eu refaria a tela de criação assim:

1. **Home (`Criar`)** ganha:
   - Hero com input `Descreva o documento que precisa...` (entrada IA direta)
   - Abaixo, **rascunhos** primeiro (continuar onde parou)
   - Depois, **mais usados** (3-4 templates favoritos com 2 botões cada)
   - Por último, **navegar por tipo** (cards atuais, mas menores)

2. **Tela de método removida.**
3. **Tela de template:** ao clicar num tipo, vai direto para a galeria de templates daquele tipo, com `Preencher` / `Com IA` em cada card.
4. **Editor unificado:** chat da IA como painel lateral retrátil sobre o form. Mesma tela, dois modos.

Quer que eu mocke essa nova versão da Home + galeria de templates por tipo como **artboards adicionais** (mantendo os atuais para comparar)? Posso fazer 2–3 variações:
- **V1**: Home redesenhada (input IA + rascunhos + atalhos)
- **V2**: Tela "template por tipo" com método no card
- **V3**: Editor unificado (form + painel IA lateral)

Confirme quais quer ver e parto pra construir.

## User

Suas sugestões foram sensacionais, até porque a ideia do app é ser AI first, faça somente uma variação de cada, mas pode implementar todas as suas sugestões.

## User

Verifier agent check completed

## User

Verifier agent check completed

## Assistant

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Resolvido. `ContractParagraph` foi recriado em `05-preview.jsx` (havia morrido junto com o `04-manual-form.jsx`) e exposto via `window`, então as telas 05 e 06 voltaram a renderizar.

## User

Mas se o editor agora é unificado não faz sentido colocar as opções preencher/com IA na galeria de templates. Além disso, como o usuário chega naquela galeria de templates de contrato?

## Assistant

Duas observações perfeitas — você caçou inconsistências reais.

## 1. Dual CTAs na galeria não fazem mais sentido

Total acordo. A premissa do editor unificado é: **o método é uma propriedade da interação, não da escolha inicial**. Se o usuário entra pela IA ou começa preenchendo o form, a tela é a mesma. Logo, perguntar "Preencher ou Com IA?" no momento de escolher o template:
- É uma decisão prematura (ainda não viu o template)
- Recria o mesmo wizard que removemos
- Engana: independente do que clicar, ele cai no mesmo editor

**O certo:** um único CTA primário por template (`Usar template` ou apenas o card inteiro clicável), e opcionalmente um ícone secundário `Visualizar` (👁) para abrir um preview modal antes de comprometer. Mesma correção precisa rolar em **Atalhos do escritório** na Home — está com o mesmo problema.

## 2. Caminho até a galeria está implícito

Olhando hoje, a galeria por tipo (`02-mode-select`) é alcançada **apenas** clicando nos cards "Navegar por tipo" da Home — que estão lá no rodapé, pequenos, e o label genérico não vende "aqui você vê todos os 14 modelos de contrato". Pior: existe um item de tabs `Templates` que vai pra biblioteca geral (`08-templates`), criando duas portas de entrada quase-iguais.

Você tem **duas telas que fazem essencialmente a mesma coisa** com escopos diferentes:
- `02` = biblioteca filtrada por tipo (Contrato)
- `08` = biblioteca completa, com gestão (criar/importar)

Isso é redundância arquitetural. Tenho duas opções para resolver:

### Opção A — Unificar: uma única biblioteca, com filtro
- Apaga a tela `02`. A biblioteca é só `08` (Templates tab).
- Os cards "Navegar por tipo" na Home, ao serem clicados, levam para a tab Templates **com o filtro daquele tipo pré-aplicado** (ex: chip "Contrato" já ativo).
- Vantagem: uma única tela canônica, filtros = estado, nada duplicado.
- A Home fica claramente como "porta de entrada para criar"; Templates tab é "biblioteca".

### Opção B — Manter as duas, mas com papéis distintos
- `02` = experiência de **escolha** (foco: começar um contrato agora). Header focado no objetivo: "Escolha um contrato para começar". Sem botões de gestão.
- `08` = experiência de **gestão** (foco: administrar a biblioteca). Botões de Novo template, Importar, etc.
- Vantagem: cada tela tem um job claro.
- Desvantagem: dois caminhos pra ver os mesmos templates.

---

**Minha recomendação: Opção A.** Mais simples, menos código, sem ambiguidade pro usuário. A "gestão" (criar novo, importar) vira ação na própria tab Templates — o que aliás já está montado.

**Sobre como o usuário chega lá**, com a Opção A:
1. Cards "Navegar por tipo" da Home → tab Templates filtrada
2. Direto pela tab Templates do topo
3. Atalho "Ver biblioteca" no rodapé das seções de atalhos

Posso aplicar a Opção A agora — significa:
- Apagar `02-mode-select.jsx` (era a galeria por tipo)
- Atualizar a Home: "Navegar por tipo" claramente leva à Templates tab (com indicação visual)
- Atualizar a Templates tab (`08`) para receber um filtro inicial e funcionar como destino
- Remover dual CTAs lá também (já que o template clicado vai pro editor unificado)
- Atualizar manifesto no `LexIA.html`

Confirma que vamos de A?

## User

Sim, implemente a opção A. Acho que aquela action de gerenciar templates no canto superior direito também é desnecessária, visto que, se o usuário quiser gerenciar os templates, ele pode ir na aba templates e fazer isso de lá.

## Assistant

_[tool: delete_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Agora atualizo a Home: removo a action `Gerenciar templates` e converto os atalhos para CTA único:

_[tool: grep]_

Vou conferir a 08-templates pra garantir CTA único e ajustar a "Navegar por tipo" da Home pra deixar mais claro que leva à biblioteca:

_[tool: str_replace_edit]_

Boa — a `08-templates` já está com CTA único (card clicável). Vou só adicionar um subtítulo na seção "Navegar por tipo" pra deixar explícito que leva à biblioteca:

_[tool: done]_

_[tool: fork_verifier_agent]_

Pronto. Mudanças aplicadas:

- **Tela `02-mode-select` removida** — a galeria por tipo virou estado filtrado da biblioteca em `Templates` tab.
- **Topbar action "Gerenciar templates" eliminada** — a Home na tab Criar agora não tem ação primária na topbar (a página já é a ação).
- **Atalhos do escritório**: dual CTAs → card inteiro clicável com chevron, igual ao padrão da galeria.
- **Navegar por tipo**: subtítulo + link "Toda a biblioteca →" deixam explícito que clicar leva à biblioteca filtrada.
- **Manifesto e dependências** no `LexIA.html` atualizados.

O fluxo agora é coerente: Home → (template ou IA) → Editor unificado. Biblioteca de Templates é o único destino para ver/gerenciar modelos, acessível pela tab ou pelos cards de tipo da Home.

## User

Um detalhe: vamos adotar o termo "modelo" na UI ao invés de template, para que fique mais acessível visto que o país de uso é o Brasil

## Assistant

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Vou trocar "Template/Templates" por "Modelo/Modelos" em todo o texto visível. Mantenho nomes de componente/variável em inglês (interno).

_[tool: grep]_

_[tool: done]_

Tudo limpo nas strings visíveis. As ocorrências remanescentes são nomes de componente/prop e propriedades CSS (`gridTemplateColumns`) — código interno, invisível pro usuário.Pronto. Trocas aplicadas em todos os textos visíveis:

- **Tab**: "Templates" → "Modelos"
- **Home**: "templates" → "modelos" (composer, atalhos, navegação por tipo)
- **Editor**: "Template ativo" → "Modelo ativo", "Trocar template" → "Trocar modelo"
- **Biblioteca**: título "Modelos", "Novo modelo", "Buscar modelo...", referências a "editor de modelo"
- **Revisão**: "Modelo HRA-02"

Os identificadores internos (`active="templates"`, `TemplateCard`, etc.) ficam em inglês — não vazam pra UI.

## User

Que prompt posso dar para o Claude Code implementar essas alterações na UI/UX de forma eficiente? Não quero gastar muitos créditos, quero que ele seja certeiro

## Assistant

Vou te dar um prompt enxuto, específico e com regras anti-desperdício. Pode colar diretamente.

````markdown
# Refatorar módulo de Documentos — UI/UX

Implemente APENAS o que está nesta lista. Não adicione features extras, não refatore componentes não mencionados, não escreva docs ou testes a menos que exista infra prévia.

## Contexto
Módulo AI-first: usuário cria contratos, procurações, propostas e pareceres a partir de modelos, preenchendo manualmente ou via IA.

## Antes de começar
1. Liste os arquivos das telas atuais de Documentos (Home, Histórico, Templates, criação manual, chat IA). Mostre só os caminhos.
2. Aguarde minha confirmação antes de editar.

## Mudanças

### Navegação e terminologia
- Remover **Templates** e **Cláusulas** do menu lateral, e o header "Biblioteca". Sidebar final: Início · Documentos · Casos · Clientes · Agenda · Configurações.
- Trocar todo texto visível **Template/Templates** → **Modelo/Modelos**. Manter nomes internos (variáveis, componentes) em inglês.

### Página Documentos → 3 tabs internas
- Tabs: `Criar` (default) · `Meus documentos (142)` · `Modelos (32)`.
- "Meus documentos" é a renomeação da antiga tela de Histórico.

### Tab Criar (Home AI-first)
- **Remover** botão "Novo documento" da topbar (a página é o seletor).
- Hero: composer da IA em destaque (placeholder com exemplo real, botão "Criar com IA"), seguido de chips com exemplos clicáveis.
- Ordem das seções: (1) "Continue de onde parou" — rascunhos com % de conclusão; (2) "Atalhos do escritório" — 4-6 modelos mais usados; (3) "Navegar por tipo" — 4 cards compactos.
- Cards de modelo e de tipo: **um único CTA** (card inteiro clicável). Sem dual "Preencher / Com IA".

### Tab Modelos (biblioteca única)
- Lista canônica. Topbar: `+ Novo modelo` e `Importar .docx`.
- Chips de filtro por tipo no topo.
- Cards clicáveis inteiros, sem dual CTAs.
- Filtro inicial deve aceitar query param (cards da Home navegam pra cá com filtro pré-aplicado).

### Editor unificado (substitui Manual + Chat IA)
- 3 colunas: form (~280px) à esquerda · preview ao vivo no centro com variáveis destacadas em dourado · painel da IA (~320px) à direita, colapsável.
- Campos preenchidos pela IA: borda + badge dourado "IA".
- Sugestões da IA aparecem como cards "Sugestão · [campo]" com botão de aceitar.
- Topbar: status `Salvo há Ns`, botão `Visualizar`, CTA primário `Gerar documento`.

### Cláusulas
- Mover Cláusulas para painel/comando dentro do editor de modelo. Sem página dedicada na nav.

### Remoções
- Tela "Manual vs IA" (escolha de método) — não existe mais.
- Tela "Galeria de templates por tipo" — é a tab Modelos com filtro.
- Stepper de 4 passos.

## Regras anti-desperdício
- **Reaproveite** componentes existentes (botões, cards, inputs) antes de criar novos.
- **Não troque** design tokens, bibliotecas ou tema.
- **Não toque** em telas fora deste escopo (auth, dashboard, billing etc.).
- Faça commits pequenos por seção: `feat(docs): tabs internas`, `refactor(docs): editor unificado`, etc.
- Ao final, **uma linha por decisão de implementação relevante**. Sem ensaio.

## Entrega
- Diff por arquivo, agrupado por commit.
- Lista final de telas removidas e novas rotas.
````

**Dicas operacionais pra economizar mais:**

1. **Abra no Claude Code só os arquivos do módulo de Documentos** antes de colar o prompt. Ele não vai pescar contexto do projeto inteiro.
2. **Rode em plan mode** (se a sua versão tiver) — ele descreve o plano antes de editar, você corta o que não interessa antes de ele gastar tokens implementando.
3. A regra "**aguarde minha confirmação após listar os arquivos**" é o pulo do gato: você confirma que ele identificou os arquivos certos antes de ele começar a editar. Evita ele refazer coisa errada.
4. **Anexe um screenshot** das telas atuais (uma de cada artboard) se possível — economiza muito mais que palavras quando o design já está pronto.

Se quiser, posso gerar as **screenshots dos artboards atuais** (V1 Home, Modelos, Editor) pra você anexar junto.

