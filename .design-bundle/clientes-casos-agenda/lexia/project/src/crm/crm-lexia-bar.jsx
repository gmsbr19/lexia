// LexIA · CRM — Barra LexIA: a única superfície de IA do app.
// Dock central (pílula) + overlay acrílico que unifica busca + ação + IA por linguagem natural.
// Contextual: placeholder e sugestões mudam com a página ativa. No editor de documento,
// o popup se REDIMENSIONA (morph animado) para um painel acoplado à direita do papel.

const crmNorm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const LEX_TONES = {
  gold: 'var(--accent)',
  blue: 'var(--text-muted)',
  pos: 'var(--ok)',
  neg: 'var(--crit)',
  violet: 'var(--accent)',
  warn: 'var(--warn)',
};

// conversas recentes (mock) — histórico que aparece no estado ocioso do painel
const CRM_LEX_RECENTES = [
  { id: 'rc1', t: 'Marque como recebido os que ainda não estiverem. João Luiz C', d: '15/06/26' },
  { id: 'rc2', t: 'Quais clientes ainda não pagaram para a conta do Dr Leonardo', d: '15/06/26' },
  { id: 'rc3', t: 'Central park nos pagou 1777,46 esse mês', d: '14/06/26' },
  { id: 'rc4', t: 'Resumo do fluxo de caixa de maio', d: '12/06/26' },
];

// ---------- contexto → placeholder ----------
// a pílula "lê a sala": cada página convida para o que a IA faz de melhor ali
function crmLexPlaceholder(ctx) {
  if (ctx.doc) return 'Peça um ajuste, cláusula ou resumo deste documento…';
  if (ctx.cliente) return `Pergunte sobre ${ctx.cliente.apelido || ctx.cliente.nome}…`;
  switch (ctx.page) {
    case 'documentos': return 'Descreva o documento e a LexIA redige…';
    case 'tarefas': return 'Crie, priorize ou conclua tarefas…';
    case 'agenda': return 'Agende audiências, prazos e reuniões…';
    case 'clientes': return 'Busque um cliente ou cadastre um novo…';
    case 'casos': return 'Pergunte sobre casos, rateios e processos…';
    case 'contratos': return 'Consulte honorários ou cobre um cliente…';
    case 'financeiro': return 'Pergunte sobre o financeiro — quem deve, fluxo de caixa, lançar…';
    case 'comercial': return 'Pergunte sobre leads e captação…';
    default: return 'Pergunte ou comande a LexIA…';
  }
}

// find a cliente referenced loosely in a phrase ("cobrar aurora" -> Construtora Aurora)
function crmBarFindCliente(store, m) {
  return store.clientes.find((c) => {
    const toks = [c.apelido, c.nome].filter(Boolean).map(crmNorm);
    return toks.some((t) => t && (m.includes(t) || t.split(' ').some((w) => w.length > 3 && m.includes(w))));
  });
}

// natural-language → action suggestions (0–2). h = extended handlers (incl. ask()/draftDoc()).
function crmBarActions(q, store, h) {
  const m = crmNorm(q); const out = [];
  const cli = crmBarFindCliente(store, m);
  const has = (...ws) => ws.some((w) => m.includes(w));

  if (has('minutar', 'redigir', 'contrato', 'procuração', 'procuracao', 'parecer', 'petição', 'peticao', 'documento', 'minuta', 'cláusula', 'clausula')) {
    out.push({ icon: 'fileText', tone: 'gold', stay: true, title: 'Gerar documento com a LexIA', sub: cli ? `${q.trim()} · dados de ${cli.apelido || cli.nome}` : q.trim(), run: () => h.draftDoc(q) });
  }
  if (has('cobrar', 'receber', 'vencid', 'devend', 'honorário', 'honorario', 'inadimpl', 'pagamento')) {
    if (cli) out.push({ icon: 'wallet', tone: null, title: `Cobrar ${cli.apelido || cli.nome}`, sub: 'Abrir o financeiro do cliente', run: () => h.openClienteTab(cli.id, 'financeiro') });
    else out.push({ icon: 'wallet', tone: null, title: 'Honorários vencidos', sub: 'Resumo de inadimplência', run: () => h.ask('Quem está devendo?') });
  }
  if (has('tarefa', 'lembr', 'todo', 'fazer', 'follow')) out.push({ icon: 'listChecks', tone: null, title: 'Criar tarefa', sub: q.trim() || 'Nova tarefa', run: () => h.action('nova-tarefa') });
  if (has('cadastr') || (has('cliente') && has('novo', 'nova'))) out.push({ icon: 'user', tone: null, title: 'Cadastrar novo cliente', sub: 'Abrir formulário', run: () => h.action('novo-cliente') });
  if (has('agendar', 'audiência', 'audiencia', 'reunião', 'reuniao', 'prazo', 'evento', 'compromisso')) out.push({ icon: 'calendar', tone: null, title: 'Abrir agenda', sub: 'Marcar compromisso', run: () => h.navPage('agenda') });
  if (has('lançamento', 'lancamento', 'despesa', 'receita') && !out.length) out.push({ icon: 'banknote', tone: null, title: 'Novo lançamento', sub: 'Honorário ou despesa', run: () => h.action('novo-lancamento') });

  return out.slice(0, 2);
}

// contexto → ações rápidas (ordem muda por página: a IA sugere o que faz sentido AGORA)
function crmLexQuickActions(ctx, handlers, h) {
  const A = {
    doc:     { id: 'qa-doc', icon: 'fileText', tone: 'gold', title: 'Gerar documento', sub: 'Descreva e a LexIA redige a minuta', stay: true, run: () => h.seedInput('Minutar ') },
    cliente: { id: 'qa-cli', icon: 'user', title: 'Novo cliente', sub: 'Cadastrar PF ou PJ', run: () => handlers.action('novo-cliente') },
    tarefa:  { id: 'qa-tar', icon: 'listChecks', title: 'Nova tarefa', sub: 'Criar tarefa', run: () => handlers.action('nova-tarefa') },
    lanc:    { id: 'qa-lan', icon: 'banknote', title: 'Novo lançamento', sub: 'Honorário ou despesa', run: () => handlers.action('novo-lancamento') },
    evento:  { id: 'qa-evt', icon: 'calendar', title: 'Novo evento', sub: 'Audiência, prazo ou reunião', run: () => handlers.action('novo-evento') },
  };
  const order = ({
    documentos: ['doc', 'cliente', 'tarefa', 'evento'],
    tarefas:    ['tarefa', 'evento', 'doc', 'cliente'],
    agenda:     ['evento', 'tarefa', 'cliente', 'doc'],
    clientes:   ['cliente', 'tarefa', 'doc', 'evento'],
    cliente:    ['tarefa', 'doc', 'lanc', 'evento'],
    contratos:  ['lanc', 'cliente', 'doc', 'tarefa'],
    financeiro: ['lanc', 'cliente', 'tarefa', 'doc'],
    comercial:  ['cliente', 'tarefa', 'evento', 'doc'],
  })[ctx.page] || ['cliente', 'tarefa', 'lanc', 'evento'];
  return order.map((k) => A[k]);
}

// live search across entities (compact spotlight)
function crmBarSearch(store, nq) {
  const g = [];
  const cli = store.clientes.filter((c) => crmNorm(c.nome).includes(nq) || crmNorm(c.apelido).includes(nq) || crmNorm(c.cidade).includes(nq)).slice(0, 4);
  cli.forEach((c) => g.push({ kind: 'cli', id: c.id, icon: c.tipo === 'PJ' ? 'building' : 'user', title: c.nome, sub: `${c.tipo} · ${c.cidade ? c.cidade + '/' + c.uf : 'cliente'} · ${crmCasosCount(store, c.id)} casos`, _c: c }));
  const cas = store.casos.filter((k) => crmNorm(k.titulo).includes(nq)).slice(0, 3);
  cas.forEach((k) => g.push({ kind: 'caso', id: k.id, icon: 'briefcase', title: k.titulo, sub: `${k.tipo} · resp. ${crmFirst(k.responsavel)}`, _k: k }));
  const docs = (store.documentos || []).filter((d) => crmNorm(d.nome).includes(nq)).slice(0, 3);
  docs.forEach((d) => g.push({ kind: 'doc', id: d.id, icon: 'fileText', title: d.nome, sub: `${d.modelo} · ${d.status}` }));
  const con = store.contratos.filter((h) => crmNorm(h.descricao).includes(nq)).slice(0, 3);
  con.forEach((h) => { const c = store.clientes.find((x) => x.id === h.clienteId); g.push({ kind: 'contrato', id: h.id, icon: 'receipt', title: h.descricao, sub: `${c ? c.apelido || c.nome : ''} · ${fxMoney(h.valor)}`, _h: h }); });
  const tar = store.tarefas.filter((t) => crmNorm(t.titulo).includes(nq)).slice(0, 3);
  tar.forEach((t) => g.push({ kind: 'tarefa', id: t.id, icon: 'listChecks', title: t.titulo, sub: `${CRM_TASK_STATUS[t.status].label} · ${t.prioridade}` }));
  return g;
}

// ---------- animated brand mark ----------
const CrmLexiaMark = ({ size = 30, radius = 10, icon = 14 }) => (
  <div style={{ position: 'relative', width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(192,161,71,0.3)' }}>
    <div className="lex-orb-grad" style={{ position: 'absolute', inset: -size * 0.5, borderRadius: '50%' }}></div>
    <div style={{ position: 'absolute', inset: 1.5, borderRadius: radius - 1.5, background: 'rgba(2,13,37,0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5E9C6' }}>
      <Icon name="sparkles" size={icon} strokeWidth={2} />
    </div>
  </div>
);

// ---------- chat bubbles (inline conversation) ----------
const CrmBarMsg = ({ role, children }) => (
  <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', flexDirection: role === 'user' ? 'row-reverse' : 'row' }}>
    {role === 'ai' && <CrmLexiaMark size={26} radius={9} icon={13} />}
    <div style={{
      maxWidth: '84%', padding: '9px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, letterSpacing: '-0.01em',
      background: role === 'user' ? 'var(--brand-navy)' : 'color-mix(in srgb, var(--bg-sunken) 70%, transparent)',
      color: role === 'user' ? '#F5F1E4' : 'var(--text)',
      borderTopRightRadius: role === 'user' ? 4 : 14, borderTopLeftRadius: role === 'ai' ? 4 : 14,
    }}>{children}</div>
  </div>
);

const CrmBarCard = ({ card, h }) => {
  const c = LEX_TONES[card.tone] || LEX_TONES.gold;
  return (
    <div style={{ marginLeft: 35, marginTop: 8, display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: c + '1f', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={card.icon} size={15} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.sub}</div>
      </div>
      <button onClick={() => card.run(h)} className="btn btn-secondary" style={{ height: 28, fontSize: 12, padding: '0 10px', flexShrink: 0 }}>{card.action}</button>
    </div>
  );
};

// ---------- result / command row ----------
const CrmBarRow = ({ item, active, onHover, onRun }) => {
  const c = LEX_TONES[item.tone];
  return (
    <div data-idx={item._idx} onMouseEnter={onHover} onClick={onRun} className="lex-row" style={{
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
      background: active ? 'var(--accent-soft)' : 'transparent',
    }}>
      {active && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', background: 'var(--accent-line)' }}></span>}
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: item.ai ? 'transparent' : (c ? c + '1f' : (active ? 'var(--surface)' : 'var(--bg-sunken)')),
        color: c || (active ? 'var(--accent)' : 'var(--text-muted)'), padding: item.ai ? 0 : undefined }}>
        {item.ai ? <CrmLexiaMark size={32} radius={9} icon={15} /> : <Icon name={item.icon} size={16} strokeWidth={1.85} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: item.ai ? 600 : 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
        {item.sub && <div style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>}
      </div>
      {item.tag && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', background: 'var(--bg-sunken)', padding: '2px 7px', borderRadius: 6, flexShrink: 0, letterSpacing: '0.02em' }}>{item.tag}</span>}
      {active && <kbd className="crm-kbd" style={{ flexShrink: 0 }}>↵</kbd>}
    </div>
  );
};

const CrmBarGroupLabel = ({ children, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 4px' }}>
    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</span>
    {right}
  </div>
);

// chip de sugestão (estado vazio do chat acoplado)
const CrmBarChip = ({ children, onClick }) => (
  <button onClick={onClick} className="crm-chip" style={{
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '11px 13px',
    borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer',
    fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-sans)', fontWeight: 500, letterSpacing: '-0.01em',
  }}>
    <Icon name="sparkles" size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
    <span style={{ flex: 1 }}>{children}</span>
    <Icon name="arrowRight" size={14} style={{ color: 'var(--text-subtle)' }} />
  </button>
);

// ---------- the bar ----------
// dock=true (página de documento): o painel ancora à direita do papel, com morph animado.
const CrmLexiaBar = ({ open, onOpenChange, ctx, store, handlers, seed, dock, dockMode, tint = 50, auraOpacity = 100, auraSpread = 100, auraSpeed = 5, auraColor = 'misto', borderGlow = 90, borderSpeed = 5 }) => {
  const [q, setQ] = crmUseState('');
  const [sel, setSel] = crmUseState(0);
  const [view, setView] = crmUseState('command');     // 'command' | 'chat'
  const [thread, setThread] = crmUseState([]);
  const [thinking, setThinking] = crmUseState(false);
  const [render, setRender] = crmUseState(open);   // overlay no DOM (mantém durante o fechamento)
  const [show, setShow] = crmUseState(open);       // estado expandido (dispara as transições)
  const [box, setBox] = crmUseState({ w: 0, h: 0 }); // tamanho do artboard p/ geometria em px
  const [wide, setWide] = crmUseState(false);        // painel expandido (botão de tela cheia no header)
  const inputRef = crmUseRef(null);
  const listRef = crmUseRef(null);
  const scrollRef = crmUseRef(null);
  const probeRef = crmUseRef(null);

  // mede o host (app-screen) — a geometria float/dock é calculada em px e animada via CSS
  crmUseEffect(() => {
    const el = probeRef.current; if (!el) return;
    const upd = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    upd();
    const ro = new ResizeObserver(upd); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const overdue = crmUseMemo(() => {
    const v = store.lancamentos.filter(crmIsVencido);
    return { count: v.length, total: v.reduce((s, l) => s + l.valor, 0) };
  }, [store]);

  // funções "vivas" via ref — evita closures velhas dentro do h memoizado
  const fnRef = crmUseRef({});
  fnRef.current = { askLexia, draftDoc, applyMulta, seedInput };

  // extended handlers given to actions/cards
  const h = crmUseMemo(() => ({
    ...handlers,
    ask: (text) => fnRef.current.askLexia(text),
    draftDoc: (text) => fnRef.current.draftDoc(text),
    applyMulta: (id) => fnRef.current.applyMulta(id),
    seedInput: (t) => fnRef.current.seedInput(t),
    close: () => onOpenChange(false),
  }), [handlers]);

  const runAndClose = (fn) => { fn && fn(h); onOpenChange(false); };

  function askLexia(text) {
    const t = (text != null ? text : q).trim();
    if (!t) return;
    setView('chat'); setQ(''); setThread((p) => [...p, { role: 'user', text: t }]); setThinking(true);
    setTimeout(() => {
      const r = crmLexiaReply(t, ctx, store);
      setThinking(false);
      setThread((p) => [...p, { role: 'ai', text: r.text, cards: r.cards }]);
    }, 850 + Math.random() * 450);
  }

  function seedInput(t) {
    setView('command'); setQ(t || '');
    setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
  }

  // gera um documento: cria o rascunho, navega para o editor (o que dispara o morph
  // para o painel lateral) e continua a conversa ao lado do papel.
  function draftDoc(text) {
    const t = (text != null ? text : q).trim();
    if (!t) return;
    const m = crmNorm(t);
    const cli = crmBarFindCliente(store, m);
    const tipo = m.includes('procura') ? 'Procuração'
      : (m.includes('peticao') || m.includes('contestacao') || m.includes('recurso')) ? 'Petição'
      : m.includes('parecer') ? 'Parecer' : 'Contrato de Honorários';
    const docId = handlers.createDoc({ prompt: t, tipo, clienteId: cli ? cli.id : null });
    setView('chat'); setQ('');
    setThread((p) => [...p, { role: 'user', text: t }]);
    setThinking(true);
    setTimeout(() => {
      handlers.finishDoc(docId);
      setThinking(false);
      setThread((p) => [...p, {
        role: 'ai',
        text: `Pronto — redigi a minuta de ${tipo.toLowerCase()}${cli ? ` com os dados de ${cli.apelido || cli.nome}` : ''}, no padrão do escritório. Revise ao lado: posso ajustar cláusulas, valores e redação.`,
        cards: [{ icon: 'sparkles', tone: 'gold', title: 'Incluir multa por atraso', sub: '2% + juros de 1% a.m. · padrão do escritório', action: 'Aplicar', run: (hh) => hh.applyMulta(docId) }],
      }]);
    }, 2300);
  }

  function applyMulta(id) {
    handlers.patchDoc(id, { multa: true });
    setThread((p) => [...p, { role: 'ai', text: 'Cláusula de multa incluída — está destacada no documento ao lado.' }]);
  }

  // mount + Apple-style expand/collapse driven by `open`
  crmUseEffect(() => {
    if (open) {
      setRender(true);
      // rAF dá a transição suave em foreground; o setTimeout garante a abertura
      // mesmo quando o rAF está congelado (aba em background / captura)
      const raf = requestAnimationFrame(() => setShow(true));
      const st = setTimeout(() => setShow(true), 60);
      const ft = setTimeout(() => inputRef.current && inputRef.current.focus(), 40);
      if (seed && !dock) { setView('command'); setQ(seed); }
      return () => { cancelAnimationFrame(raf); clearTimeout(st); clearTimeout(ft); };
    }
    setShow(false);
    const t = setTimeout(() => { setRender(false); setQ(''); setSel(0); setView('command'); setThread([]); setThinking(false); }, 380);
    return () => clearTimeout(t);
  }, [open]);

  // acoplado ao documento, a barra é sempre conversa (o comando vive nas outras páginas)
  crmUseEffect(() => { if (open && dock) setView('chat'); }, [open, dock]);

  crmUseEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [thread, thinking]);

  const nq = crmNorm(q.trim());

  // build command groups
  const groups = crmUseMemo(() => {
    if (view === 'chat') return [];
    const gs = [];
    if (!nq) {
      const chips = crmContextChips(ctx) || [];
      const sug = chips.map((c, i) => {
        const gen = /^(minutar|gerar|redigir|elaborar)/.test(crmNorm(c));
        return { id: 'sg' + i, ai: true, title: c, run: () => gen ? draftDoc(c) : askLexia(c) };
      });
      if (overdue.count) sug.unshift({ id: 'ov', icon: 'alertTriangle', tone: 'neg', title: `${overdue.count} honorário(s) vencido(s) · ${fxMoney(overdue.total)}`, sub: 'Pedir à LexIA um plano de cobrança', tag: 'Atenção', run: () => askLexia('Quem está devendo?') });
      gs.push({ key: 'sug', label: 'Sugestões da LexIA', items: sug });
      gs.push({ key: 'recentes', label: 'Conversas recentes', items: CRM_LEX_RECENTES.map((r) => (
        { id: r.id, icon: 'history', title: r.t, sub: r.d, run: () => askLexia(r.t) }
      )) });
      return gs;
    }
    // typing: AI row + detected actions first, then results
    const ai = [{ id: 'ask', ai: true, title: `Perguntar à LexIA`, sub: `“${q.trim()}”`, tag: 'IA', run: () => askLexia(q) }];
    crmBarActions(q, store, h).forEach((a, i) => ai.push({ id: 'act' + i, icon: a.icon, tone: a.tone, stay: a.stay, title: a.title, sub: a.sub, run: () => a.run() }));
    gs.push({ key: 'lexia', label: 'LexIA', items: ai });
    const res = crmBarSearch(store, nq).map((r) => ({ ...r, run: () => {
      if (r.kind === 'cli') handlers.openCliente(r.id);
      else if (r.kind === 'caso') handlers.openCaso(r.id);
      else if (r.kind === 'doc') handlers.openDocumento(r.id);
      else if (r.kind === 'contrato') handlers.openContrato(r.id);
      else if (r.kind === 'tarefa') handlers.navPage('tarefas');
    } }));
    if (res.length) gs.push({ key: 'res', label: 'Resultados', items: res });
    return gs;
  }, [view, nq, ctx, store, overdue]);

  // flat index for keyboard nav
  let _i = -1;
  groups.forEach((g) => g.items.forEach((it) => { it._idx = ++_i; }));
  const flat = groups.flatMap((g) => g.items);
  crmUseEffect(() => { setSel(0); }, [nq, view]);

  crmUseEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (view === 'chat' && !dock) { setView('command'); setThread([]); }
        else onOpenChange(false);
      }
      else if (view === 'command') {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          if ((e.metaKey || e.ctrlKey) && q.trim()) { askLexia(q); return; }
          const it = flat[sel];
          if (it) { if (it.ai || it.stay) it.run(); else runAndClose(() => it.run()); }
          else if (q.trim()) askLexia(q);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, view, flat, sel, q, dock]);

  crmUseEffect(() => {
    const list = listRef.current; if (!list) return;
    const el = list.querySelector(`[data-idx="${sel}"]`);
    if (!el) return;
    const lr = list.getBoundingClientRect(), er = el.getBoundingClientRect();
    if (er.top < lr.top + 8) list.scrollTop += er.top - lr.top - 8;
    else if (er.bottom > lr.bottom - 8) list.scrollTop += er.bottom - lr.bottom + 8;
  }, [sel]);

  // ---------- geometria do painel acoplado à direita (cresce do orbe no canto) ----------
  const W = box.w || 1280, H = box.h || 800;
  const dw = Math.max(340, Math.min(430, Math.round(W * 0.30)));
  const dockTop = 114; // documento: logo abaixo do header de breadcrumb do editor
  const sideTop = 64;  // demais telas: logo abaixo da faixa de abas
  let geo;
  if (dock) {
    geo = { left: W - dw - 14, top: dockTop, width: dw, height: H - dockTop - 14, radius: 16 };
  } else {
    const sw = wide
      ? Math.max(480, Math.min(660, Math.round(W * 0.46)))
      : Math.max(360, Math.min(440, Math.round(W * 0.30)));
    geo = { left: W - sw - 16, top: sideTop, width: sw, height: H - sideTop - 16, radius: 16 };
  }
  const morphOrigin = '100% 100%';                       // cresce a partir do canto inferior direito (o orbe)
  const enterTransform = 'translateY(18px) scale(0.96)';
  const morphEase = 'cubic-bezier(.32,.72,.24,1)';
  // vidro: alpha controlável via tweak (transparência máxima sem perder legibilidade), por cima do app
  const glassBg = `rgba(var(--lex-glass-base), ${Math.max(0, Math.min(1, (tint == null ? 50 : tint) / 100))})`;
  // painel acoplado: NUNCA escurece o app — o usuário continua mexendo nas telas com ele aberto
  const showBackdrop = false;

  const docStatus = ctx.doc ? ((window.CRM_DOC_STATUS || {})[ctx.doc.status] || { label: ctx.doc.status, tone: 'neutral' }) : null;

  // auras de fundo controláveis (intensidade, amplitude, velocidade, cor) — só no painel de conversa
  const G = '192,161,71', B = '74,110,180';
  const auraCols = auraColor === 'dourado' ? [G, G, G] : auraColor === 'azul' ? [B, B, B] : [G, B, G];
  const auraSpd = Math.max(1, auraSpeed);
  const blobDur = (base) => `${(base * 5 / auraSpd).toFixed(1)}s`; // 5 = base; maior = mais rápido
  const aurora = (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: geo.radius, zIndex: 0,
      opacity: Math.max(0, auraOpacity) / 100, transform: `scale(${Math.max(0.4, auraSpread / 100)})` }}>
      <div className="lex-blob-1" style={{ position: 'absolute', width: '110%', height: '85%', left: '-28%', top: '-28%', borderRadius: '50%', background: `radial-gradient(circle, rgba(${auraCols[0]},0.18), transparent 72%)`, filter: 'blur(46px)', animationDuration: blobDur(9) }}></div>
      <div className="lex-blob-2" style={{ position: 'absolute', width: '105%', height: '85%', right: '-30%', top: '12%', borderRadius: '50%', background: `radial-gradient(circle, rgba(${auraCols[1]},0.15), transparent 74%)`, filter: 'blur(50px)', animationDuration: blobDur(11) }}></div>
      <div className="lex-blob-3" style={{ position: 'absolute', width: '115%', height: '80%', left: '-8%', bottom: '-30%', borderRadius: '50%', background: `radial-gradient(circle, rgba(${auraCols[2]},0.15), transparent 74%)`, filter: 'blur(46px)', animationDuration: blobDur(10) }}></div>
    </div>
  );
  // borda controlável (brilho + velocidade) via CSS vars no container — o orbe mantém o padrão
  const edgeVars = { '--lex-edge-opacity': Math.max(0, borderGlow) / 100, '--lex-edge-dur': `${(35 / Math.max(1, borderSpeed)).toFixed(1)}s` };

  // corpo da conversa (compartilhado entre flutuante e acoplado)
  const chatScroll = (
    <div ref={scrollRef} className="lex-back" style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: dock ? '16px 14px' : '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {thread.length === 0 && !thinking && (
        <div style={{ margin: 'auto 0' }}>
          <div style={{ textAlign: 'center', padding: '6px 0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><CrmLexiaMark size={44} radius={14} icon={21} /></div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>{ctx.doc ? 'LexIA neste documento' : 'Converse com a LexIA'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5, maxWidth: 270, marginInline: 'auto' }}>
              {ctx.doc ? 'Peça ajustes, novas cláusulas, valores ou um resumo — eu edito o papel ao lado.' : 'Posso buscar informações, resumir clientes e casos, e ajudar nas tarefas do dia.'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(crmContextChips(ctx) || []).map((c, i) => (
              <CrmBarChip key={i} onClick={() => askLexia(c)}>{c}</CrmBarChip>
            ))}
          </div>
        </div>
      )}
      {thread.map((m, i) => (
        <div key={i}>
          <CrmBarMsg role={m.role}>{m.text}</CrmBarMsg>
          {m.cards && m.cards.map((c, j) => <CrmBarCard key={j} card={c} h={h} />)}
        </div>
      ))}
      {thinking && (
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <CrmLexiaMark size={26} radius={9} icon={13} />
          <div style={{ display: 'flex', gap: 4, padding: '12px 14px', borderRadius: 14, background: 'color-mix(in srgb, var(--bg-sunken) 70%, transparent)' }}>
            <span className="crm-dot" style={{ animationDelay: '0ms' }}></span>
            <span className="crm-dot" style={{ animationDelay: '160ms' }}></span>
            <span className="crm-dot" style={{ animationDelay: '320ms' }}></span>
          </div>
        </div>
      )}
    </div>
  );

  // composer (input embaixo) — usado no modo acoplado ao documento
  const composer = (
    <div style={{ position: 'relative', padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-soft) 60%, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 13, padding: '5px 5px 5px 14px' }}>
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askLexia(q); } }}
          placeholder="Peça um ajuste, cláusula ou resumo…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text)', letterSpacing: '-0.01em', minWidth: 0, padding: '6px 0' }} />
        <button onClick={() => askLexia(q)} disabled={!q.trim()} style={{
          width: 32, height: 32, borderRadius: 9, border: 'none', flexShrink: 0, cursor: q.trim() ? 'pointer' : 'default',
          background: q.trim() ? 'var(--brand-gold)' : 'var(--bg-sunken)',
          color: q.trim() ? '#020D25' : 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s',
        }}><Icon name="send" size={15} /></button>
      </div>
    </div>
  );

  return (
    <>
      {/* probe invisível: mede o artboard p/ geometria em px */}
      <div ref={probeRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', visibility: 'hidden' }}></div>

      {/* -------- LAUNCHER (recolhido) — orbe: vidro azul do popup (mesma cor + transparência) com o spark dourado -------- */}
      <button onClick={() => onOpenChange(true)} aria-label="Abrir LexIA" className="lex-aura-edge" style={{
        position: 'absolute', bottom: 24, right: 24, zIndex: 125,
        opacity: show ? 0 : 1, pointerEvents: show ? 'none' : 'auto',
        transform: `scale(${show ? 0.55 : 1})`,
        transition: 'opacity .26s ease, transform .42s cubic-bezier(.34,1.3,.5,1)',
        width: 58, height: 58, padding: 0, cursor: 'pointer',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
        background: glassBg, backdropFilter: 'blur(34px) saturate(1.7)', WebkitBackdropFilter: 'blur(34px) saturate(1.7)',
        border: '1px solid var(--lex-acrylic-border)',
        boxShadow: '0 12px 28px rgba(2,13,37,0.34), 0 2px 6px rgba(2,13,37,0.22), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
      onMouseEnter={(e) => { if (!show) e.currentTarget.style.transform = 'scale(1.08)'; }}
      onMouseLeave={(e) => { if (!show) e.currentTarget.style.transform = 'scale(1)'; }}>
        <span aria-hidden="true" className="lex-icon-glow" style={{ position: 'absolute', inset: '20%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,161,71,0.85), rgba(192,161,71,0) 70%)', filter: 'blur(5px)', pointerEvents: 'none' }}></span>
        <Icon name="sparkles" size={26} strokeWidth={2} style={{ position: 'relative', zIndex: 1 }} />
        {overdue.count > 0 && (
          <span title={`${overdue.count} honorários vencidos`} style={{ position: 'absolute', top: 1, right: 1, zIndex: 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--crit,#C0492F)', border: '2.5px solid var(--bg)' }}></span>
        )}
      </button>

      {/* -------- OPEN OVERLAY — popup central ⇄ painel lateral (morph) -------- */}
      {render && (
      <div style={{ position: 'absolute', inset: 0, zIndex: 280, pointerEvents: 'none' }}>
        {/* backdrop: some quando acoplado, devolvendo o documento ao usuário */}
        <div onMouseDown={() => onOpenChange(false)} style={{
          position: 'absolute', inset: 0, background: 'rgba(2,13,37,0.44)',
          opacity: showBackdrop ? 1 : 0, transition: 'opacity .32s ease',
          pointerEvents: showBackdrop ? 'auto' : 'none',
        }}></div>

        <div onMouseDown={(e) => e.stopPropagation()} style={{
          position: 'absolute', left: geo.left, top: geo.top, width: geo.width, height: geo.height,
          pointerEvents: 'auto',
          transformOrigin: morphOrigin,
          transform: show ? 'none' : enterTransform,
          opacity: show ? 1 : 0,
          transition: `left .52s ${morphEase}, top .52s ${morphEase}, width .52s ${morphEase}, height .52s ${morphEase}, border-radius .52s ease, transform .38s cubic-bezier(.34,1.26,.5,1), opacity .26s ease`,
        }}>
        {/* CAMADA DE VIDRO (painel): translucidez vem do alpha + backdrop-filter, NUNCA opacity.
            A borda clara simula a luz na quina. O conteúdo/cor atrás (brilho + documento) atravessa o blur. */}
        <div className="lex-aura-edge" style={{
          position: 'relative', width: '100%', height: '100%', ...edgeVars,
          display: 'flex', flexDirection: 'column',
          background: glassBg, backdropFilter: 'blur(34px) saturate(1.7)', WebkitBackdropFilter: 'blur(34px) saturate(1.7)',
          border: '1px solid var(--lex-acrylic-border)', borderRadius: geo.radius, overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24), inset 0 1px 0 rgba(255,255,255,0.16)',
        }}>
        {aurora}

        {dock ? (
          /* -------- MODO ACOPLADO AO DOCUMENTO: header compacto, input embaixo, sem X -------- */
          <>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
              <CrmLexiaMark size={30} radius={10} icon={15} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>{dockMode === 'form' ? 'Preencher manualmente' : 'LexIA'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fin-pos,#4FC07D)' }}></span>{dockMode === 'form' ? 'Campos do documento ao lado' : 'Editando ao lado do documento'}</div>
              </div>
            </div>

            {ctx.doc && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-soft) 55%, transparent)' }}>
                <Icon name="fileText" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctx.doc.nome}</span>
              </div>
            )}

            {dockMode === 'form' && ctx.doc
              ? <CrmDocForm doc={ctx.doc} store={store} onApply={(patch) => handlers.patchDoc(ctx.doc.id, patch)} />
              : <>{chatScroll}{composer}</>}
          </>
        ) : (
          /* -------- ASSISTENTE (orbe → painel lateral): comando + conversa, input SEMPRE embaixo -------- */
          <>
            {/* header — ponto + LexIA + subtítulo inline · ações: Histórico, expandir, tela cheia, fechar */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 10px 11px 16px', borderBottom: '1px solid var(--border)' }}>
              {view === 'chat' ? (
                <button onClick={() => { setView('command'); setThread([]); }} title="Voltar" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8, flexShrink: 0, marginLeft: -4 }}>
                  <Icon name="chevronLeft" size={17} />
                </button>
              ) : (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, boxShadow: '0 0 7px var(--accent)' }}></span>
              )}
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', flexShrink: 0 }}>LexIA</span>
              <span style={{ fontSize: 13, color: 'var(--text-subtle)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{view === 'chat' ? 'conversa' : 'busca, ações e IA'}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <button onClick={() => { setView('command'); setThread([]); setQ(''); }} title="Conversas recentes" className="btn btn-ghost" style={{ height: 30, padding: '0 9px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)' }}>
                  <Icon name="history" size={15} /> Histórico
                </button>
                <button onClick={() => setWide((w) => !w)} title={wide ? 'Recolher painel' : 'Expandir painel'} className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8, color: wide ? 'var(--accent)' : 'var(--text-muted)' }}>
                  <Icon name="sidebar" size={15} />
                </button>
                <button onClick={() => { setThread([]); setView('command'); setQ(''); }} title="Nova conversa" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8, color: 'var(--text-muted)' }}>
                  <Icon name="externalLink" size={15} />
                </button>
                <button onClick={() => onOpenChange(false)} title="Fechar (esc)" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8, color: 'var(--text-muted)' }}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>

            {/* corpo: resultados/comando (rolagem) ou conversa */}
            {view === 'chat' ? chatScroll : (
              <div ref={listRef} className="lex-back" style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '6px 8px 10px' }}>
                {flat.length === 0 && (
                  <div style={{ padding: '34px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Nada encontrado para “{q.trim()}”</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>Pressione <kbd className="crm-kbd">↵</kbd> para perguntar à LexIA.</div>
                  </div>
                )}
                {groups.map((g) => (
                  <div key={g.key} style={{ marginBottom: 4 }}>
                    <CrmBarGroupLabel>{g.label}</CrmBarGroupLabel>
                    {g.items.map((it) => (
                      <CrmBarRow key={it.id} item={it} active={it._idx === sel}
                        onHover={() => setSel(it._idx)}
                        onRun={() => { if (it.ai || it.stay) it.run(); else runAndClose(() => it.run()); }} />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* barra de input — flat, embaixo, SEM o ícone da IA (conforme pedido) */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '15px 18px', borderTop: '1px solid var(--border)' }}>
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (view === 'chat' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askLexia(q); } }}
                placeholder={view === 'chat' ? 'Responder à LexIA…' : crmLexPlaceholder(ctx)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 15.5, color: 'var(--text)', letterSpacing: '-0.01em', minWidth: 0, caretColor: 'var(--accent)' }} />
            </div>
          </>
        )}
        </div>
      </div>
    </div>
      )}
    </>
  );
};

window.CrmLexiaBar = CrmLexiaBar;
