// LexIA · CRM — tabbed workspace: open tabs in the topbar + Notion-style split panes.
// A "workspace" (ws) = { panes:[{id,tabs:[{id,route}],activeId}], active:<paneIdx>, split:<ratio> }.
// Max 2 panes. Each pane has its own tab strip; the strip lives where the breadcrumb used to.

// ---------- pure ws operations (no mutation of input) ----------
const crmUidT = () => 'T' + Math.random().toString(36).slice(2, 8);
const crmUidP = () => 'P' + Math.random().toString(36).slice(2, 8);
const crmMkTab = (route) => ({ id: crmUidT(), route: { ...route } });
const crmMkPane = (routes) => { const tabs = routes.map(crmMkTab); return { id: crmUidP(), tabs, activeId: tabs[0].id }; };
const crmWsClone = (ws) => ({
  ...ws,
  panes: ws.panes.map((p) => ({ ...p, tabs: p.tabs.map((t) => ({ ...t, route: { ...t.route } })) })),
});

function crmWsSelect(ws, pi, tid) { const n = crmWsClone(ws); n.active = pi; if (n.panes[pi]) n.panes[pi].activeId = tid; return n; }
function crmWsFocus(ws, pi) { if (ws.active === pi || !ws.panes[pi]) return ws; const n = crmWsClone(ws); n.active = pi; return n; }

function crmWsNav(ws, pi, route, newTab) {
  const n = crmWsClone(ws); const pane = n.panes[pi]; if (!pane) return ws;
  n.active = pi;
  if (newTab) { const t = crmMkTab(route); pane.tabs.push(t); pane.activeId = t.id; }
  else { const t = pane.tabs.find((x) => x.id === pane.activeId) || pane.tabs[0]; if (t) t.route = { ...route }; }
  return n;
}
function crmWsPatch(ws, pi, tid, patch) { const n = crmWsClone(ws); const pane = n.panes[pi]; if (!pane) return ws; const t = pane.tabs.find((x) => x.id === tid); if (t) t.route = { ...t.route, ...patch }; return n; }
function crmWsDuplicate(ws, pi, tid) { const n = crmWsClone(ws); const pane = n.panes[pi]; if (!pane) return ws; const idx = pane.tabs.findIndex((x) => x.id === tid); if (idx < 0) return ws; const copy = crmMkTab({ ...pane.tabs[idx].route }); pane.tabs.splice(idx + 1, 0, copy); pane.activeId = copy.id; n.active = pi; return n; }

function crmWsClose(ws, pi, tid) {
  const n = crmWsClone(ws); const pane = n.panes[pi]; if (!pane) return ws;
  const idx = pane.tabs.findIndex((x) => x.id === tid); if (idx < 0) return ws;
  pane.tabs.splice(idx, 1);
  if (pane.tabs.length === 0) {
    if (n.panes.length > 1) { n.panes.splice(pi, 1); n.active = 0; n.split = 0.5; }
    else { const t = crmMkTab({ page: 'inicio' }); pane.tabs.push(t); pane.activeId = t.id; }
  } else if (pane.activeId === tid) {
    pane.activeId = pane.tabs[Math.min(idx, pane.tabs.length - 1)].id;
  }
  if (n.active > n.panes.length - 1) n.active = n.panes.length - 1;
  return n;
}
function crmWsCloseOthers(ws, pi, tid) { const n = crmWsClone(ws); const pane = n.panes[pi]; if (!pane) return ws; const keep = pane.tabs.find((x) => x.id === tid); if (!keep) return ws; pane.tabs = [keep]; pane.activeId = keep.id; return n; }

function crmWsOpenBeside(ws, pi, tid) {
  if (ws.panes.length >= 2) return ws;
  const n = crmWsClone(ws); const pane = n.panes[pi]; const idx = pane.tabs.findIndex((x) => x.id === tid); if (idx < 0) return ws;
  let movedRoute;
  if (pane.tabs.length > 1) { movedRoute = { ...pane.tabs[idx].route }; pane.tabs.splice(idx, 1); if (pane.activeId === tid) pane.activeId = pane.tabs[Math.min(idx, pane.tabs.length - 1)].id; }
  else { movedRoute = { ...pane.tabs[idx].route }; }
  const np = crmMkPane([movedRoute]);
  n.panes.splice(pi + 1, 0, np); n.active = pi + 1; n.split = 0.5;
  return n;
}
function crmWsMoveOther(ws, pi, tid) {
  if (ws.panes.length < 2) return ws;
  const n = crmWsClone(ws); const from = n.panes[pi]; const oi = pi === 0 ? 1 : 0; const to = n.panes[oi];
  const idx = from.tabs.findIndex((x) => x.id === tid); if (idx < 0) return ws;
  const [t] = from.tabs.splice(idx, 1);
  if (from.activeId === tid && from.tabs.length) from.activeId = from.tabs[Math.min(idx, from.tabs.length - 1)].id;
  to.tabs.push(t); to.activeId = t.id;
  if (from.tabs.length === 0) { n.panes.splice(pi, 1); n.active = 0; n.split = 0.5; }
  else { n.active = n.panes.indexOf(to); }
  return n;
}
function crmWsSplit(ws, ratio) { return { ...ws, split: Math.max(0.24, Math.min(0.76, ratio)) }; }

// ---------- tab identity → label + icon ----------
const CRM_PAGE_META = {
  inicio: { icon: 'home', label: 'Início' },
  tarefas: { icon: 'listChecks', label: 'Tarefas' },
  documentos: { icon: 'fileText', label: 'Documentos' },
  financeiro: { icon: 'wallet', label: 'Financeiro' },
  comercial: { icon: 'megaphone', label: 'Comercial' },
  casos: { icon: 'briefcase', label: 'Casos' },
  clientes: { icon: 'users', label: 'Clientes' },
  contratos: { icon: 'receipt', label: 'Contratos' },
  agenda: { icon: 'calendar', label: 'Agenda' },
};
function crmTabMeta(route, store) {
  if (route.page === 'cliente') {
    const c = store.clientes.find((x) => x.id === route.clienteId);
    return { icon: c && c.tipo === 'PJ' ? 'building' : 'user', label: c ? (c.apelido || c.nome) : 'Cliente' };
  }
  return CRM_PAGE_META[route.page] || { icon: 'fileText', label: route.page };
}

// centered split glyph (simple shapes only)
const CrmSplitGlyph = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

// ---------- floating menu (context menu + add menu) ----------
const CrmFloatMenu = ({ x, y, width = 212, onClose, children }) => (
  <>
    <div onMouseDown={(e) => { e.preventDefault(); onClose(); }} onContextMenu={(e) => { e.preventDefault(); onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 300 }}></div>
    <div className="card crm-pop-in" style={{ position: 'fixed', left: x, top: y, zIndex: 301, width, padding: 6, boxShadow: 'var(--shadow-lg)' }}>{children}</div>
  </>
);
const CrmMenuItem = ({ icon, iconEl, label, danger, disabled, onClick }) => (
  <button disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="fx-menu-item"
    style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer', color: danger ? 'var(--fin-neg,#C0492F)' : 'var(--text)' }}>
    <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center', color: danger ? 'var(--fin-neg,#C0492F)' : 'var(--text-muted)' }}>{iconEl || (icon && <Icon name={icon} size={15} />)}</span>
    <span style={{ flex: 1 }}>{label}</span>
  </button>
);

// ---------- single tab strip (one pane) ----------
const CrmTabStrip = ({ pane, paneIdx, isActivePane, paneCount, store, role, ctl, leading, trailing }) => {
  const [ctx, setCtx] = crmUseState(null);   // { x, y, tid }
  const [add, setAdd] = crmUseState(null);    // { x, y }

  const openCtx = (e, tid) => {
    e.preventDefault();
    const W = 212;
    setCtx({ tid, x: Math.min(e.clientX, window.innerWidth - W - 8), y: Math.min(e.clientY, window.innerHeight - 240) });
  };
  const openAdd = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const W = 220;
    setAdd({ x: Math.min(r.left, window.innerWidth - W - 8), y: r.bottom + 6 });
  };
  const ctxTab = ctx && pane.tabs.find((t) => t.id === ctx.tid);
  const canClose = !(paneCount === 1 && pane.tabs.length === 1);
  const pages = CRM_NAV.filter((n) => !(n.socioPlus && role === 'staff'));

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', minHeight: 51, background: 'var(--bg)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      {paneCount > 1 && isActivePane && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--accent)' }}></div>}
      {leading}
      <div className="crm-tabscroll" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', overflowY: 'hidden' }}>
        {pane.tabs.map((t) => {
          const meta = crmTabMeta(t.route, store);
          const active = t.id === pane.activeId;
          const focused = active && isActivePane;
          return (
            <div key={t.id} className={'crm-tab' + (active ? ' active' : '')} title={meta.label}
              onMouseDown={(e) => { if (e.button === 0) ctl.select(paneIdx, t.id); }}
              onContextMenu={(e) => openCtx(e, t.id)}
              onAuxClick={(e) => { if (e.button === 1 && canClose) { e.preventDefault(); ctl.close(paneIdx, t.id); } }}>
              <Icon name={meta.icon} size={14} strokeWidth={focused ? 2 : 1.75} style={{ flexShrink: 0, color: focused ? 'var(--accent)' : 'inherit' }} />
              <span className="crm-tab-label">{meta.label}</span>
              <span className="crm-tab-x" role="button" aria-label="Fechar aba"
                onMouseDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); if (canClose) ctl.close(paneIdx, t.id); }}>
                <Icon name="x" size={12} />
              </span>
            </div>
          );
        })}
        <button className="crm-addtab" title="Nova aba" onClick={openAdd}><Icon name="plus" size={15} /></button>
      </div>
      {trailing && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{trailing}</div>}

      {ctx && ctxTab && (
        <CrmFloatMenu x={ctx.x} y={ctx.y} onClose={() => setCtx(null)}>
          {paneCount === 1
            ? <CrmMenuItem iconEl={<CrmSplitGlyph />} label="Abrir ao lado" onClick={() => { ctl.openBeside(paneIdx, ctx.tid); setCtx(null); }} />
            : <CrmMenuItem icon="arrowRight" label="Mover para o outro lado" onClick={() => { ctl.moveOther(paneIdx, ctx.tid); setCtx(null); }} />}
          <CrmMenuItem icon="copy" label="Duplicar aba" onClick={() => { ctl.duplicate(paneIdx, ctx.tid); setCtx(null); }} />
          <div style={{ height: 1, background: 'var(--border)', margin: '5px 6px' }}></div>
          <CrmMenuItem icon="x" label="Fechar aba" disabled={!canClose} onClick={() => { ctl.close(paneIdx, ctx.tid); setCtx(null); }} />
          <CrmMenuItem icon="layoutGrid" label="Fechar as outras" disabled={pane.tabs.length <= 1} onClick={() => { ctl.closeOthers(paneIdx, ctx.tid); setCtx(null); }} />
        </CrmFloatMenu>
      )}
      {add && (
        <CrmFloatMenu x={add.x} y={add.y} width={220} onClose={() => setAdd(null)}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px 4px' }}>Abrir nova aba</div>
          {pages.map((n) => (
            <CrmMenuItem key={n.id} icon={n.icon} label={n.label} onClick={() => { ctl.navInPane(paneIdx, { page: n.id }, { newTab: true }); setAdd(null); }} />
          ))}
        </CrmFloatMenu>
      )}
    </div>
  );
};

// ---------- two-pane workspace with draggable divider ----------
const CrmWorkspace = ({ ws, ctl, store, role, renderPane, leading, trailing }) => {
  const bodyRef = crmUseRef(null);
  const startDrag = (e) => {
    e.preventDefault();
    const move = (ev) => {
      const el = bodyRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      ctl.setSplit((ev.clientX - r.left) / r.width);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = ''; document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const panes = ws.panes;
  return (
    <div ref={bodyRef} style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0, background: 'var(--bg)' }}>
      {panes.map((pane, pi) => (
        <React.Fragment key={pane.id}>
          {pi > 0 && (
            <div className="crm-split-grab" onPointerDown={startDrag} title="Arraste para ajustar">
              <div className="crm-split-line"></div>
            </div>
          )}
          <section onMouseDownCapture={() => ctl.focus(pi)}
            style={{ flex: panes.length === 1 ? '1 1 0%' : (pi === 0 ? `0 0 calc(${ws.split * 100}% - 5px)` : '1 1 0%'), display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
            <CrmTabStrip pane={pane} paneIdx={pi} isActivePane={ws.active === pi} paneCount={panes.length}
              store={store} role={role} ctl={ctl}
              leading={pi === 0 ? leading : null} trailing={pi === panes.length - 1 ? trailing : null} />
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0, background: 'var(--bg)' }}>{renderPane(pane, pi)}</div>
          </section>
        </React.Fragment>
      ))}
    </div>
  );
};

Object.assign(window, {
  CrmWorkspace, CrmTabStrip, crmTabMeta, CRM_PAGE_META,
  crmMkTab, crmMkPane,
  crmWsSelect, crmWsFocus, crmWsNav, crmWsPatch, crmWsDuplicate,
  crmWsClose, crmWsCloseOthers, crmWsOpenBeside, crmWsMoveOther, crmWsSplit,
});
