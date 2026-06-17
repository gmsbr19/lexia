/* LexIA · Design System — render helpers (vanilla, sem dependências).
   Gera as grades repetitivas (swatches, escala tipográfica, espaçamento, raios,
   matrizes de estado) a partir de dados, e cuida do tema + scroll-spy. */
(function () {
  const ic = (n, sz) => `<svg class="ds-icon"${sz ? ` style="font-size:${sz}px"` : ''}><use href="#i-${n}"/></svg>`;
  const el = (id) => document.getElementById(id);
  const set = (id, html) => { const n = el(id); if (n) n.innerHTML = html; };

  /* ---------- TEMA ---------- */
  const root = document.documentElement;
  const KEY = 'lexia-ds-theme';
  function applyTheme(t) {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(t === 'light' ? 'theme-light' : 'theme-dark');
    const b = el('themeBtn');
    if (b) b.innerHTML = (t === 'light' ? ic('moon') + 'Escuro' : ic('sun') + 'Claro');
  }
  let theme = localStorage.getItem(KEY) || 'dark';
  applyTheme(theme);
  document.addEventListener('click', (e) => {
    if (e.target.closest('#themeBtn')) {
      theme = (document.body.classList.contains('theme-light')) ? 'dark' : 'light';
      localStorage.setItem(KEY, theme);
      applyTheme(theme);
    }
  });

  /* ---------- SUPERFÍCIES ---------- */
  const surfaces = [
    ['Nível 1 · Página', '--bg', 'fundo de todas as telas'],
    ['Nível 2 · Card / Sidebar', '--bg-soft', 'superfícies de conteúdo'],
    ['Nível 3 · Elevado', '--bg-elevated', 'modais, popovers, toasts'],
  ];
  set('surfaceSwatches', surfaces.map(([nm, v, note]) => `
    <div class="ds-swatch">
      <div class="chip" style="background:var(${v})"></div>
      <div class="meta"><span class="nm">${nm}</span><span class="vl">${v}</span>
        <span class="vl" style="color:var(--text-muted)">${note}</span></div>
    </div>`).join(''));

  /* ---------- DOURADO + SEMÂNTICAS ---------- */
  const sem = [
    ['Dourado · assinatura', '--accent-strong', 'foco, ativo, CTA, marca, IA'],
    ['Verde · finalizado', '--ok', 'sucesso, recebido, concluído'],
    ['Âmbar · atenção', '--warn', 'em revisão, pendência'],
    ['Vermelho · crítico', '--crit', 'vencido, erro, destrutivo'],
    ['Neutro · inativo', '--text-muted', 'rascunho, secundário'],
  ];
  set('semanticSwatches', sem.map(([nm, v, note]) => `
    <div class="ds-swatch">
      <div class="chip" style="background:var(${v})"></div>
      <div class="meta"><span class="nm">${nm}</span><span class="vl">${v}</span>
        <span class="vl" style="color:var(--text-muted)">${note}</span></div>
    </div>`).join(''));

  /* ---------- BORDAS ---------- */
  const borders = [
    ['Padrão · 8%', '--border', 'separadores, contornos de card'],
    ['Hover · 16%', '--border-strong', 'estado de passagem'],
    ['Foco / seleção · dourado 40%', '--border-gold', 'item ativo, campo focado'],
  ];
  set('borderRows', borders.map(([nm, v, note]) => `
    <div class="ds-tokrow">
      <div class="demo" style="width:64px;height:40px;border-radius:var(--r-sm);border:1px solid var(${v});background:var(--surface)"></div>
      <div class="info"><div class="nm">${nm}</div><div class="vl">${v}</div></div>
      <div class="note">${note}</div>
    </div>`).join(''));

  /* ---------- TIPOGRAFIA ---------- */
  const typ = [
    ['25 / 500', 25, 500, 'Título de página', '-0.025em', 1.2],
    ['20 / 500', 20, 500, 'Título de seção', '-0.02em', 1.2],
    ['16 / 500', 16, 500, 'Subtítulo, card', '-0.015em', 1.4],
    ['16 / 400', 16, 400, 'Texto de destaque', '-0.01em', 1.5],
    ['14 / 500', 14, 500, 'Label, valor, item', '-0.01em', 1.5],
    ['14 / 400', 14, 400, 'Corpo de texto padrão', '-0.01em', 1.5],
    ['12 / 400', 12, 400, 'Legenda, metadado', '0', 1.5],
  ];
  set('typeScale', typ.map(([tag, px, w, label, ls, lh]) => `
    <div class="ds-typ">
      <span class="tag">${tag}</span>
      <span class="spec" style="font-size:${px}px;font-weight:${w};letter-spacing:${ls};line-height:${lh}">${label}</span>
      <span class="px">${px}px</span>
    </div>`).join('') + `
    <div class="ds-typ">
      <span class="tag">11 / 500</span>
      <span class="spec eyebrow" style="font-size:11px">Label de seção · caixa alta</span>
      <span class="px">0.08em</span>
    </div>`);

  /* ---------- ESPAÇAMENTO ---------- */
  const space = [['--s-1', 4], ['--s-2', 8], ['--s-3', 12], ['--s-4', 16], ['--s-5', 20], ['--s-6', 24], ['--s-7', 32], ['--s-8', 40]];
  set('spaceScale', space.map(([v, px]) => `
    <div class="ds-space">
      <span class="nm">${v} · ${px}</span>
      <div class="bar" style="width:${px}px"></div>
    </div>`).join(''));

  /* ---------- RAIOS ---------- */
  const radii = [['--r-xs', 6, 'badge, chip, input pequeno'], ['--r-sm', 8, 'botão, ícone, input'], ['--r-md', 10, 'item de lista'], ['--r-lg', 14, 'card, modal, popover']];
  set('radiusScale', radii.map(([v, px, note]) => `
    <div class="ds-radius">
      <div class="outer" style="border-radius:${px}px">
        <div class="inner" style="border-radius:${Math.max(px - 4, 2)}px"></div>
      </div>
      <span class="nm">${v} · ${px}px</span>
      <span class="nm" style="color:var(--text-subtle)">${note}</span>
    </div>`).join(''));

  /* ---------- MATRIZ DE BOTÕES ---------- */
  // estados pintados explicitamente (default / hover / focus / active / disabled)
  const btnVariants = [
    ['Primário', 'btn-primary', 'Gerar com a LexIA', 'sparkles'],
    ['Secundário', 'btn-secondary', 'Exportar', null],
    ['Fantasma', 'btn-ghost', 'Cancelar', null],
    ['Destrutivo', 'btn-danger', 'Excluir', null],
  ];
  const states = ['default', 'hover', 'focus', 'active', 'disabled'];
  function btnState(cls, label, icon, st) {
    const inner = (icon ? ic(icon, 16) : '') + label;
    let style = '', extra = '';
    if (st === 'focus') style = 'box-shadow:0 0 0 3px var(--ring)';
    if (st === 'disabled') extra = ' disabled';
    // forçar visual de hover/active via classe utilitária
    const force = (st === 'hover') ? ' force-hover' : (st === 'active') ? ' force-active' : '';
    return `<button class="btn ${cls}${force}"${extra} style="${style}">${inner}</button>`;
  }
  set('btnMatrix', btnVariants.map(([nm, cls, label, icon]) => `
    <div class="ds-block">
      <div class="ds-block-h">${nm}</div>
      <div class="ds-states">
        ${states.map((st) => `<div class="ds-state"><span class="lab">${st}</span>
          <div class="ds-sample">${btnState(cls, label, icon, st)}</div></div>`).join('')}
      </div>
    </div>`).join(''));

  /* ---------- MATRIZ DE INPUT ---------- */
  function inputState(st) {
    let style = '', ph = 'nome@escritorio.com', val = '';
    let cls = 'input';
    if (st === 'hover') style = 'border-color:var(--border-strong)';
    if (st === 'focus') style = 'border-color:var(--border-gold);box-shadow:0 0 0 3px var(--ring)';
    if (st === 'filled') { val = 'value="contato@aurora.adv.br"'; }
    if (st === 'error') { cls += '" aria-invalid="true'; style = 'border-color:var(--crit)'; val = 'value="aurora.adv"'; }
    if (st === 'disabled') return `<input class="input" placeholder="${ph}" disabled style="opacity:.45">`;
    return `<input class="${cls}" placeholder="${ph}" ${val} style="${style}">`;
  }
  const inStates = ['default', 'hover', 'focus', 'filled', 'error', 'disabled'];
  set('inputMatrix', `<div class="ds-grid cols-3" style="gap:22px 24px">
    ${inStates.map((st) => `<div class="ds-state" style="width:100%">
      <span class="lab">${st}</span>
      <label class="label" style="margin:0">E-mail</label>
      ${inputState(st)}
      ${st === 'error' ? '<div class="field-error">Informe um e-mail válido.</div>' : ''}
    </div>`).join('')}
  </div>`);

  /* ---------- SCROLL-SPY ---------- */
  const links = [...document.querySelectorAll('.ds-navlink')];
  const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((l) => l.style.removeProperty('color'));
        links.forEach((l) => l.style.removeProperty('background'));
        const a = map.get(en.target.id);
        if (a) { a.style.color = 'var(--text)'; a.style.background = 'var(--surface-hover)'; }
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px' });
  document.querySelectorAll('.ds-section').forEach((s) => obs.observe(s));
})();
