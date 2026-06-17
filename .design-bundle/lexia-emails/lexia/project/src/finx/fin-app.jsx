// LexIA · Financeiro interativo — app root: state, theme, period nav, tabs, mutations.

// ---------- Barra contextual da IA ----------
// Renderizada como item flex (bottomBar do AppShell), nunca como overlay.
// O container de scroll encolhe para acomodá-la — sem sobreposição em nenhuma aba.
// Passa null para bottomBar quando um modal está aberto.
const FIN_AI_PLACEHOLDER = {
  lancamentos: 'Pergunte sobre o financeiro — quem deve, fluxo de caixa…',
  visao:       'Analise os indicadores ou projete a receita…',
  fluxo:       'Projete o fluxo ou identifique riscos de caixa…',
  contas:      'Pergunte sobre contas e balanço…',
  custos:      'Analise custos ou simule a DRE…',
  semfee:      'Liste casos sem honorário ou estime receita potencial…',
  importacao:  'Pergunte sobre a importação ou valide lançamentos…',
};

const FinAIBar = ({ tab }) => {
  const [q, setQ] = React.useState('');
  const placeholder = FIN_AI_PLACEHOLDER[tab] || 'Pergunte sobre o financeiro…';
  return (
    <div style={{
      flexShrink: 0,
      display: 'flex', justifyContent: 'center',
      padding: '10px 24px 14px',
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', maxWidth: 640, height: 50,
        padding: '0 14px 0 10px', borderRadius: 14,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 4px 20px rgba(2,13,37,0.28)',
        transition: 'box-shadow .15s',
      }}>
        {/* ícone dourado */}
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="sparkles" size={15} strokeWidth={1.9} />
        </div>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-sans)',
            letterSpacing: '-0.01em',
          }}
        />
        {/* indicador online */}
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#2E9E5B', flexShrink: 0,
        }} />
        {/* atalho */}
        <span style={{
          fontSize: 11.5, color: 'var(--text-subtle)',
          background: 'var(--bg-sunken)', padding: '2px 7px',
          borderRadius: 6, fontFamily: 'var(--font-mono)',
          flexShrink: 0, letterSpacing: '0.01em',
        }}>⌘K</span>
      </div>
    </div>
  );
};

function fxScope(ref, period) {
  const { y, m } = ref;
  if (period === 'ano') return { title: `${y}`, sub: 'Ano completo', test: (it) => fxYear(it.venc) === y };
  if (period === 'trimestre') {
    const q = Math.floor(m / 3), a = q * 3;
    return { title: `${q + 1}º trimestre`, sub: `${FX_MON[a]}–${FX_MON[a + 2]} · ${y}`, test: (it) => fxYear(it.venc) === y && fxQuarter(it.venc) === q };
  }
  return { title: FX_MON_FULL[m], sub: `${y}`, test: (it) => fxYear(it.venc) === y && fxMonthIdx(it.venc) === m };
}

const FX_LS_THEME = 'lexia-fin-theme';
const FX_LS_ITEMS = 'lexia-fin-items-v5';   // v5: seed rebalanceado (projeção ascendente)

// abas presentes na navegação mas fora desta rodada de redesign
const FxTabStub = ({ icon, label }) => (
  <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center', maxWidth: 360 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: 'var(--bg-sunken)', color: 'var(--text-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
      }}><Icon name={icon} size={20} strokeWidth={1.6} /></div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>Esta aba ainda não entrou na rodada de redesign. O conteúdo atual do seu app permanece como referência.</div>
    </div>
  </div>
);

const FinApp = () => {
  const { useState, useEffect, useMemo } = React;

  const [theme, setTheme] = useState(() => localStorage.getItem(FX_LS_THEME) || 'light');
  useEffect(() => { localStorage.setItem(FX_LS_THEME, theme); }, [theme]);

  const [items, setItems] = useState(() => {
    try { const s = localStorage.getItem(FX_LS_ITEMS); if (s) return JSON.parse(s); } catch (e) {}
    return fxBuildSeed();
  });
  useEffect(() => { try { localStorage.setItem(FX_LS_ITEMS, JSON.stringify(items)); } catch (e) {} }, [items]);

  const [ref0, setRef] = useState({ y: 2026, m: 5 });   // junho/2026
  const [period, setPeriod] = useState('mes');
  const [tab, setTab] = useState('lancamentos');
  const [modal, setModal] = useState(null);   // null | {mode:'form', edit?} | {mode:'serie', serie}
  const openNew = () => setModal({ mode: 'form' });
  const openEdit = (it) => setModal({ mode: 'form', edit: it });
  const openSerie = (serie) => setModal({ mode: 'serie', serie });
  const [inject, setInject] = useState(null);
  const onDrill = (f) => { setPeriod('ano'); setTab('lancamentos'); setInject({ ...f, nonce: Date.now() }); };

  const scope = useMemo(() => fxScope(ref0, period), [ref0, period]);
  const scoped = useMemo(() => items.filter(scope.test).sort((a, b) => a.venc.localeCompare(b.venc)), [items, scope]);

  // ---- mutations ----
  const sortIns = (arr) => arr.slice().sort((a, b) => a.venc.localeCompare(b.venc));
  // upsert by id — handles both "create new" and "save edit"
  const onCreate = (news) => setItems((prev) => {
    const map = new Map(prev.map((x) => [x.id, x]));
    news.forEach((n) => map.set(n.id, n));
    return sortIns([...map.values()]);
  });
  const onUpdate = (it) => setItems((prev) => sortIns(prev.map((x) => x.id === it.id ? it : x)));
  const onDelete = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const onMarkPaid = (id) => setItems((prev) => prev.map((x) => x.id === id ? { ...x, pago: true, pagoData: FX_TODAY_ISO } : x));
  const onUnpay = (id) => setItems((prev) => prev.map((x) => x.id === id ? { ...x, pago: false, pagoData: null } : x));
  // bulk
  const onBulkPaid = (ids) => { const s = new Set(ids); setItems((prev) => prev.map((x) => s.has(x.id) ? { ...x, pago: true, pagoData: x.pagoData || FX_TODAY_ISO } : x)); };
  const onBulkUnpay = (ids) => { const s = new Set(ids); setItems((prev) => prev.map((x) => s.has(x.id) ? { ...x, pago: false, pagoData: null } : x)); };
  const onBulkDelete = (ids) => { const s = new Set(ids); setItems((prev) => prev.filter((x) => !s.has(x.id))); };

  const vencidos = useMemo(() => scoped.filter((i) => fxStatus(i) === 'vencido').length, [scoped]);

  const TABS = [
    { id: 'visao', label: 'Visão geral', icon: 'home' },
    { id: 'lancamentos', label: 'Lançamentos', icon: 'receipt', badge: vencidos || null },
    { id: 'fluxo', label: 'Fluxo de caixa', icon: 'trendingUp' },
    { id: 'contas', label: 'Contas & Balanço', icon: 'scale' },
    { id: 'custos', label: 'Custos & DRE', icon: 'pieChart' },
    { id: 'semfee', label: 'Casos sem honorário', icon: 'briefcase' },
    { id: 'importacao', label: 'Importação', icon: 'upload' },
  ];
  const STUBS = { contas: 'scale', custos: 'pieChart', semfee: 'briefcase', importacao: 'upload' };
  const isStub = !!STUBS[tab];

  const actions = (
    <FxThemeToggle theme={theme} onToggle={() => setTheme((t) => t === 'light' ? 'dark' : 'light')} />
  );

  const header = (
    <div style={{ flexShrink: 0 }}>
      <FxTabs tabs={TABS} active={tab} onChange={setTab} />
      {(tab === 'visao' || tab === 'lancamentos') && <FxPeriodBar ref0={ref0} setRef={setRef} period={period} setPeriod={setPeriod} scopeLabel={scope} />}
    </div>
  );

  return (
    <div className={`lex-artboard theme-${theme}`}>
      <div className="app-screen">
        <AppShell active="financeiro" breadcrumb={['Financeiro']} actions={actions} tabs={header} sidebarCollapsed={false} bottomBar={modal ? null : <FinAIBar tab={tab} />}>
          <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {tab === 'visao' && <FxVisao items={scoped} allItems={items} scopeLabel={scope} onMarkPaid={onMarkPaid} onNew={openNew} onDrill={onDrill} />}
            {tab === 'lancamentos' && <FxLancamentos items={scoped} injectFilter={inject} onNew={openNew} onMarkPaid={onMarkPaid} onUnpay={onUnpay} onDelete={onDelete} onEdit={openEdit} onOpenSerie={openSerie} onBulkPaid={onBulkPaid} onBulkUnpay={onBulkUnpay} onBulkDelete={onBulkDelete} />}
            {tab === 'fluxo' && <FxFluxo items={items} />}
            {isStub && <FxTabStub icon={STUBS[tab]} label={TABS.find((t) => t.id === tab).label} />}
          </div>
        </AppShell>
      </div>
      {modal && modal.mode === 'form' && <FxNovoModal onClose={() => setModal(null)} onCreate={onCreate} edit={modal.edit || null} initialDir={modal.edit ? modal.edit.dir : 'in'} />}
      {modal && modal.mode === 'serie' && <FxSerieModal serieItems={items.filter((i) => i.serie === modal.serie)} onClose={() => setModal(null)} onEditItem={openEdit} onMarkPaid={onMarkPaid} onUnpay={onUnpay} />}
    </div>
  );
};

window.FinApp = FinApp;
