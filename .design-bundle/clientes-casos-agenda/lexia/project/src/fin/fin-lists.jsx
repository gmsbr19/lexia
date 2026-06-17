// Clientes (A5) + Contratos/Honorários (A6) — LibraryTab-style lists.

// Small stat card (LibraryTab statCard)
const StatCard = ({ label, value, trend, trendDir }) => (
  <div className="card" style={{ padding: '14px 16px' }}>
    <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 5 }}>
      <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{value}</span>
      {trend && <span style={{ fontSize: 11, fontWeight: 500, color: trendDir === 'down' ? 'var(--fin-neg,#C0492F)' : 'var(--fin-pos,#2E9E5B)' }}>{trend}</span>}
    </div>
  </div>
);

const StatsGrid = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>{children}</div>
);

// ============ Clientes ============
const classeTone = (c) => c === 'Estratégico' ? 'estrategico' : c === 'Lead' ? 'lead' : 'ativo';

const ClienteRow = ({ c }) => (
  <tr style={{ borderTop: '1px solid var(--border)' }}>
    <Td>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <Avatar name={c.nome} gold={c.classe === 'Estratégico'} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.nome}</span>
      </div>
    </Td>
    <Td><StatusPill label={c.tipo} tone="neutro" dot={false} /></Td>
    <Td muted><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontFeatureSettings: '"tnum"' }}>{c.doc}</span></Td>
    <Td muted>{c.cidade}</Td>
    <Td><StatusPill label={c.classe} tone={classeTone(c.classe)} /></Td>
    <Td align="right" muted><span style={{ fontFeatureSettings: '"tnum"' }}>{c.casos}</span></Td>
    <Td align="right">
      <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={14} /></button>
    </Td>
  </tr>
);

const ClientesScreen = () => (
  <AppShell
    active="clientes"
    breadcrumb={['Clientes']}
    actions={<button className="btn btn-primary" style={{ height: 32, fontSize: 12 }}><Icon name="plus" size={13} />Novo cliente</button>}
  >
    <PageFrame>
      <PageHeader title="Clientes" sub="142 clientes · 8 leads em prospecção" />
      <StatsGrid>
        <StatCard label="Total" value="142" trend="+6" trendDir="up" />
        <StatCard label="Pessoa física" value="58" />
        <StatCard label="Pessoa jurídica" value="76" />
        <StatCard label="Leads" value="8" trend="+3" trendDir="up" />
      </StatsGrid>
      <FilterBar>
        <SearchInput placeholder="Buscar por nome, CPF/CNPJ, cidade..." width={320} />
        <Segmented options={['Todos', 'PF', 'PJ', 'Leads']} active={0} />
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}><Icon name="filter" size={13} />Filtros</button>
      </FilterBar>
      <TableShell
        head={<><Th>Cliente</Th><Th>Tipo</Th><Th>CPF / CNPJ</Th><Th>Cidade</Th><Th>Classificação</Th><Th align="right">Casos</Th><Th align="right" /></>}
        footer={<FooterBar showing={9} total={142} label="clientes" />}
      >
        {CLIENTES.map((c, i) => <ClienteRow key={i} c={c} />)}
      </TableShell>
    </PageFrame>
  </AppShell>
);

// ============ Contratos / Honorários ============
const DocChip = ({ bucket }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-sunken)', padding: '3px 9px', borderRadius: 6 }}>{bucket}</span>
);

const ContratoRow = ({ c }) => (
  <tr style={{ borderTop: '1px solid var(--border)' }}>
    <Td>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 36, borderRadius: 4, background: '#fff', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4, flexShrink: 0, position: 'relative' }}>
          <span style={{ fontSize: 7, fontWeight: 500, color: '#020D25', fontFamily: 'var(--font-mono)' }}>HN</span>
          <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#C0A147', borderRadius: '4px 4px 0 0' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.desc}</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>{c.caso}</div>
        </div>
      </div>
    </Td>
    <Td muted>{c.cliente}</Td>
    <Td subtle><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontFeatureSettings: '"tnum"' }}>{new Date(c.venc).toLocaleDateString('pt-BR')}</span></Td>
    <Td align="right"><MoneyValue value={c.valor} size={12.5} /></Td>
    <Td><StatusPill label={c.status} tone={c.status === 'Recebido' ? 'recebido' : 'lancado'} /></Td>
    <Td><DocChip bucket={c.bucket} /></Td>
    <Td align="right">
      <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={14} /></button>
    </Td>
  </tr>
);

const ContratosScreen = () => (
  <AppShell
    active="contratos"
    breadcrumb={['Contratos']}
    actions={<button className="btn btn-primary" style={{ height: 32, fontSize: 12 }}><Icon name="plus" size={13} />Novo honorário</button>}
  >
    <PageFrame>
      <PageHeader title="Contratos & honorários" sub="20 honorários ativos · ticket médio R$ 27,1 mil" />
      <StatsGrid>
        <StatCard label="Total contratado" value="R$ 542 mil" trend="+18%" trendDir="up" />
        <StatCard label="Recebido" value="R$ 205 mil" />
        <StatCard label="Lançado em aberto" value="R$ 337 mil" />
        <StatCard label="Ticket médio" value="R$ 27,1 mil" trend="+4%" trendDir="up" />
      </StatsGrid>
      <FilterBar>
        <SearchInput placeholder="Buscar por descrição, cliente, caso..." width={320} />
        <Segmented options={['Todos', 'Recorrente', 'Parcelado', 'Êxito', 'À vista']} active={0} />
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}><Icon name="download" size={13} />Exportar</button>
      </FilterBar>
      <TableShell
        head={<><Th>Descrição</Th><Th>Cliente</Th><Th>Vencimento</Th><Th align="right">Valor</Th><Th>Status</Th><Th>Tipo</Th><Th align="right" /></>}
        footer={<FooterBar showing={7} total={20} label="honorários" />}
      >
        {CONTRATOS.map((c, i) => <ContratoRow key={i} c={c} />)}
      </TableShell>
    </PageFrame>
  </AppShell>
);

Object.assign(window, { ClientesScreen, ContratosScreen, StatCard, StatsGrid });
