// Responsive app shell for the LexIA home dashboard.
// Persistent sidebar on desktop, off-canvas drawer on tablet/mobile.
// Exposes HomeShell (window).

const HOME_NAV = [
  { id: 'inicio',    icon: 'home',       label: 'Início' },
  { id: 'documentos',icon: 'fileText',   label: 'Documentos' },
  { id: 'financeiro',icon: 'wallet',     label: 'Financeiro' },
  { id: 'comercial', icon: 'megaphone',  label: 'Comercial' },
  { id: 'tarefas',   icon: 'listChecks', label: 'Tarefas', badge: '1' },
  { id: 'clientes',  icon: 'users',      label: 'Clientes' },
  { id: 'contratos', icon: 'receipt',    label: 'Contratos' },
  { id: 'casos',     icon: 'scale',      label: 'Casos & Processos' },
  { id: 'agenda',    icon: 'calendar',   label: 'Agenda' },
];

const HomeLogo = ({ collapsed }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px', minHeight: 36 }}>
    <div style={{
      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
      background: 'linear-gradient(150deg, var(--brand-gold-soft), var(--brand-gold-deep))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 8px rgba(192,161,71,0.28)',
    }}>
      <span style={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: 16, color: '#020D25', letterSpacing: '-0.02em' }}>L</span>
    </div>
    {!collapsed && (
      <span style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text)' }}>Lex</span>
        <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--accent)' }}>IA</span>
      </span>
    )}
  </div>
);

const HomeNavItem = ({ item, active, collapsed }) => (
  <button className={'hnav' + (active ? ' is-active' : '')} title={collapsed ? item.label : undefined}
    style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
    {active && !collapsed && <span className="hnav-rail" />}
    <Icon name={item.icon} size={18} strokeWidth={active ? 2 : 1.75} />
    {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
    {!collapsed && item.badge && <span className="hnav-badge">{item.badge}</span>}
  </button>
);

const HomeSidebar = ({ active, collapsed }) => (
  <div className="home-sidebar-inner">
    <div style={{ padding: '2px 4px 14px' }}>
      <HomeLogo collapsed={collapsed} />
    </div>

    {!collapsed && (
      <label className="home-search">
        <Icon name="search" size={15} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
        <input placeholder="Buscar..." />
        <span className="kbd" style={{ flexShrink: 0 }}>⌘K</span>
      </label>
    )}

    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: collapsed ? 8 : 4 }}>
      {HOME_NAV.map((it) => <HomeNavItem key={it.id} item={it} active={active === it.id} collapsed={collapsed} />)}
    </nav>

    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button className="hnav" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }} title={collapsed ? 'Configurações' : undefined}>
        <Icon name="settings" size={18} strokeWidth={1.75} />
        {!collapsed && <span>Configurações</span>}
      </button>
      <div className="home-userchip" style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '8px' : '8px 10px' }}>
        <span className="home-avatar">TP</span>
        {!collapsed && (
          <>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Thiago Portela</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-subtle)' }}>Administrador</span>
            </span>
            <Icon name="chevronDown" size={15} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          </>
        )}
      </div>
    </div>
  </div>
);

const HomeTabPill = ({ icon, label, active, closeable }) => (
  <span className={'home-tab' + (active ? ' is-active' : '')}>
    <Icon name={icon} size={15} strokeWidth={active ? 2 : 1.75} style={{ color: active ? 'var(--accent)' : 'currentColor' }} />
    <span>{label}</span>
    {closeable && <Icon name="x" size={13} style={{ color: 'var(--text-subtle)', marginLeft: 2 }} />}
  </span>
);

const HomeTopbar = ({ onBurger, onCollapse, theme, onToggleTheme }) => (
  <header className="home-topbar">
    <button className="home-iconbtn home-burger" onClick={onBurger} title="Menu"><Icon name="menu" size={19} /></button>
    <button className="home-iconbtn home-collapsebtn" onClick={onCollapse} title="Recolher menu"><Icon name="sidebar" size={18} /></button>
    <span className="home-navarrows">
      <button className="home-iconbtn" title="Voltar"><Icon name="chevronLeft" size={18} /></button>
      <button className="home-iconbtn" title="Avançar" style={{ color: 'var(--text-subtle)' }}><Icon name="chevronRight" size={18} /></button>
    </span>
    <span className="home-tabs">
      <HomeTabPill icon="scale" label="Casos & Processos" />
      <HomeTabPill icon="home" label="Início" active closeable />
    </span>
    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
      <button className="home-iconbtn" onClick={onToggleTheme} title="Alternar tema">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>
      <button className="home-iconbtn" title="Notificações" style={{ position: 'relative' }}>
        <Icon name="bell" size={18} />
        <span style={{ position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-gold)', border: '2px solid var(--bg)' }} />
      </button>
      <span className="home-avatar home-avatar-top">TP</span>
    </span>
  </header>
);

const HomeShell = ({ active, collapsed, drawerOpen, onBurger, onCollapse, onCloseDrawer, theme, onToggleTheme, children, composer }) => (
  <div className={'home-root' + (collapsed ? ' is-collapsed' : '') + (drawerOpen ? ' drawer-open' : '')}>
    <aside className="home-sidebar">
      <HomeSidebar active={active} collapsed={collapsed} />
    </aside>
    <div className="home-scrim" onClick={onCloseDrawer} />
    <div className="home-main">
      <HomeTopbar onBurger={onBurger} onCollapse={onCollapse} theme={theme} onToggleTheme={onToggleTheme} />
      <div className="home-scroll">
        {children}
      </div>
      {composer}
    </div>
  </div>
);

window.HomeShell = HomeShell;
