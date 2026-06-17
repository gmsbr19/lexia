// Início — MVP dashboard (A3). Three faithful variations.
// active="inicio", breadcrumb ["Início"]. KPI strip + ProximoPassoQueue +
// quick-action cards. Variation differs in composition / emphasis.

const HOME_KPIS = [
  { label: 'Recebido no mês', value: 'R$ 221,9 mil', delta: '8,1%', deltaDir: 'up', sub: 'Março · 14 títulos', icon: 'banknote', accent: 'gold' },
  { label: 'A receber', value: 'R$ 336,7 mil', delta: '12%', deltaDir: 'up', sub: '34 títulos em aberto', icon: 'clock' },
  { label: 'Vencido', value: 'R$ 51,2 mil', delta: '4 clientes', deltaDir: 'down', sub: '+60 dias · atenção', icon: 'alertTriangle' },
  { label: 'Margem líquida', value: '30,2%', delta: '2,4 p.p.', deltaDir: 'up', sub: 'Resultado R$ 66,9 mil', icon: 'trendingUp' },
];

const QuickAction = ({ icon, title, sub, badge }) => (
  <div className="card" style={{
    padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer',
    transition: 'border-color .15s, box-shadow .15s',
  }}>
    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--bg-sunken)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={icon} size={17} strokeWidth={1.75} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 1 }}>{sub}</div>
    </div>
    {badge && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 999 }}>{badge}</span>}
    <Icon name="arrowRight" size={15} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
  </div>
);

const HomeGreeting = ({ children }) => (
  <div style={{ marginBottom: 22 }}>
    <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)' }}>Bom dia, Rafael</h1>
    <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{children}</p>
  </div>
);

const SubHead = ({ children, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 13 }}>
    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text)' }}>{children}</h2>
    {action && <a style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, cursor: 'pointer' }}>{action} →</a>}
  </div>
);

const homeShell = (children) => (
  <AppShell
    active="inicio"
    breadcrumb={['Início']}
    actions={<button className="btn btn-primary" style={{ height: 32, fontSize: 12.5 }}><Icon name="plus" size={13} />Novo documento</button>}
  >{children}</AppShell>
);

// ===== Variation A — Briefing-first =====
const InicioA = () => homeShell(
  <PageFrame>
    <HomeGreeting>Segunda, 9 de junho · aqui está o panorama do escritório.</HomeGreeting>
    <div style={{ marginBottom: 24 }}><BriefingCard /></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20, alignItems: 'start' }}>
      <ProximoPassoQueue max={5} />
      <div>
        <SubHead action="Ver tudo">Atalhos</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <QuickAction icon="wallet" title="Financeiro" sub="Receita, a receber, DRE" badge="Novo" />
          <QuickAction icon="fileText" title="Documentos" sub="3 rascunhos em aberto" badge="3" />
          <QuickAction icon="users" title="Clientes" sub="142 ativos · 8 leads" />
          <QuickAction icon="receipt" title="Contratos" sub="20 honorários ativos" />
        </div>
      </div>
    </div>
  </PageFrame>
);

// ===== Variation B — Cockpit (data-dense) =====
const InicioB = () => homeShell(
  <PageFrame>
    <HomeGreeting>Segunda, 9 de junho · o que precisa da sua atenção hoje.</HomeGreeting>
    <KpiStrip>
      {HOME_KPIS.map((k, i) => <KpiCard key={i} {...k} />)}
    </KpiStrip>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <ProximoPassoQueue max={5} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <CardTitle title="Receita · últimos 12 meses" sub="Recebido vs a receber + projeção" right={<a style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, cursor: 'pointer' }}>Abrir →</a>} />
          <RevenueAreaChart height={156} />
          <div style={{ marginTop: 12 }}>
            <ChartLegend items={[
              { label: 'Recebido', color: FIN.c.recebido },
              { label: 'A receber', color: FIN.c.receber },
              { label: 'Projeção', color: FIN.c.receber, dash: true },
            ]} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <QuickAction icon="wallet" title="Financeiro" sub="DRE & caixa" badge="Novo" />
          <QuickAction icon="receipt" title="Contratos" sub="20 ativos" />
        </div>
      </div>
    </div>
  </PageFrame>
);

// ===== Variation C — Action-led (queue front & center) =====
const InicioC = () => homeShell(
  <PageFrame>
    <HomeGreeting>Você tem <strong style={{ color: 'var(--text)' }}>5 ações prioritárias</strong> e R$ 51,2 mil vencidos.</HomeGreeting>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
      <div>
        <ProximoPassoQueue max={5} />
        <div style={{ marginTop: 20 }}>
          <SubHead action="Toda a área">Atalhos</SubHead>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickAction icon="wallet" title="Financeiro" sub="Receita & DRE" badge="Novo" />
            <QuickAction icon="fileText" title="Documentos" sub="3 rascunhos" badge="3" />
            <QuickAction icon="users" title="Clientes" sub="142 ativos" />
            <QuickAction icon="receipt" title="Contratos" sub="20 ativos" />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {HOME_KPIS.map((k, i) => (
          <div key={i} className="card" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: k.accent === 'gold' ? 'var(--accent-soft)' : 'var(--bg-sunken)', color: k.accent === 'gold' ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={k.icon} size={14} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{k.value}</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600, color: k.deltaDir === 'down' ? 'var(--fin-neg,#C0492F)' : 'var(--fin-pos,#2E9E5B)' }}>
              <Icon name={k.deltaDir === 'down' ? 'trendingDown' : 'trendingUp'} size={11} strokeWidth={2} />{k.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  </PageFrame>
);

Object.assign(window, { InicioA, InicioB, InicioC });
