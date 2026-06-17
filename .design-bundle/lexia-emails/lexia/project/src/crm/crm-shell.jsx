// LexIA · CRM — app shell: sidebar nav + tabbed workspace (see crm-tabs.jsx) + floating LexIA.

const CrmLogo = ({ collapsed }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', minHeight: 34 }}>
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: 'var(--brand-gold)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)', flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'Georgia, serif', fontWeight: 500, fontSize: 14, color: '#020D25', letterSpacing: '-0.02em' }}>L</span>
    </div>
    {!collapsed && (
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text)' }}>Lex</span>
        <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--accent)' }}>IA</span>
      </div>
    )}
  </div>
);

const CrmNavItem = ({ icon, label, active, badge, collapsed, onClick }) => (
  <button onClick={onClick} title={collapsed ? label : undefined} style={{
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
    padding: collapsed ? '9px' : '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em',
    fontFamily: 'var(--font-sans)', justifyContent: collapsed ? 'center' : 'flex-start',
    transition: 'background .12s, color .12s',
  }}
  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-hover)'; }}
  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
    <Icon name={icon} size={17} strokeWidth={1.6} />
    {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
    {!collapsed && badge != null && (
      <span style={{ fontSize: 11, fontWeight: 500, background: active ? 'var(--accent-soft)' : 'var(--bg-sunken)', color: active ? 'var(--accent)' : 'var(--text-muted)', padding: '1px 7px', borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>{badge}</span>
    )}
  </button>
);

const CRM_NAV_CONTENCIOSO = [
  { id: 'contencioso', icon: 'scale', label: 'Contencioso', badge: 6 },
];
const CRM_NAV = [
  { id: 'inicio', icon: 'home', label: 'Início' },
  { id: 'tarefas', icon: 'listChecks', label: 'Tarefas', badge: 9 },
  { id: 'documentos', icon: 'fileText', label: 'Documentos', badge: 9 },
  { id: 'financeiro', icon: 'wallet', label: 'Financeiro', socioPlus: true },
  { id: 'comercial', icon: 'megaphone', label: 'Comercial' },
  { id: 'casos', icon: 'briefcase', label: 'Casos' },
  { id: 'clientes', icon: 'users', label: 'Clientes' },
  { id: 'contratos', icon: 'receipt', label: 'Contratos' },
  { id: 'agenda', icon: 'calendar', label: 'Agenda' },
];
const CrmNavGroup = ({ label, collapsed }) => collapsed ? <div style={{ height: 1, background: 'var(--border)', margin: '8px 8px' }}></div> : (
  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 10px 5px' }}>{label}</div>
);

// onNav(pageId, newTab) — newTab is true when ⌘/Ctrl is held (open in a new tab, Notion-style).
const CrmSidebar = ({ activePage, onNav, collapsed, onOpenSpotlight, onOpenSettings, role }) => (
  <aside style={{
    width: collapsed ? 64 : 234, background: 'var(--bg-soft)', borderRight: '1px solid var(--border)',
    padding: '14px 12px 16px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, transition: 'width .2s ease',
  }}>
    <div style={{ padding: '4px 4px 14px' }}><CrmLogo collapsed={collapsed} /></div>

    {!collapsed ? (
      <button onClick={onOpenSpotlight} style={{
        position: 'relative', marginBottom: 10, width: '100%', height: 34, borderRadius: 8,
        border: '1px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 0 32px', color: 'var(--text-subtle)',
        fontSize: 12, fontFamily: 'var(--font-sans)', textAlign: 'left',
      }}>
        <span style={{ position: 'absolute', left: 10, color: 'var(--text-subtle)' }}><Icon name="search" size={14} /></span>
        Buscar…
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-subtle)', background: 'var(--bg-sunken)', padding: '2px 6px', borderRadius: 5, fontFamily: 'var(--font-mono)' }}>⌘K</span>
      </button>
    ) : (
      <button onClick={onOpenSpotlight} title="Buscar" style={{ marginBottom: 8, width: 40, height: 36, margin: '0 auto 8px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="search" size={15} /></button>
    )}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {CRM_NAV_CONTENCIOSO.map((n) => (
        <CrmNavItem key={n.id} icon={n.icon} label={n.label} badge={n.badge} active={activePage === n.id} collapsed={collapsed} onClick={(e) => onNav(n.id, e.metaKey || e.ctrlKey)} />
      ))}
      <CrmNavGroup label="Escritório" collapsed={collapsed} />
      {CRM_NAV.filter((n) => !(n.socioPlus && role === 'staff')).map((n) => (
        <CrmNavItem key={n.id} icon={n.icon} label={n.label} badge={n.badge} active={activePage === n.id} collapsed={collapsed} onClick={(e) => onNav(n.id, e.metaKey || e.ctrlKey)} />
      ))}
    </div>

    {!collapsed && (
      <div style={{ marginTop: 8, padding: '8px 10px', fontSize: 11, lineHeight: 1.5, color: 'var(--text-subtle)', background: 'var(--bg-sunken)', borderRadius: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Dica:</span> ⌘+clique abre em nova aba. Clique direito numa aba para abri-la ao lado.
      </div>
    )}

    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <CrmNavItem icon="settings" label="Configurações" collapsed={collapsed} onClick={onOpenSettings} />
    </div>
  </aside>
);

// role switcher — demo affordance so reviewers can test UAC
const CrmRoleSwitch = ({ role, onChange }) => {
  const [open, setOpen] = crmUseState(false);
  const roles = [
    { id: 'admin', label: 'Administrador', sub: 'Acesso total' },
    { id: 'socio', label: 'Sócio', sub: 'Financeiro + rateio' },
    { id: 'staff', label: 'Equipe', sub: 'Operação do dia a dia' },
  ];
  const cur = roles.find((r) => r.id === role) || roles[0];
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} title="Trocar papel (demonstração de permissões)" style={{
        display: 'flex', alignItems: 'center', gap: 7, height: 32, padding: '0 8px 0 11px', borderRadius: 8,
        border: '1px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer',
        fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 500,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}></span>
        {cur.label}
        <Icon name="chevronDown" size={13} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }}></div>
          <div className="card" style={{ position: 'absolute', top: 38, right: 0, zIndex: 41, width: 220, padding: 6, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px 4px' }}>Papel · demonstração</div>
            {roles.map((r) => (
              <button key={r.id} onClick={() => { onChange(r.id); setOpen(false); }} className="fx-menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1, padding: '8px 10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500, color: 'var(--text)' }}>
                  {r.id === role && <Icon name="check" size={13} style={{ color: 'var(--accent)' }} />}
                  <span style={{ marginLeft: r.id === role ? 0 : 20 }}>{r.label}</span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)', marginLeft: 20 }}>{r.sub}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// floating LexIA orb
const CrmLexiaOrb = ({ onClick, open }) => (
  <button onClick={onClick} aria-label="Abrir LexIA" style={{
    position: 'absolute', bottom: 26, right: 26, zIndex: 120, width: 58, height: 58, borderRadius: '50%',
    border: 'none', cursor: 'pointer', background: 'linear-gradient(140deg, #d8be7a 0%, #C0A147 48%, #9a7f2e 100%)',
    boxShadow: '0 10px 30px rgba(192,161,71,0.45), 0 2px 8px rgba(2,13,37,0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#020D25',
    transition: 'transform .25s cubic-bezier(.22,1,.36,1)', transform: open ? 'scale(0.9) rotate(90deg)' : 'scale(1)',
  }}
  onMouseEnter={(e) => { if (!open) e.currentTarget.style.transform = 'scale(1.07)'; }}
  onMouseLeave={(e) => { if (!open) e.currentTarget.style.transform = 'scale(1)'; }}>
    <span className="crm-orb-ring"></span>
    <Icon name={open ? 'x' : 'sparkles'} size={24} strokeWidth={2} />
  </button>
);

// global chrome that lives at the edges of the tab strips
const CrmIconBtn = ({ icon, title, onClick, dot }) => (
  <button onClick={onClick} title={title} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
    <Icon name={icon} size={16} />
    {dot && <span style={{ position: 'absolute', top: 7, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-gold)' }}></span>}
  </button>
);

const CrmShell = ({ ws, ctl, store, role, renderPane, activePage, onSidebarNav, collapsed, onToggleSidebar, theme, onToggleTheme, onRoleChange, onOpenSpotlight, onOpenSettings }) => {
  const leading = (
    <button onClick={onToggleSidebar} title="Recolher menu" style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <Icon name="sidebar" size={16} />
    </button>
  );
  const trailing = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 4 }}>
      <CrmRoleSwitch role={role} onChange={onRoleChange} />
      <CrmIconBtn icon={theme === 'dark' ? 'sun' : 'moon'} title="Alternar tema" onClick={onToggleTheme} />
      {typeof CrmNtfBell !== 'undefined' ? <CrmNtfBell /> : <CrmIconBtn icon="bell" title="Notificações" dot />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 4 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-soft)', color: '#C0A147', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{crmUser('thiago').iniciais}</div>
      </div>
    </div>
  );
  return (
    <>
      <CrmSidebar activePage={activePage} onNav={onSidebarNav} collapsed={collapsed} onOpenSpotlight={onOpenSpotlight} onOpenSettings={onOpenSettings} role={role} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <CrmWorkspace ws={ws} ctl={ctl} store={store} role={role} renderPane={renderPane} leading={leading} trailing={trailing} />
      </main>
    </>
  );
};

Object.assign(window, { CrmShell, CrmLexiaOrb, CrmLogo, CRM_NAV, CRM_NAV_CONTENCIOSO });
