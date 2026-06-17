# LexIA UI Refactor

_Started 2026-06-12 22:03 UTC_

---

## User

Refatore a UI/UX da página de documentos para que ela se adeque ao novo formato da LexIA. Se o melhor for manter o input ao lado do documento como é atualmente, então o input global deve desaparecer na tela de edição de documentos. Melhor ainda, quero que o input global da AI atualize o placeholder e ações sugeridas da LexIA dependendo da página em que o usuário está agora ou o que ele está fazendo. Se ele estiver em início, é genérico, se estiver em tarefas, a IA sugere ações de tarefas, se estiver em documentos, sugere documentos etc. A ideia é mostrar para o usuário como o app é AI first e útil para o que ele precisar. Quando o usuário for prosseguir para a edição de um documento, quero que o popup atual se redimensione para ficar ao lado direito do documento (de forma semelhante a posição atual). Esse redimensionamento deve ter uma animação bem moderna e bonita

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

_[tool: read_file]_

Now let me read the UI kit, data store, and shell to match the CRM's visual vocabulary.

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

Let me check available icons and how `FxFrame`/`fxDate` work.

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: update_todos]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the contextual chips and doc-aware replies in crm-lexia.jsx:

_[tool: str_replace_edit]_

_[tool: write_file]_

Now the core piece — the rewritten LexIA bar with contextual awareness and the dock morph:

## User

Continue

## Assistant

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now wire it all in crm-app.jsx:

_[tool: str_replace_edit]_

Now the HTML: script tag + shimmer/highlight CSS:

_[tool: show_html]_

_[tool: show_html]_

_[tool: multi_screenshot]_

The library page works with the contextual pill. Now let me drive the full generation → morph flow:

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: multi_screenshot]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: multi_screenshot]_

_[tool: get_webview_logs]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: get_webview_logs]_

_[tool: eval_js_user_view]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Refatorei a área de Documentos para o novo formato da LexIA. O que mudou:

**Input global contextual** — a pílula da LexIA agora "lê a sala": o placeholder e as sugestões mudam conforme a página. Em Início é genérico, em Tarefas sugere ações de tarefas, em Documentos convida a "Descreva o documento e a LexIA redige…", em Agenda sugere compromissos, etc. As "Ações rápidas" também se reordenam por contexto.

**Nova página de Documentos** — biblioteca no padrão do app: atalhos "Começar com a LexIA" (contrato, procuração, petição, parecer) que abrem o input global já preenchido, busca, filtros por status e tabela de documentos.

**O morph (popup → painel lateral)** — quando você pede um documento ("Minutar contrato para Helena Vargas"), a LexIA cria o rascunho, abre o editor numa aba e o popup central **se redimensiona com animação** para um painel acoplado à direita do papel — o backdrop some, o documento abre espaço, e a conversa continua ao lado. O papel mostra um shimmer enquanto a LexIA "redige" e a IA sugere melhorias aplicáveis (ex.: cláusula de multa, que entra destacada no documento).

Um verificador está testando o fluxo completo em segundo plano — se algo falhar, eu corrijo. Próximo passo natural, se quiser: trazer o quadro de Tarefas para dentro deste app e dar à LexIA ações reais sobre ele.

## User

Found issues — fixing…

## Assistant

_[tool: str_replace_edit]_

_[tool: done]_

Corrigido: a entrada do corpo do documento agora usa a animação transform-only (`crm-pop-in`) em vez do fade de opacidade — o conteúdo nunca fica invisível se a aba estiver em segundo plano durante a geração. Todo o resto do fluxo (biblioteca, sugestões contextuais, morph do painel, cláusula de multa, Escape) passou na verificação.

## User

Preciso que o documento tenha sempre a proporção A4 para mostrar fielmente o resultado final e o popup da IA deve ter a altura só até abaixo do header do breadcrumb dos documentos. Quando estiver aberto, por UX, o input deve ficar embaixo e não deve ter botão x para fechar

## Assistant

_[tool: read_file]_

Three changes: A4 proportion for the paper, dock panel starting below the breadcrumb header, and input at the bottom with no X button when docked. Let me look at the current bar layout first.

_[tool: read_file]_

_[tool: str_replace_edit]_

Now I'll make the changes. First the A4 proportion on the document paper:

_[tool: str_replace_edit]_

Now the dock geometry — start below the breadcrumb header:

_[tool: str_replace_edit]_

Now restructure the panel internals. First extract the chat scroll into a reusable const:Now replace the inner panel content (header → footer) with a dock/float branch:

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

Still in float mode — the navigation to the document editor isn't switching the active route. Let me inspect:

_[tool: read_file]_

_[tool: eval_js_user_view]_

Navigation to the `documento` route isn't persisting. Let me test whether opening an existing doc row navigates at all:

_[tool: eval_js_user_view]_

Library navigation works (`navInPane`), but `createDoc`'s `ctl.navCurrent` didn't stick. Let me reset and retest the generate flow, checking ws timing precisely:

_[tool: eval_js_user_view]_

My test selector was wrong (the active tab was still the old doc). Let me reset cleanly and test with a correct selector:

_[tool: eval_js_user_view]_

`rowsSeen` was empty — the bar was already open (docked) from the prior session, so the pill click did nothing. Leftover state is muddying the test. Let me reload fresh:

_[tool: show_html]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

The bar opens in **chat** view, not command view. Let me see which mode:

_[tool: eval_js_user_view]_

Component state is persisting across `show_html` — the iframe isn't truly remounting. Let me force a hard reload:

_[tool: sleep]_

_[tool: eval_js_user_view]_

It works perfectly on a clean load — `rowCount: 13` (command list), clicking "Minutar contrato" navigated to the `documento` editor (tab renamed, route `documento`, new docId), and the panel is now docked ("Editando ao lado"). The earlier failures were stale React state. Let me screenshot the final docked result:

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

All three requirements are working — A4 paper, bottom input, no X button. But the panel top still overlaps the breadcrumb header (it sits at 58px, but there's a tab strip *above* the editor toolbar). Let me measure the actual breadcrumb bottom:

_[tool: str_replace_edit]_

The breadcrumb bottom is at 106px (tab strip + toolbar). Let me set the dock to start just below it:

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: str_replace_edit]_

Stale ws again — the persisted route points to a runtime-generated doc that doesn't survive reload, so it shows "não encontrado". Two things: (1) I'll test cleanly from the library, and (2) I'll sanitize dangling `documento` routes on load so a reload never dead-ends. Let me add the sanitizer:

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

The panel now sits cleanly below the breadcrumb header, the document is A4, input is at the bottom, no X button. Let me verify the multa flow scrolls the clause into the A4 paper:The multa clause applies correctly with the "Adicionada pela LexIA" tag. Everything works. Let me hand off and fork the verifier:

_[tool: done]_

Pronto. Os três ajustes estão aplicados:

- **Documento em proporção A4** — o papel agora tem `aspect-ratio 210/297` fixo, mostrando fielmente o resultado final como uma página real.
- **Painel da IA abaixo do breadcrumb** — o painel acoplado começa logo abaixo do header de breadcrumb do editor (faixa de abas + toolbar), deixando o cabeçalho do documento sempre visível.
- **Input embaixo, sem botão X** — no modo acoplado o cabeçalho mostra só a marca da LexIA e o status; a conversa rola no meio e o campo de digitação fica fixo na base. Fechar é por Esc (ou clicando na pílula), sem X.

Também adicionei uma proteção: rotas de documento "órfãs" (geradas em runtime, que não sobrevivem a um reload) agora caem de volta na biblioteca em vez de mostrar "não encontrado".

Um verificador está revisando em segundo plano.

## User

Remova as menções a "gerado pela lexia", remova o "rascunho" e mantenha o documento na proporção A4. Transforme o "Pedir à Lexia" em um toggle que alterna o chat com a IA e o formulário de preencher manualmente. Adapte o estilo do formulário para ficar parecido com o chat da Lexia, para que não fique muito distoante. Por padrão, o que abre é o chat da Lexia.

## Assistant

_[tool: grep]_

Let me find all the "gerado pela LexIA" and status mentions in the editor:Now let me read the editor toolbar + meta section to edit precisely:

_[tool: read_file]_

_[tool: str_replace_edit]_

Now let me edit the editor — remove status badge & "gerado" text, and turn the button into a chat/form toggle:

_[tool: str_replace_edit]_

Now build the manual form component (styled to match the chat panel) and export it:

_[tool: str_replace_edit]_

Now wire `dockMode` into the bar and render the form. Update the signature and dock content:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now wire it in crm-app.jsx — add the panel mode state and pass to editor and bar:

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: get_webview_logs]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

"Gerado pela LexIA" and "Rascunho" are gone, the toggle [LexIA | Formulário] is in the toolbar with LexIA active by default. Let me test switching to the form:

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

The form renders cleanly and matches the chat aesthetic. But the Contratante select shows "A. A." instead of Helena — let me check the binding:

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

Let me re-verify in one clean sequence (the view may have changed between calls):The Contratante select correctly shows "Helena Vargas" — the earlier "A. A." was a stale render between calls. Everything works. Let me verify the toggle back to chat and the form's multa toggle, then hand off:

_[tool: eval_js_user_view]_

Toggle works both ways. All changes are in place. Let me hand off and fork the verifier:

_[tool: done]_

Pronto, tudo aplicado:

- **Removido "Gerado pela LexIA"** — a linha meta agora mostra só "X palavras · atualizado [data]".
- **Removido o "Rascunho"** — o badge de status saiu da toolbar e do cabeçalho do painel.
- **Documento em A4** — mantido (`aspect-ratio 210/297`).
- **Toggle LexIA ⇄ Formulário** — o antigo botão "Pedir à LexIA" virou um segmented control na toolbar que alterna o painel entre o chat da IA e o preenchimento manual. Por padrão abre o **chat da LexIA**; documentos recém-gerados também já abrem em chat.
- **Formulário no estilo do chat** — mesma superfície, cantos suaves e ritmo do painel da LexIA, com campos (contratante, objeto, valor, vencimento, vigência, reajuste), um toggle de "Multa por atraso" que aplica a cláusula no papel, e um botão "Atualizar documento" na base.

Verificador rodando em segundo plano.

## User

O aspect ratio ainda muda um pouco se o chat estiver aberto ou fechado. Quero ele SEMPRE A4. Além disso, diminua a opacidade da LexIA para que se consiga ver o fundo bem delimitado e blurred.

## Assistant

_[tool: read_file]_

Two fixes. First, let me re-read the current section block to rewrite the paper as height-driven (so its size never changes with the panel):

_[tool: read_file]_

_[tool: str_replace_edit]_

Now I'll rewrite the section so the paper is **height-driven** — its dimensions derive from the (constant) section height, so the panel opening only re-centers it, never resizes it:

_[tool: str_replace_edit]_

Now reduce the panel's acrylic opacity so the blurred background reads more clearly through it:

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

Paper is exact A4 (0.7063 ≈ 0.7071). Now close the panel and re-measure — size should be identical:Identical size (356×504) whether the panel is open or closed — the paper is now rock-solid A4. Let me screenshot both states to confirm the translucency and layout look good:

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: done]_

Both requirements are met: the paper stays a constant A4 (356×504, ratio 0.706) whether the panel is open or closed, and the LexIA panel is now more translucent so the blurred background reads through clearly. Let me hand off and verify:Feito:

- **Documento sempre A4 e estável** — o papel agora é dimensionado pela *altura* (constante) da área de edição, não pela largura. Abrir ou fechar o painel da LexIA apenas re-centraliza o documento; o tamanho fica idêntico (medi 356×504px nos dois estados, razão 0,706 = A4 exato). Antes ele encolhia quando o painel abria.
- **LexIA mais translúcida** — reduzi a opacidade do acrílico do painel (claro 80%→62%, escuro 58%→40%), então o fundo desfocado aparece bem delimitado atrás do vidro.

Verificador rodando em segundo plano.

