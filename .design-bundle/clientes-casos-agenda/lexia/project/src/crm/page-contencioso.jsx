// LexIA · Contencioso — página única com abas internas (Painel / Processos / Prazos / Andamentos),
// no padrão do resto do app (mesma FxTabs do Financeiro). A Ficha abre como drill-down inline.

const PROC_SUBTABS = ['painel', 'processos', 'prazos', 'andamentos'];

const ProcContenciosoPage = ({ procStore, crmStore, role, nav, procMut, route, onRoute }) => {
  const sub = PROC_SUBTABS.includes(route.sub) ? route.sub : 'painel';
  const fichaId = route.fichaId || null;

  const setSub = (s) => onRoute({ sub: s, fichaId: null, procNum: null });
  const openFicha = (id) => { const p = procById(procStore, id); onRoute({ sub, fichaId: id, procNum: p ? p.numero.split('-')[0] : '' }); };

  // nav interno: rotas do contencioso viram troca de aba; processo vira drill-down; o resto delega
  const innerNav = {
    ...nav,
    navPage: (p) => { if (PROC_SUBTABS.includes(p)) setSub(p); else nav.navPage(p); },
    openProcesso: (id) => openFicha(id),
  };

  // ---- drill-down: ficha consolidada ----
  if (fichaId) {
    return <ProcFichaPage key={fichaId} procStore={procStore} crmStore={crmStore} processoId={fichaId} role={role} nav={innerNav} procMut={procMut} />;
  }

  const inboxCount = procStore.andamentos.filter((a) => a.triagem === 'pendente').length;
  const TABS = [
    { id: 'painel', label: 'Painel' },
    { id: 'processos', label: 'Processos' },
    { id: 'prazos', label: 'Prazos' },
    { id: 'andamentos', label: 'Andamentos', badge: inboxCount || null },
  ];

  const body = {
    painel: <ProcPainelPage procStore={procStore} crmStore={crmStore} role={role} nav={innerNav} procMut={procMut} />,
    processos: <ProcProcessosPage procStore={procStore} role={role} nav={innerNav} />,
    prazos: <ProcPrazosPage procStore={procStore} role={role} nav={innerNav} procMut={procMut} />,
    andamentos: <ProcAndamentosPage procStore={procStore} role={role} nav={innerNav} procMut={procMut} />,
  }[sub];

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 12, background: 'var(--bg)' }}>
        <FxTabs tabs={TABS} active={sub} onChange={setSub} />
      </div>
      {body}
    </div>
  );
};

window.ProcContenciosoPage = ProcContenciosoPage;
