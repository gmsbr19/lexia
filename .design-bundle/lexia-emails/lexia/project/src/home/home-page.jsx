// LexIA — Início / dashboard content. Improved hierarchy + grouped panels.
// Exposes HomeDashboard + HomeComposer (window).

/* ---- small primitives ----------------------------------------------------- */
const Stat = ({ label, value, tone }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 3, whiteSpace: 'nowrap' }}>{label}</div>
    <div className="tnum" style={{ fontSize: 21, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1, color: tone === 'crit' ? 'var(--crit)' : 'var(--text)' }}>{value}</div>
  </div>
);

const PanelHead = ({ icon, title, sub, link }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
    <span className="panel-ico"><Icon name={icon} size={17} strokeWidth={1.8} /></span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--text)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 1 }}>{sub}</div>}
    </div>
    {link && <a className="panel-link">{link}<Icon name="arrowUpRight" size={13} /></a>}
  </div>
);

const EmptyNote = ({ children }) => (
  <div style={{ fontSize: 13, color: 'var(--text-subtle)', padding: '6px 0 2px', lineHeight: 1.5 }}>{children}</div>
);

/* ---- briefing hero -------------------------------------------------------- */
const BRIEFING_ITEMS = [
  { tone: 'crit', text: <><strong>R$ 7.975,00</strong> vencidos há mais de 60 dias — acionar cobranças imediatas para <strong>Andresa Mandina</strong> (R$ 1.025,00) e <strong>Cintia Portal das Águas</strong> (R$ 475,00) antes que o risco se consolide.</> },
  { tone: 'crit', text: <>Total vencido de <strong>R$ 21.483,33</strong> com apenas <strong>R$ 500,00</strong> recebidos no mês — queda de <strong>98,6%</strong> na receita exige atenção urgente ao fluxo de caixa.</> },
  { tone: 'gold', text: <><strong>88 casos</strong> sem honorário registrado representam <strong>R$ 167.565,20</strong> em receita potencial não capturada — revisar e formalizar contratos pendentes.</> },
  { tone: 'neutral', text: <>Agenda e tarefas livres hoje — dia ideal para dedicar tempo à regularização dos honorários em aberto e à cobrança ativa.</> },
];
const BRIEF_DOT = { crit: 'var(--crit)', gold: 'var(--accent)', neutral: 'var(--text-subtle)' };

const BriefingHero = () => (
  <section className="briefing">
    <div className="briefing-glow" />
    <div style={{ position: 'relative' }}>
      <div className="briefing-eyebrow">
        <Icon name="sparkles" size={13} strokeWidth={2} />
        Briefing diário · LexIA
      </div>
      <p className="briefing-lead">
        A prioridade absoluta hoje é a <strong style={{ color: 'var(--text)' }}>inadimplência</strong>: há
        <strong style={{ color: 'var(--text)' }}> R$ 21.483,33</strong> em honorários vencidos, sendo
        <strong style={{ color: 'var(--text)' }}> R$ 7.975,00</strong> com mais de 60 dias em aberto, distribuídos entre
        <strong style={{ color: 'var(--text)' }}> 3 clientes</strong>. Em paralelo, <strong style={{ color: 'var(--text)' }}>88 casos</strong> sem
        honorário cadastrado representam um potencial não faturado de <strong style={{ color: 'var(--text)' }}>R$ 167.565,20</strong>.
      </p>

      <div className="briefing-list">
        {BRIEFING_ITEMS.map((it, i) => (
          <button key={i} className="briefing-item">
            <span className="briefing-bullet" style={{ background: BRIEF_DOT[it.tone] }} />
            <span style={{ flex: 1, minWidth: 0 }}>{it.text}</span>
            <Icon name="arrowUpRight" size={15} style={{ color: 'var(--text-subtle)', flexShrink: 0, marginTop: 2 }} />
          </button>
        ))}
      </div>

      <div className="briefing-foot">
        <button className="btn btn-primary" style={{ height: 38 }}>
          <Icon name="arrowRightCircle" size={15} strokeWidth={2} /> Ver plano de ação
        </button>
        <button className="btn btn-ghost" style={{ height: 38 }}>
          <Icon name="refreshCw" size={14} /> Regenerar
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Atualizado às 00:00</span>
      </div>
    </div>
  </section>
);

/* ---- KPI strip ------------------------------------------------------------ */
const HOME_KPIS = [
  { label: 'Recebido no mês', icon: 'banknote', value: 'R$ 500,00', sub: '−99% vs. mês anterior', subTone: 'crit', subIcon: 'trendingDown' },
  { label: 'A receber', icon: 'clock', value: 'R$ 187.283,30', sub: '34 títulos em aberto' },
  { label: 'Vencido', icon: 'alertTriangle', value: 'R$ 21.483,33', valTone: 'crit', sub: '13 clientes · +60 dias', subTone: 'crit' },
  { label: 'Prazos · 7 dias', icon: 'gavel', value: '0', sub: 'nenhum vencido' },
  { label: 'Tarefas atrasadas', icon: 'listChecks', value: '0', sub: '1 para hoje' },
];

const KpiCard = ({ k }) => (
  <div className="kpi-card">
    <div className="kpi-top">
      <span className="kpi-label">{k.label}</span>
      <Icon name={k.icon} size={15} strokeWidth={1.8} style={{ color: k.valTone === 'crit' ? 'var(--crit)' : 'var(--text-subtle)', flexShrink: 0 }} />
    </div>
    <div className="tnum kpi-value" style={{ color: k.valTone === 'crit' ? 'var(--crit)' : 'var(--text)' }}>{k.value}</div>
    <div className="kpi-sub" style={{ color: k.subTone === 'crit' ? 'var(--crit)' : 'var(--text-subtle)' }}>
      {k.subIcon && <Icon name={k.subIcon} size={12} strokeWidth={2} />}
      {k.sub}
    </div>
  </div>
);

/* ---- panels --------------------------------------------------------------- */
const FIN_ROWS = [
  { name: 'Andresa Mandina', value: 'R$ 5.125,00' },
  { name: 'Cintia Portal das Águas', value: 'R$ 3.325,00' },
  { name: 'Emilce Delgado', value: 'R$ 2.500,00' },
  { name: 'Renato Martins', value: 'R$ 2.000,00' },
  { name: 'DJL Participações LTDA', value: 'R$ 1.700,00' },
];

const PrazosPanel = () => (
  <div className="panel">
    <PanelHead icon="scale" title="Prazos & Processos" link="Ver processos" />
    <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <Stat label="Vencidos" value="0" />
      <Stat label="Hoje" value="0" />
      <Stat label="Próximos 7 dias" value="0" />
    </div>
    <div className="panel-divider" />
    <EmptyNote>Nenhum prazo em aberto nos próximos dias.</EmptyNote>
  </div>
);

const FinanceiroPanel = () => (
  <div className="panel">
    <PanelHead icon="wallet" title="Financeiro" link="Ver financeiro" />
    <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <Stat label="Recebido · mês" value="R$ 500" />
      <Stat label="A receber" value="R$ 187,3 mil" />
      <Stat label="Vencido" value="R$ 21,5 mil" tone="crit" />
    </div>
    <div className="panel-divider" />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {FIN_ROWS.map((r, i) => (
        <div key={i} className="fin-row">
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
          <span className="tnum" style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-muted)' }}>{r.value}</span>
        </div>
      ))}
    </div>
    <div className="panel-divider" />
    <EmptyNote>1 cliente em espera (cobrança pausada, “não cobrar” ou que voltaram a pagar).</EmptyNote>
  </div>
);

const AgendaPanel = () => (
  <div className="panel">
    <PanelHead icon="calendar" title="Agenda · próximos 7 dias" link="Ver agenda" />
    <EmptyNote>Sem compromissos nos próximos 7 dias.</EmptyNote>
  </div>
);

const TarefasPanel = () => (
  <div className="panel">
    <PanelHead icon="listChecks" title="Tarefas" link="Ver tarefas" />
    <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <Stat label="Atrasadas" value="0" />
      <Stat label="Para hoje" value="1" />
      <Stat label="Pendentes" value="1" />
    </div>
    <div className="panel-divider" />
    <div className="task-row">
      <span className="task-dot" />
      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text)' }}>Fazer contrato Silvana</span>
      <span className="tnum" style={{ fontSize: 12.5, color: 'var(--text-subtle)' }}>16/06</span>
    </div>
  </div>
);

const ComercialPanel = () => (
  <div className="panel">
    <PanelHead icon="megaphone" title="Comercial · mês" link="Ver comercial" />
    <div className="stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <Stat label="Leads" value="124" />
      <Stat label="Conversões" value="2" />
      <Stat label="Taxa" value="2%" />
      <Stat label="ROAS" value="—" />
    </div>
    <div className="panel-divider" />
    <div className="kv-row"><span>Investimento</span><span className="tnum">R$ 0,00</span></div>
    <div className="kv-row"><span>Valor contratado</span><span className="tnum" style={{ color: 'var(--text)', fontWeight: 500 }}>R$ 65.000,00</span></div>
  </div>
);

const EscritorioPanel = () => (
  <div className="panel">
    <PanelHead icon="building" title="Escritório" link="Ver clientes" />
    <div className="stat-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
      <Stat label="Casos ativos" value="135" />
      <Stat label="Clientes" value="255" />
    </div>
    <div className="panel-divider" />
    <button className="highlight-row">
      <span className="briefing-bullet" style={{ background: 'var(--accent)', marginTop: 5 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>88 casos sem honorário</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-subtle)', marginTop: 1 }}>Potencial estimado de R$ 167,6 mil</span>
      </span>
      <Icon name="arrowUpRight" size={15} style={{ color: 'var(--text-subtle)', flexShrink: 0, marginTop: 3 }} />
    </button>
  </div>
);

/* ---- dashboard ------------------------------------------------------------ */
const HomeDashboard = ({ greeting = 'Thiago' }) => (
  <div className="home-content">
    <div className="home-head">
      <div style={{ minWidth: 0 }}>
        <h1 className="home-greeting">Boa noite, {greeting}</h1>
        <p className="home-greeting-sub">Domingo, 14 de junho · aqui está o panorama do escritório.</p>
      </div>
      <button className="btn btn-secondary home-newdoc" style={{ height: 40 }}>
        <Icon name="plus" size={15} /> Novo documento
      </button>
    </div>

    <BriefingHero />

    <div className="kpi-grid">
      {HOME_KPIS.map((k, i) => <KpiCard key={i} k={k} />)}
    </div>

    <div className="panel-cols">
      <div className="panel-col">
        <PrazosPanel />
        <AgendaPanel />
        <ComercialPanel />
      </div>
      <div className="panel-col">
        <FinanceiroPanel />
        <TarefasPanel />
        <EscritorioPanel />
      </div>
    </div>
  </div>
);

const HomeComposer = () => (
  <div className="composer-dock">
    <div className="composer">
      <span className="composer-orb">
        <span className="composer-orb-grad" />
        <Icon name="sparkles" size={15} strokeWidth={2} style={{ position: 'relative', color: '#020D25' }} />
      </span>
      <input className="composer-input" placeholder="Pergunte, busque ou diga o que fazer…" />
      <span className="composer-dot" />
      <span className="kbd">⌘K</span>
    </div>
  </div>
);

Object.assign(window, { HomeDashboard, HomeComposer });
