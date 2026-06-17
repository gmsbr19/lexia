// AppShell: sidebar + topbar wrapper used by every screen
const { useState } = React;

const Logo = ({ collapsed }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', minHeight: 36 }}>
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: 'var(--brand-gold)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'Georgia, serif', fontWeight: 500, fontSize: 14,
        color: '#020D25', letterSpacing: '-0.02em',
      }}>L</span>
    </div>
    {!collapsed && (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text)' }}>Lex</span>
        <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--accent)' }}>IA</span>
      </div>
    )}
  </div>
);

const NavItem = ({ icon, label, active, badge, collapsed }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: collapsed ? '8px' : '7px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    letterSpacing: '-0.01em',
    justifyContent: collapsed ? 'center' : 'flex-start',
    position: 'relative',
  }}>
    <Icon name={icon} size={17} strokeWidth={active ? 2 : 1.75} />
    {!collapsed && <span>{label}</span>}
    {!collapsed && badge && (
      <span style={{
        marginLeft: 'auto', fontSize: 11, fontWeight: 500,
        background: 'var(--bg-sunken)', color: 'var(--text-muted)',
        padding: '1px 7px', borderRadius: 999,
      }}>{badge}</span>
    )}
  </div>
);

const Sidebar = ({ active = 'documentos', collapsed = false }) => (
  <aside style={{
    width: collapsed ? 64 : 232,
    background: 'var(--bg-soft)',
    borderRight: '1px solid var(--border)',
    padding: '14px 12px 16px',
    display: 'flex', flexDirection: 'column', gap: 4,
    flexShrink: 0,
    transition: 'width 0.2s ease',
  }}>
    <div style={{ padding: '4px 4px 14px' }}>
      <Logo collapsed={collapsed} />
    </div>

    {!collapsed && (
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}>
          <Icon name="search" size={14} />
        </div>
        <input className="input" placeholder="Buscar..." style={{
          paddingLeft: 32, height: 32, fontSize: 12,
          background: 'var(--surface)',
        }} />
        <span style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: 11, color: 'var(--text-subtle)',
          background: 'var(--bg-sunken)', padding: '2px 5px', borderRadius: 4,
          fontFamily: 'var(--font-mono)',
        }}>⌘K</span>
      </div>
    )}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <NavItem icon="home" label="Início" active={active === 'inicio'} collapsed={collapsed} />
      <NavItem icon="listChecks" label="Tarefas" badge="9" active={active === 'tarefas'} collapsed={collapsed} />
      <NavItem icon="fileText" label="Documentos" badge="12" active={active === 'documentos'} collapsed={collapsed} />
      <NavItem icon="wallet" label="Financeiro" active={active === 'financeiro'} collapsed={collapsed} />
      <NavItem icon="megaphone" label="Comercial" active={active === 'comercial'} collapsed={collapsed} />
      <NavItem icon="briefcase" label="Casos" active={active === 'casos'} collapsed={collapsed} />
      <NavItem icon="users" label="Clientes" active={active === 'clientes'} collapsed={collapsed} />
      <NavItem icon="receipt" label="Contratos" active={active === 'contratos'} collapsed={collapsed} />
      <NavItem icon="calendar" label="Agenda" active={active === 'agenda'} collapsed={collapsed} />
    </div>

    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <NavItem icon="settings" label="Configurações" collapsed={collapsed} />
      {!collapsed && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 8,
          marginTop: 6, background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent-soft)',
            color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 500, flexShrink: 0,
          }}>RM</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>Rafael Moraes</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Sócio</div>
          </div>
          <Icon name="chevronRight" size={14} style={{ color: 'var(--text-subtle)' }} />
        </div>
      )}
    </div>
  </aside>
);

const Breadcrumb = ({ items }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '-0.01em' }}>
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <Icon name="chevronRight" size={12} style={{ color: 'var(--text-subtle)' }} />}
        <span style={{
          color: i === items.length - 1 ? 'var(--text)' : 'var(--text-muted)',
          fontWeight: i === items.length - 1 ? 500 : 400,
        }}>{item}</span>
      </React.Fragment>
    ))}
  </div>
);

// round icon button used in the topbar chrome
const TopIconBtn = ({ icon, rotate, title, dim }) => (
  <button title={title} style={{
    width: 30, height: 30, borderRadius: 8, border: 'none',
    background: 'transparent', color: dim ? 'var(--text-subtle)' : 'var(--text-muted)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    flexShrink: 0, transition: 'background .12s, color .12s',
  }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = dim ? 'var(--text-subtle)' : 'var(--text-muted)'; }}>
    <Icon name={icon} size={17} style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined} />
  </button>
);

// workspace tab pill (Tarefas / Financeiro …)
const WorkspaceTab = ({ icon, label, active, closeable }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: closeable ? '0 8px 0 12px' : '0 12px',
    borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    background: active ? 'var(--surface)' : 'transparent',
    border: active ? '1px solid var(--border-strong)' : '1px solid transparent',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    color: active ? 'var(--text)' : 'var(--text-muted)',
    fontSize: 14, fontWeight: active ? 600 : 500, letterSpacing: '-0.01em',
    transition: 'background .12s, color .12s',
  }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-hover)'; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
    <Icon name={icon} size={15} strokeWidth={active ? 2 : 1.75} style={{ color: active ? 'var(--accent)' : 'currentColor' }} />
    <span>{label}</span>
    {closeable && (
      <span style={{
        width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-subtle)', marginLeft: 2,
      }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sunken)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-subtle)'; }}>
        <Icon name="plus" size={14} style={{ transform: 'rotate(45deg)' }} />
      </span>
    )}
  </div>
);

const TopBar = ({ actions }) => (
  <header style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '9px 18px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
    minHeight: 54,
  }}>
    <TopIconBtn icon="sidebar" title="Recolher menu" />
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
      <TopIconBtn icon="arrowRight" rotate={180} title="Voltar" />
      <TopIconBtn icon="arrowRight" title="Avançar" dim />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
      <WorkspaceTab icon="listChecks" label="Tarefas" />
      <WorkspaceTab icon="wallet" label="Financeiro" active closeable />
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
      {actions}
      <div style={{
        position: 'relative', width: 34, height: 34, borderRadius: '50%',
        background: 'var(--accent-soft)', color: 'var(--brand-gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
      }}>
        RM
        <span style={{
          position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%',
          background: 'var(--brand-gold)', border: '2px solid var(--bg)',
        }} />
      </div>
    </div>
  </header>
);

// DocTabs — sub-navigation for the Documentos area
const DocTabs = ({ active }) => {
  const tabs = [
    { id: 'criar',     label: 'Criar' },
    { id: 'meus',      label: 'Meus documentos', count: 142 },
    { id: 'templates', label: 'Modelos',         count: 32 },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 0,
      padding: '0 28px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      minHeight: 42,
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '0 16px',
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            color: isActive ? 'var(--text)' : 'var(--text-muted)',
            letterSpacing: '-0.005em',
            cursor: 'pointer',
            position: 'relative',
            borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                background: isActive ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                color: isActive ? 'var(--accent)' : 'var(--text-subtle)',
                padding: '1px 6px', borderRadius: 999,
                fontFeatureSettings: '"tnum"',
              }}>{t.count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// bottomBar: rendered as a flex item BELOW the scroll container — never overlaps content.
// Pass null/undefined when a modal is open so the bar hides automatically.
const AppShell = ({ active, breadcrumb, actions, tabs, children, sidebarCollapsed = false, contentInsetRight = 0, contentInsetLeft = 0, bottomBar }) => (
  <>
    <Sidebar active={active} collapsed={sidebarCollapsed} />
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <TopBar actions={actions} />
      {tabs}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', paddingRight: contentInsetRight, paddingLeft: contentInsetLeft, transition: 'padding .25s var(--ease, ease)' }}>
        {children}
      </div>
      {/* bottomBar sits outside the scroll region — content above never hides behind it */}
      {bottomBar}
    </main>
  </>
);

Object.assign(window, { AppShell, Sidebar, TopBar, Breadcrumb, Logo, NavItem, DocTabs });
