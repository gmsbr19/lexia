// LexIA · Comercial / Marketing — app root: state, theme, period, tabs, mutations, modals.

const CM_LS_THEME = 'lexia-com-theme';
const CM_LS_STATE = 'lexia-com-state-v2';

const CmApp = () => {
  const { useState, useEffect, useMemo } = React;

  const [theme, setTheme] = useState(() => localStorage.getItem(CM_LS_THEME) || 'light');
  useEffect(() => { localStorage.setItem(CM_LS_THEME, theme); }, [theme]);

  const [store, setStore] = useState(() => {
    try { const s = localStorage.getItem(CM_LS_STATE); if (s) return JSON.parse(s); } catch (e) {}
    return cmBuildSeed();
  });
  useEffect(() => { try { localStorage.setItem(CM_LS_STATE, JSON.stringify(store)); } catch (e) {} }, [store]);

  const [ref0, setRef] = useState({ ...CM_REF0 });
  const [period, setPeriod] = useState('mes');
  const [tab, setTab] = useState('visao');
  const [modal, setModal] = useState(null);
  const [leadInject, setLeadInject] = useState(null);
  const [lastImport, setLastImport] = useState({ data: '2026-06-02', novos: 8, atualizados: 5 });

  const scope = useMemo(() => cmScope(ref0, period), [ref0, period]);

  // ---- mutations ----
  const upsertCampaign = (c) => setStore((s) => ({ ...s, campaigns: s.campaigns.some((x) => x.id === c.id) ? s.campaigns.map((x) => x.id === c.id ? c : x) : [...s.campaigns, c] }));
  const addGasto = (g) => setStore((s) => ({ ...s, gastos: [...s.gastos, g] }));
  const upsertLead = (l) => setStore((s) => ({ ...s, leads: s.leads.some((x) => x.id === l.id) ? s.leads.map((x) => x.id === l.id ? l : x) : [l, ...s.leads] }));
  const moveStage = (id, key) => setStore((s) => ({ ...s, leads: s.leads.map((l) => l.id === id ? { ...l, etapa: key, reach: Math.max(l.reach, CM_STAGE_MAP[key].i), motivoPerda: null, cliente: null, caso: null, valorContratado: null, dataConv: null } : l) }));
  const bulkMove = (ids, key) => { const set = new Set(ids); setStore((s) => ({ ...s, leads: s.leads.map((l) => set.has(l.id) ? { ...l, etapa: key, reach: Math.max(l.reach, CM_STAGE_MAP[key].i), motivoPerda: l.motivoPerda } : l) })); };
  const convertLead = (id, data) => setStore((s) => ({ ...s, leads: s.leads.map((l) => l.id === id ? { ...l, etapa: 'ganho', reach: 4, cliente: data.cliente, caso: data.caso, valorContratado: data.valorContratado, dataConv: data.dataConv, motivoPerda: null } : l) }));
  const loseLead = (id, motivo) => setStore((s) => ({ ...s, leads: s.leads.map((l) => l.id === id ? { ...l, etapa: 'perdido', motivoPerda: motivo, cliente: null, caso: null, valorContratado: null, dataConv: null } : l) }));
  const reopenLead = (id) => setStore((s) => ({ ...s, leads: s.leads.map((l) => l.id === id ? { ...l, etapa: CM_STAGES[Math.min(3, l.reach)].key, motivoPerda: null, cliente: null, caso: null, valorContratado: null, dataConv: null } : l) }));
  const importLeads = (newLeads, summary) => { setStore((s) => ({ ...s, leads: [...newLeads, ...s.leads] })); setLastImport(summary); };

  // ---- navigation ----
  const goLeadsStage = (etapa) => { setTab('leads'); setLeadInject({ etapa, nonce: Date.now() }); };
  const goLeadsCampaign = (camp) => { setTab('leads'); setLeadInject({ campId: camp.id, etapa: 'todas', nonce: Date.now() }); };
  const goCampanhas = () => setTab('campanhas');

  // ---- modal openers ----
  const openCampanha = (edit) => setModal({ type: 'campanha', edit: edit || null });
  const openGasto = (campanha) => setModal({ type: 'gasto', campanha: campanha || null });
  const openLead = (edit) => setModal({ type: 'lead', edit: edit || null });
  const openConverter = (lead) => setModal({ type: 'converter', lead });
  const openPerdido = (lead) => setModal({ type: 'perdido', lead });
  const openImportar = () => setModal({ type: 'importar' });

  const novosLeads = useMemo(() => store.leads.filter((l) => scope.test(l.dataEntrada) && l.etapa === 'novo').length, [store.leads, scope]);

  const TABS = [
    { id: 'visao', label: 'Visão geral', icon: 'home' },
    { id: 'funil', label: 'Funil', icon: 'funnel' },
    { id: 'campanhas', label: 'Campanhas', icon: 'megaphone' },
    { id: 'leads', label: 'Leads', icon: 'users', badge: novosLeads || null },
    { id: 'exportar', label: 'Exportar', icon: 'download' },
  ];

  const actions = (
    <>
      <CmThemeToggle theme={theme} onToggle={() => setTheme((t) => t === 'light' ? 'dark' : 'light')} />
      <button className="btn btn-secondary" onClick={() => openGasto()} style={{ height: 34, fontSize: 12 }}><Icon name="coins" size={14} />Registrar gasto</button>
      <button className="btn btn-secondary" onClick={() => openLead()} style={{ height: 34, fontSize: 12 }}><Icon name="userPlus" size={14} />Lead</button>
      <button className="btn btn-primary" onClick={() => openCampanha()} style={{ height: 34, fontSize: 12 }}><Icon name="plus" size={14} />Nova campanha</button>
    </>
  );

  const header = (
    <div style={{ flexShrink: 0 }}>
      <CmTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab !== 'leads' && <CmPeriodBar ref0={ref0} setRef={setRef} period={period} setPeriod={setPeriod} scopeLabel={scope} />}
      {tab === 'leads' && (
        <div style={{ padding: '12px 40px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="users" size={14} style={{ color: 'var(--text-subtle)' }} />
          Carteira completa de leads · filtre por origem, etapa ou campanha · o período não restringe esta lista
        </div>
      )}
    </div>
  );

  return (
    <div className={`lex-artboard theme-${theme}`}>
      <div className="app-screen">
        <AppShell active="comercial" breadcrumb={['Comercial']} actions={actions} tabs={header} sidebarCollapsed={false}>
          <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {tab === 'visao' && <CmVisao state={store} ref0={ref0} period={period} scopeLabel={scope} onNew={() => openCampanha()} onLead={() => openLead()} onGoCampanhas={goCampanhas} onGoLeads={goLeadsStage} />}
            {tab === 'funil' && <CmFunil state={store} ref0={ref0} period={period} scopeLabel={scope} onStage={goLeadsStage} onLead={() => openLead()} />}
            {tab === 'campanhas' && <CmCampanhas state={store} ref0={ref0} period={period} scopeLabel={scope} onNew={() => openCampanha()} onGasto={openGasto} onEdit={openCampanha} onLeads={goLeadsCampaign} />}
            {tab === 'leads' && <CmLeads state={store} injectFilter={leadInject} lastImport={lastImport} onNew={() => openLead()} onMove={moveStage} onConvert={openConverter} onLose={openPerdido} onEdit={openLead} onReopen={reopenLead} onBulkMove={bulkMove} onImport={openImportar} />}
            {tab === 'exportar' && <CmExportar state={store} ref0={ref0} period={period} scopeLabel={scope} />}
          </div>
        </AppShell>
      </div>

      {modal && modal.type === 'campanha' && <CmCampanhaModal onClose={() => setModal(null)} onSave={upsertCampaign} edit={modal.edit} />}
      {modal && modal.type === 'gasto' && <CmGastoModal onClose={() => setModal(null)} onSave={addGasto} campaigns={store.campaigns} campanha={modal.campanha} />}
      {modal && modal.type === 'lead' && <CmLeadModal onClose={() => setModal(null)} onSave={upsertLead} campaigns={store.campaigns} edit={modal.edit} />}
      {modal && modal.type === 'converter' && <CmConverterModal lead={modal.lead} onClose={() => setModal(null)} onConvert={convertLead} />}
      {modal && modal.type === 'perdido' && <CmPerdidoModal lead={modal.lead} onClose={() => setModal(null)} onLose={loseLead} />}
      {modal && modal.type === 'importar' && <CmImportarModal onClose={() => setModal(null)} onImport={importLeads} campaigns={store.campaigns} />}
    </div>
  );
};

window.CmApp = CmApp;
