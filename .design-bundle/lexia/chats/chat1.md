# App Gestão Advocacia

_Started 2026-05-21 15:06 UTC_

---

## User

Quero começar a desenvolver um app de gestão completo para o escritório de advocacia. Quero começar com um módulo de criação de documentos (contrato, procuração, proposta) e ir escalando com o tempo. A ideia é usar as cores #C0A147, #020D25 como base, já que são as cores do escritório, deve ter um modo claro e escuro. Primeiro faça o design da página inicial de criação de documentos e do fluxo até baixar o docx ou pdf do documento, tendo tanto um modo manual como um modo AI. A interface deve ser limpa, minimalista, moderna e seguir o design pattern da Apple. Sobre os ícones, gosto muito do LucideIcons.

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- office_name: LexIA
- doc_types_priority: Contrato, Procuração, Proposta, Parecer jurídico
- home_layout: 0
- ai_flow: Chat conversacional (usuário descreve o que precisa), Templates pré-prontos editáveis por AI, Os templates já são pré prontos com o conteúdo do escritório, mas a IA pode personalizar o documento. Além disso, já será feito no papel timbrado do escritório.
- manual_flow: Formulário com campos pré-definidos + preview, Template editável com placeholders {{NOME}}
- screens: Página inicial (lista de tipos de documento), Seleção de modo (Manual vs AI), Modo AI - conversa/formulário, Modo Manual - editor/formulário, Preview do documento gerado, Tela de download (DOCX / PDF), Histórico de documentos
- navigation: Sidebar colapsável + breadcrumb
- default_mode: Mostrar ambos lado a lado
- typography: Inter (clean, similar a SF Pro)
- ai_personality: Assistente discreto (apenas executa)
- variations: Decide for me
- tweaks: Alternar claro/escuro

## Assistant

_[tool: update_todos]_

Vou começar configurando o projeto. Plano:
- Design system: Inter, paleta navy `#020D25` + gold `#C0A147`, estilo Apple HIG (whitespace generoso, hierarquia tipográfica, cantos suaves, sombras sutis)
- Vou montar 7 telas, cada uma em modo claro + escuro lado a lado num design canvas
- Lucide icons (SVG inline)

_[tool: copy_starter_component]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: read_file]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Pronto! Montei o módulo de documentos do **LexIA** com 7 telas, cada uma em modo claro e escuro lado a lado num canvas navegável (arraste para reorganizar, clique no botão de expandir para ver em tela cheia).

**Sistema de design aplicado:**
- Inter como tipografia principal (similar a SF Pro), tracking negativo nos títulos
- Navy `#020D25` + dourado `#C0A147` com superfícies cremosas no claro e navy profundo no escuro
- Cantos suaves (8–22px), sombras sutis, micro-interações estilo Apple HIG
- Ícones Lucide inline (stroke 1.75)

**Fluxo desenhado:**
1. **Página inicial** — 4 tipos de documento em cards, mais "Continuar editando"
2. **Seleção de método** — Manual vs IA (IA recomendada, em destaque dourado)
3. **IA · Conversa** — chat discreto à esquerda, preview ao vivo no papel timbrado à direita
4. **Manual · Formulário** — seções acordeão com progresso + preview com placeholders `{{NOME}}` destacados
5. **Revisão** — documento completo + painel lateral de verificações automáticas e sugestões da IA
6. **Download** — formato (PDF/DOCX), assinatura ICP-Brasil, envio ao cliente
7. **Histórico** — stats + tabela filtrável com origem (IA vs Manual)

**Detalhes propositais:**
- Papel timbrado fictício "Moraes & Associados" — troque pelos dados reais do seu escritório quando me passar
- Numeração `CT-2026-0142` indica arquivamento automático na pasta do cliente
- Os placeholders `{{NOME}}` aparecem em dourado translúcido quando ainda não preenchidos

**Próximos passos sugeridos:**
- Posso explorar variações da home (mais editorial, ou tipo dashboard)
- Adicionar fluxo de assinatura digital como tela própria
- Desenhar a tela de templates editáveis (biblioteca de cláusulas)
- Mockup mobile / iPad para uso em audiência

Me diga em que direção quer iterar.

## User

Save as standalone HTML: LexIA.html

## User

Como posso exportar esse projeto e importar no figma para começar a desenvolver?

## Assistant

_[tool: read_file]_

Vou te dar três caminhos práticos. Primeiro deixa eu verificar o arquivo atual e preparar os exports.

_[tool: str_replace_edit]_

_[tool: super_inline_html]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: run_script]_

_[tool: delete_file]_

_[tool: view_image]_

_[tool: image_metadata]_

_[tool: present_fs_item_for_download]_

_[tool: present_fs_item_for_download]_

As 14 PNGs ficaram um pouco cortadas pelo viewport. O caminho mais limpo para você é o arquivo standalone — ele importa direto no Figma via plugin com fidelidade total. Vou entregar tudo:## Como importar no Figma — 3 caminhos

**🥇 Recomendado: plugin html.to.design**
1. Baixe o `LexIA - standalone.html` acima
2. Abra um arquivo no Figma → menu **Plugins → html.to.design**
3. Aba **Import from file** → arraste o HTML
4. Cada frame vira uma camada editável com texto, cores e ícones SVG separados (não vira imagem)

**🥈 Alternativa rápida: PNGs como referência**
- O zip `frames` traz as 14 telas em PNG (7 telas × claro/escuro)
- Arraste todos no Figma e use como base visual enquanto você reconstrói os componentes nativos

**🥉 Para handoff direto ao dev**
- O projeto já está em React/JSX limpo — o dev pode partir direto do código
- Tokens em `styles/tokens.css` (cores, espaçamentos, sombras, raios)
- Componentes em `src/screens/*.jsx` e `src/shell.jsx`

> 💡 **Dica:** se quiser, posso me preparar para o handoff de dev gerando um pacote organizado (tokens + componentes + readme). Avise se quer seguir por aí.

