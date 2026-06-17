// LexIA · CRM — app root: workspace (tabs + split panes), mutations, overlays.

const CRM_LS_THEME = 'lexia-crm-theme';
const CRM_LS_STORE = 'lexia-crm-store-v1';
const CRM_LS_TABS = 'lexia-crm-workspace-v2';

// ---- quick-create modals ----
const CrmQuickCliente = ({ onClose }) => {
  const { toast } = useCrmToast();
  const [tipo, setTipo] = crmUseState('PF');
  const [classe, setClasse] = crmUseState('cliente');
  return (
    <FxModal title="Novo cliente" sub="Cadastro de pessoa física ou jurídica" onClose={onClose} width={520}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { toast('Cliente cadastrado'); onClose(); }}>Salvar</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><FxLabel>Tipo</FxLabel><FxSegmented options={[{ value: 'PF', label: 'Pessoa física' }, { value: 'PJ', label: 'Pessoa jurídica' }]} value={tipo} onChange={setTipo} /></div>
          <div><FxLabel>Classificação</FxLabel><FxSegmented options={[{ value: 'cliente', label: 'Cliente' }, { value: 'lead', label: 'Lead' }]} value={classe} onChange={setClasse} /></div>
        </div>
        <div><FxLabel>Nome {tipo === 'PJ' ? '/ Razão social' : ''}</FxLabel><FxInput placeholder={tipo === 'PJ' ? 'Empresa Ltda' : 'Nome completo'} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><FxLabel>{tipo === 'PJ' ? 'CNPJ' : 'CPF'}</FxLabel><FxInput placeholder={tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'} /></div>
          <div><FxLabel>Cidade/UF</FxLabel><FxInput placeholder="São Paulo/SP" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><FxLabel>E-mail</FxLabel><FxInput type="email" placeholder="email@dominio.com" /></div>
          <div><FxLabel>Telefone</FxLabel><FxInput placeholder="(11) 90000-0000" /></div>
        </div>
      </div>
    </FxModal>
  );
};

const CrmQuickTarefa = ({ store, clienteId, onClose }) => {
  const { toast } = useCrmToast();
  const cli = store.clientes.find((c) => c.id === clienteId);
  return (
    <FxModal title="Nova tarefa" sub={cli ? `Vinculada a ${cli.nome}` : 'Criar tarefa'} onClose={onClose} width={500}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { toast('Tarefa criada'); onClose(); }}>Criar</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><FxLabel>Título</FxLabel><FxInput placeholder="O que precisa ser feito?" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div><FxLabel>Prioridade</FxLabel><FxSelect options={['P1', 'P2', 'P3', 'P4']} value="P2" onChange={() => {}} /></div>
          <div><FxLabel>Prazo</FxLabel><FxInput type="date" defaultValue={CRM_TODAY} /></div>
          <div><FxLabel>Responsável</FxLabel><FxSelect options={CRM_USERS.filter((u) => u.ativo).map((u) => u.nome)} value="Thiago Moraes" onChange={() => {}} /></div>
        </div>
      </div>
    </FxModal>
  );
};

const CrmQuickLancamento = ({ store, onClose }) => {
  const { toast } = useCrmToast();
  const [dir, setDir] = crmUseState('in');
  return (
    <FxModal title="Novo lançamento" sub="Honorário a receber ou despesa" onClose={onClose} width={500}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { toast('Lançamento criado'); onClose(); }}>Salvar</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><FxLabel>Direção</FxLabel><FxSegmented options={[{ value: 'in', label: 'A receber' }, { value: 'out', label: 'A pagar' }]} value={dir} onChange={setDir} /></div>
        <div><FxLabel>Descrição</FxLabel><FxInput placeholder="Descrição do lançamento" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><FxLabel>Valor</FxLabel><FxInput placeholder="R$ 0,00" /></div>
          <div><FxLabel>Vencimento</FxLabel><FxInput type="date" defaultValue={CRM_TODAY} /></div>
        </div>
        <div><FxLabel>Cliente</FxLabel><FxSelect options={['—', ...store.clientes.map((c) => c.apelido || c.nome)]} value="—" onChange={() => {}} /></div>
      </div>
    </FxModal>
  );
};

const CrmAnonimizar = ({ store, clienteId, onClose }) => {
  const { toast } = useCrmToast();
  const [pick, setPick] = crmUseState(clienteId || '');
  const [txt, setTxt] = crmUseState('');
  const c = store.clientes.find((x) => x.id === pick);
  const ok = c && txt.trim().toUpperCase() === c.nome.toUpperCase();
  return (
    <FxModal title="Anonimizar cliente (LGPD)" sub="Apaga dados pessoais mantendo o histórico financeiro. Irreversível." onClose={onClose} width={500}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!ok} onClick={() => { toast('Cliente anonimizado', { icon: 'checkCircle' }); onClose(); }} style={ok ? { background: 'var(--fin-neg,#C0492F)', color: '#fff' } : {}}>Anonimizar</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!clienteId && <div><FxLabel>Cliente</FxLabel><FxSelect options={['', ...store.clientes.map((x) => x.nome)]} value={c ? c.nome : ''} onChange={(e) => setPick((store.clientes.find((x) => x.nome === e.target.value) || {}).id || '')} placeholder="Selecione…" /></div>}
        {c && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(192,73,47,0.08)', color: 'var(--fin-neg,#C0492F)', fontSize: 12.5 }}>
              <Icon name="alertTriangle" size={18} /><span>Nome, documentos e contatos de <strong>{c.nome}</strong> serão apagados.</span>
            </div>
            <div><FxLabel>Digite o nome do cliente para confirmar</FxLabel><FxInput value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={c.nome} /></div>
          </>
        )}
      </div>
    </FxModal>
  );
};

const CrmModuleStub = ({ icon, label, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 40 }}>
    <div style={{ textAlign: 'center', maxWidth: 380 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Icon name={icon} size={24} strokeWidth={1.6} /></div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.55 }}>{sub}</div>
    </div>
  </div>
);

const CrmInicio = ({ store, nav }) => {
  const venc = store.lancamentos.filter(crmIsVencido);
  const hoje = store.eventos.filter((e) => e.dia === CRM_TODAY);
  return (
    <FxFrame>
      <CrmPageHead title="Bom dia, Thiago" sub="Quarta-feira, 11 de junho · um panorama do escritório" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
        <FxKpi label="Clientes" value={store.clientes.length} icon="users" />
        <FxKpi label="Casos ativos" value={store.casos.filter((k) => k.status === 'ativo').length} icon="briefcase" accent="gold" />
        <FxKpi label="Honorários vencidos" value={fxMoney(venc.reduce((s, l) => s + l.valor, 0))} icon="alertTriangle" tone={venc.length ? 'neg' : null} />
        <FxKpi label="Compromissos hoje" value={hoje.length} icon="calendar" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[{ p: 'clientes', i: 'users', t: 'Clientes', s: 'Gerencie contatos e leads' }, { p: 'casos', i: 'briefcase', t: 'Casos', s: 'Rateio e financeiro por caso' }, { p: 'contratos', i: 'receipt', t: 'Contratos', s: 'Honorários e recebimentos' }, { p: 'agenda', i: 'calendar', t: 'Agenda', s: 'Audiências, prazos e reuniões' }].map((x) => (
          <CrmRow key={x.p} onClick={() => nav.navPage(x.p)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }} >
            <div className="card" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={x.i} size={18} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{x.t}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{x.s}</div></div>
              <Icon name="arrowRight" size={16} style={{ color: 'var(--text-subtle)' }} />
            </div>
          </CrmRow>
        ))}
      </div>
    </FxFrame>
  );
};

// ---- per-pane page router ----
const CrmPageView = ({ route, store, role, nav, mut, onTab, onNovoCliente, onAnonimizar }) => {
  switch (route.page) {
    case 'inicio': return <CrmInicio store={store} nav={nav} />;
    case 'clientes': return <CrmClientesPage store={store} role={role} onOpenCliente={nav.openCliente} onNovo={onNovoCliente} />;
    case 'cliente': return <CrmClienteDetail store={store} clienteId={route.clienteId} role={role} tab={route.clienteTab || 'financeiro'} onTab={onTab} mut={mut} nav={nav} onAnonimizar={onAnonimizar} />;
    case 'casos': return <CrmCasosPage store={store} role={role} onOpenCaso={nav.openCaso} />;
    case 'contratos': return <CrmContratosPage store={store} onOpenContrato={nav.openContrato} />;
    case 'agenda': return <CrmAgendaPage store={store} mut={mut} nav={nav} />;
    case 'tarefas': return <CrmModuleStub icon="listChecks" label="Tarefas" sub="O quadro de tarefas (kanban e lista) já existe no app LexIA · Tarefas. Esta rodada de redesign cobre Clientes, Casos, Contratos e Agenda." />;
    case 'documentos': return <CrmModuleStub icon="fileText" label="Documentos" sub="A geração e a biblioteca de documentos vivem no módulo de Documentos do LexIA." />;
    case 'financeiro': return <CrmModuleStub icon="wallet" label="Financeiro" sub="O painel financeiro interativo (visão geral, lançamentos, fluxo de caixa) está no app LexIA · Financeiro." />;
    case 'comercial': return <CrmModuleStub icon="megaphone" label="Comercial" sub="Funil de leads e captação no módulo Comercial do LexIA." />;
    default: return <CrmModuleStub icon="fileText" label={route.page} sub="Página." />;
  }
};

// ---- default workspace (first run): a Notion-style split, Financeiro + a cliente ----
function crmDefaultWorkspace(store) {
  // pick the client with the most launches → richest detail page for the demo split
  const counts = {};
  store.lancamentos.forEach((l) => { if (l.clienteId) counts[l.clienteId] = (counts[l.clienteId] || 0) + 1; });
  const topId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const cli = store.clientes.find((c) => c.id === topId) || store.clientes[0];
  return {
    panes: [
      crmMkPane([{ page: 'financeiro' }]),
      crmMkPane([{ page: 'cliente', clienteId: cli.id, clienteTab: 'financeiro' }]),
    ],
    active: 0,
    split: 0.5,
  };
}

function crmLoadWorkspace(store) {
  try {
    const raw = localStorage.getItem(CRM_LS_TABS);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.panes) && p.panes.length && p.panes.every((pane) => pane.tabs && pane.tabs.length)) {
        return { active: 0, split: 0.5, ...p, active: Math.min(p.active || 0, p.panes.length - 1) };
      }
    }
  } catch (e) { /* ignore */ }
  return crmDefaultWorkspace(store);
}

const CrmApp = () => {
  const [theme, setTheme] = crmUseState(() => localStorage.getItem(CRM_LS_THEME) || 'light');
  crmUseEffect(() => { localStorage.setItem(CRM_LS_THEME, theme); }, [theme]);
  const [role, setRole] = crmUseState('admin');
  const [store, setStore] = crmUseState(() => crmBuildStore());
  const [ws, setWs] = crmUseState(() => crmLoadWorkspace(store));
  crmUseEffect(() => { try { localStorage.setItem(CRM_LS_TABS, JSON.stringify(ws)); } catch (e) { /* ignore */ } }, [ws]);

  const [collapsed, setCollapsed] = crmUseState(false);
  const [spotlight, setSpotlight] = crmUseState(false);
  const [lexia, setLexia] = crmUseState(false);
  const [settings, setSettings] = crmUseState(false);
  const [casoId, setCasoId] = crmUseState(null);
  const [contratoId, setContratoId] = crmUseState(null);
  const [quick, setQuick] = crmUseState(null);       // 'cliente'|'tarefa'|'lancamento'
  const [tarefaCli, setTarefaCli] = crmUseState(null);
  const [anon, setAnon] = crmUseState(null);

  // ---- workspace controller (stable; functional updates keep it correct) ----
  const ctl = crmUseMemo(() => ({
    select: (pi, tid) => setWs((w) => crmWsSelect(w, pi, tid)),
    focus: (pi) => setWs((w) => crmWsFocus(w, pi)),
    navInPane: (pi, route, opts = {}) => setWs((w) => crmWsNav(w, pi, route, !!opts.newTab)),
    navCurrent: (route, opts = {}) => setWs((w) => crmWsNav(w, w.active, route, !!opts.newTab)),
    patchTab: (pi, tid, patch) => setWs((w) => crmWsPatch(w, pi, tid, patch)),
    duplicate: (pi, tid) => setWs((w) => crmWsDuplicate(w, pi, tid)),
    close: (pi, tid) => setWs((w) => crmWsClose(w, pi, tid)),
    closeOthers: (pi, tid) => setWs((w) => crmWsCloseOthers(w, pi, tid)),
    openBeside: (pi, tid) => setWs((w) => crmWsOpenBeside(w, pi, tid)),
    moveOther: (pi, tid) => setWs((w) => crmWsMoveOther(w, pi, tid)),
    setSplit: (r) => setWs((w) => crmWsSplit(w, r)),
  }), []);

  crmUseEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSpotlight((s) => !s); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // active route (for sidebar highlight + overlays + LexIA context)
  const activePane = ws.panes[ws.active] || ws.panes[0];
  const activeTab = activePane.tabs.find((t) => t.id === activePane.activeId) || activePane.tabs[0];
  const activeRoute = activeTab.route;

  // ---- mutations ----
  const mut = {
    toggleRecebido: (lancId) => setStore((s) => ({ ...s, lancamentos: s.lancamentos.map((l) => l.id === lancId ? { ...l, status: l.status === 'recebido' ? 'lançado' : 'recebido', pagoData: l.status === 'recebido' ? null : CRM_TODAY } : l) })),
    receberContrato: (cid) => setStore((s) => {
      const next = s.lancamentos.filter((l) => l.contratoId === cid && l.status === 'lançado').sort((a, b) => a.venc.localeCompare(b.venc))[0];
      if (!next) return s;
      return { ...s, lancamentos: s.lancamentos.map((l) => l.id === next.id ? { ...l, status: 'recebido', pagoData: CRM_TODAY } : l) };
    }),
    updateRateio: (kid, rateio) => setStore((s) => ({ ...s, casos: s.casos.map((k) => k.id === kid ? { ...k, rateio } : k) })),
    addEvento: (f) => setStore((s) => ({ ...s, eventos: [...s.eventos, { ...f, id: 'E' + Math.random().toString(36).slice(2, 7), status: 'confirmado' }] })),
    updateEvento: (f) => setStore((s) => ({ ...s, eventos: s.eventos.map((e) => e.id === f.id ? { ...e, ...f } : e) })),
    moveEvento: (id, dia, hIni, hFim) => setStore((s) => ({ ...s, eventos: s.eventos.map((e) => e.id === id ? { ...e, dia, hIni, hFim } : e) })),
    openTarefa: (cliId) => { setTarefaCli(cliId); setQuick('tarefa'); },
    action: (kind) => {
      if (kind === 'novo-cliente') setQuick('cliente');
      else if (kind === 'nova-tarefa') { setTarefaCli(null); setQuick('tarefa'); }
      else if (kind === 'novo-lancamento') setQuick('lancamento');
      else if (kind === 'novo-evento') { ctl.navCurrent({ page: 'agenda' }); }
    },
  };

  // nav bound to the currently-active pane — for global overlays (spotlight, LexIA, modals, sidebar)
  const navCurrent = {
    navPage: (page) => ctl.navCurrent({ page }),
    openCliente: (id) => ctl.navCurrent({ page: 'cliente', clienteId: id, clienteTab: 'financeiro' }),
    openClienteTab: (id, tab) => ctl.navCurrent({ page: 'cliente', clienteId: id, clienteTab: tab }),
    openCaso: (id) => setCasoId(id),
    openContrato: (id) => setContratoId(id),
  };

  // page renderer for each pane (nav is bound to that pane)
  const renderPane = (pane, pi) => {
    const tab = pane.tabs.find((t) => t.id === pane.activeId) || pane.tabs[0];
    const route = tab.route;
    const paneNav = {
      navPage: (page) => ctl.navInPane(pi, { page }),
      openCliente: (id) => ctl.navInPane(pi, { page: 'cliente', clienteId: id, clienteTab: 'financeiro' }),
      openClienteTab: (id, t) => ctl.navInPane(pi, { page: 'cliente', clienteId: id, clienteTab: t }),
      openCaso: (id) => setCasoId(id),
      openContrato: (id) => setContratoId(id),
    };
    return (
      <CrmPageView route={route} store={store} role={role} nav={paneNav} mut={mut}
        onTab={(t) => ctl.patchTab(pi, tab.id, { clienteTab: t })}
        onNovoCliente={() => setQuick('cliente')}
        onAnonimizar={(id) => setAnon({ clienteId: id })} />
    );
  };

  const lexiaHandlers = { ...navCurrent, action: mut.action };
  const lexiaCtx = crmUseMemo(() => ({ page: activeRoute.page, cliente: activeRoute.page === 'cliente' ? store.clientes.find((x) => x.id === activeRoute.clienteId) : null }), [activeRoute, store]);

  return (
    <div className={`lex-artboard theme-${theme}`}>
      <CrmToastHost>
        <div className="app-screen">
          <CrmShell ws={ws} ctl={ctl} store={store} role={role} renderPane={renderPane}
            activePage={activeRoute.page} onSidebarNav={(page, newTab) => ctl.navCurrent({ page }, { newTab })}
            collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)}
            theme={theme} onToggleTheme={() => setTheme((t) => t === 'light' ? 'dark' : 'light')}
            onRoleChange={setRole} onOpenSpotlight={() => setSpotlight(true)} onOpenSettings={() => setSettings(true)} />

          {/* floating LexIA */}
          <CrmLexiaOrb open={lexia} onClick={() => setLexia((l) => !l)} />
          {lexia && <CrmLexia ctx={lexiaCtx} store={store} onClose={() => setLexia(false)} handlers={lexiaHandlers} />}

          {/* overlays */}
          {spotlight && <CrmSpotlight store={store} onClose={() => setSpotlight(false)} onOpenCliente={navCurrent.openCliente} onOpenCaso={navCurrent.openCaso} onOpenContrato={navCurrent.openContrato} onNavPage={navCurrent.navPage} onAction={mut.action} />}
          {settings && <CrmSettings role={role} theme={theme} onSetTheme={setTheme} onClose={() => setSettings(false)} onAnonimizar={() => setAnon({})} />}
          {casoId && <CrmCasoModal store={store} casoId={casoId} role={role} onClose={() => setCasoId(null)} mut={mut} nav={{ ...navCurrent, openCliente: (id) => { setCasoId(null); navCurrent.openCliente(id); } }} />}
          {contratoId && <CrmContratoModal store={store} contratoId={contratoId} role={role} onClose={() => setContratoId(null)} mut={mut} nav={{ openCliente: (id) => { setContratoId(null); navCurrent.openCliente(id); }, openCaso: (id) => { setContratoId(null); navCurrent.openCaso(id); } }} />}
          {quick === 'cliente' && <CrmQuickCliente onClose={() => setQuick(null)} />}
          {quick === 'tarefa' && <CrmQuickTarefa store={store} clienteId={tarefaCli} onClose={() => setQuick(null)} />}
          {quick === 'lancamento' && <CrmQuickLancamento store={store} onClose={() => setQuick(null)} />}
          {anon && <CrmAnonimizar store={store} clienteId={anon.clienteId} onClose={() => setAnon(null)} />}
        </div>
      </CrmToastHost>
    </div>
  );
};

window.CrmApp = CrmApp;
